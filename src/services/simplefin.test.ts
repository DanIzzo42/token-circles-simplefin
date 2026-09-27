import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseAccountSet, SimpleFinAccountSet, SimpleFinService } from './simplefin';

const FETCHED_AT = new Date('2026-09-20T12:00:00Z');
const ACCESS_URL = 'https://demo-user:s3cr%40t@bridge.example.com/simplefin';
const CLAIM_URL = 'https://bridge.example.com/simplefin/claim/abc123';
const SETUP_TOKEN = btoa(CLAIM_URL);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseAccountSet', () => {
  it('parses a v1 response (org on each account, errors as strings)', () => {
    const data: SimpleFinAccountSet = {
      errors: ['Connection to Chase may need attention'],
      accounts: [
        {
          id: 'a1',
          name: 'Checking',
          balance: '1234.56',
          org: { name: 'Chase', domain: 'chase.com' },
          transactions: [{ id: 't1', posted: 1758000000, amount: '-42.10', description: 'STARBUCKS' }]
        }
      ]
    };

    const result = parseAccountSet(data, FETCHED_AT);

    expect(result.accounts).toEqual([{ id: 'a1', name: 'Checking', balance: 1234.56, institution: 'Chase' }]);
    expect(result.transactions[0]).toMatchObject({
      id: 't1',
      accountId: 'a1',
      amount: -42.1,
      type: 'expense',
      category: 'Uncategorized',
      pending: false
    });
    expect(result.transactions[0].date.getTime()).toBe(1758000000 * 1000);
    expect(result.warnings).toEqual(['Connection to Chase may need attention']);
    expect(result.fetchedAt).toBe(FETCHED_AT);
  });

  it('parses a v2 response (institution from connections, structured errlist)', () => {
    const data: SimpleFinAccountSet = {
      errlist: [
        { code: 'con.auth', msg: 'Login failed for My Bank.', conn_id: 'c1' },
        { code: 'gen.other', msg: 'Something else happened' }
      ],
      connections: [{ conn_id: 'c1', name: 'My Bank - Jeff', org_url: 'https://mybank.com' }],
      accounts: [{ id: 'a1', name: 'Savings', balance: '100.23', conn_id: 'c1', transactions: [] }]
    };

    const result = parseAccountSet(data, FETCHED_AT);

    expect(result.accounts[0].institution).toBe('My Bank - Jeff');
    expect(result.warnings[0]).toContain('Login failed for My Bank.');
    expect(result.warnings[0]).toContain('SimpleFIN Bridge');
    expect(result.warnings[1]).toBe('Something else happened');
  });

  it('falls back to "Unknown" when no institution info is present', () => {
    const result = parseAccountSet({ accounts: [{ id: 'a1', name: 'X', balance: '0' }] }, FETCHED_AT);
    expect(result.accounts[0].institution).toBe('Unknown');
    expect(result.transactions).toEqual([]);
  });

  it('flattens transactions across accounts, newest first, preferring transacted_at over posted', () => {
    const data: SimpleFinAccountSet = {
      accounts: [
        {
          id: 'a1',
          name: 'Checking',
          balance: '0',
          transactions: [
            { id: 'old', posted: 1000, amount: '-1', description: 'OLD' },
            { id: 'pending', posted: 0, transacted_at: 3000, amount: '-2', description: 'PENDING', pending: true }
          ]
        },
        {
          id: 'a2',
          name: 'Card',
          balance: '-50',
          transactions: [{ id: 'mid', posted: 2000, amount: '500.00', description: 'PAYMENT THANK YOU' }]
        }
      ]
    };

    const result = parseAccountSet(data, FETCHED_AT);

    expect(result.transactions.map((t) => t.id)).toEqual(['pending', 'mid', 'old']);
    expect(result.transactions[0].pending).toBe(true);
    expect(result.transactions[1]).toMatchObject({ accountId: 'a2', type: 'income', amount: 500 });
  });
});

describe('SimpleFinService.connect', () => {
  it('claims the decoded setup token and stores split Basic Auth credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(`${ACCESS_URL}\n`, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const service = new SimpleFinService();
    await service.connect(`  ${SETUP_TOKEN}  `);

    expect(fetchMock).toHaveBeenCalledWith(CLAIM_URL, { method: 'POST' });
    expect(service.isConnected()).toBe(true);
    const stored = JSON.parse(localStorage.getItem('simplefin_credentials')!);
    expect(stored.accessToken).toBe('demo-user:s3cr@t');
    expect(stored.baseUrl).toBe('https://bridge.example.com/simplefin');
  });

  it('rejects input that is not a base64-encoded URL without making a request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(new SimpleFinService().connect('not a token!')).rejects.toThrow(/setup token/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('explains a 403 as an already-used or invalid token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 403 })));
    await expect(new SimpleFinService().connect(SETUP_TOKEN)).rejects.toThrow(/already used/);
  });
});

describe('SimpleFinService.fetchAccounts', () => {
  async function connectedService() {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(ACCESS_URL, { status: 200 })));
    const service = new SimpleFinService();
    await service.connect(SETUP_TOKEN);
    return service;
  }

  it('requests v2 with pending and a 60-day window, authenticates, and caches the result', async () => {
    const service = await connectedService();
    const body: SimpleFinAccountSet = {
      accounts: [{ id: 'a1', name: 'Checking', balance: '10', transactions: [] }]
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(body));
    vi.stubGlobal('fetch', fetchMock);

    const result = await service.fetchAccounts(FETCHED_AT);

    const [url, init] = fetchMock.mock.calls[0];
    const expectedStart = Math.floor(FETCHED_AT.getTime() / 1000) - 60 * 24 * 60 * 60;
    expect(url).toBe(
      `https://bridge.example.com/simplefin/accounts?version=2&pending=1&start-date=${expectedStart}`
    );
    expect(init.headers.Authorization).toBe(`Basic ${btoa('demo-user:s3cr@t')}`);
    expect(result.accounts[0].balance).toBe(10);

    const cached = new SimpleFinService().getCached();
    expect(cached?.fetchedAt.getTime()).toBe(FETCHED_AT.getTime());
    expect(cached?.accounts[0].name).toBe('Checking');
  });

  it('disconnects and clears the cache when access is revoked', async () => {
    const service = await connectedService();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ accounts: [] })));
    await service.fetchAccounts(FETCHED_AT);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 403 })));
    await expect(service.fetchAccounts(FETCHED_AT)).rejects.toThrow(/revoked or expired/);

    expect(service.isConnected()).toBe(false);
    expect(service.getCached()).toBeNull();
  });

  it('keeps the connection on a transient server error', async () => {
    const service = await connectedService();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })));

    await expect(service.fetchAccounts(FETCHED_AT)).rejects.toThrow(/500/);
    expect(service.isConnected()).toBe(true);
  });

  it('throws if called before connecting', async () => {
    await expect(new SimpleFinService().fetchAccounts()).rejects.toThrow(/Not connected/);
  });
});
