import { Account, SimpleFinCredentials, Transaction } from '../types';

interface SimpleFinTransaction {
  id: string;
  posted?: number;
  transacted_at?: number;
  amount: string;
  description: string;
  pending?: boolean;
}

interface SimpleFinAccount {
  id: string;
  name: string;
  balance: string;
  conn_id?: string;
  org?: { name?: string; domain?: string };
  transactions?: SimpleFinTransaction[];
}

interface SimpleFinConnection {
  conn_id: string;
  name?: string;
  org_url?: string;
}

interface SimpleFinError {
  code?: string;
  msg?: string;
  conn_id?: string;
  account_id?: string;
}

// Covers both protocol v1 (org per account, errors: string[]) and
// v2 (connections[] + conn_id, errlist: {code, msg}[]).
export interface SimpleFinAccountSet {
  errors?: string[];
  errlist?: SimpleFinError[];
  connections?: SimpleFinConnection[];
  accounts: SimpleFinAccount[];
}

export interface SyncResult {
  accounts: Account[];
  transactions: Transaction[];
  warnings: string[];
  fetchedAt: Date;
}

const CREDENTIALS_KEY = 'simplefin_credentials';
const CACHE_KEY = 'simplefin_cache';
const HISTORY_DAYS = 60;

// The Bridge asks clients to stay at or under ~24 requests/day, so page
// loads reuse the cached result until it's this old; Refresh always fetches.
export const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

const REAUTH_CODES = new Set(['con.auth', 'gen.auth']);

export function parseAccountSet(data: SimpleFinAccountSet, fetchedAt: Date): SyncResult {
  const connections = new Map((data.connections ?? []).map((c) => [c.conn_id, c]));

  const accounts: Account[] = data.accounts.map((account) => {
    const connection = account.conn_id ? connections.get(account.conn_id) : undefined;
    return {
      id: account.id,
      name: account.name,
      balance: parseFloat(account.balance),
      institution:
        account.org?.name || account.org?.domain || connection?.name || connection?.org_url || 'Unknown'
    };
  });

  const transactions: Transaction[] = data.accounts
    .flatMap((account) =>
      (account.transactions ?? []).map((transaction) => {
        const amount = parseFloat(transaction.amount);
        const seconds = transaction.transacted_at ?? transaction.posted ?? 0;
        return {
          id: transaction.id,
          accountId: account.id,
          date: new Date(seconds * 1000),
          description: transaction.description,
          amount,
          // SimpleFin has no category field; categorization rules
          // (services/budgets.ts) assign the real category.
          category: 'Uncategorized',
          type: amount >= 0 ? ('income' as const) : ('expense' as const),
          pending: Boolean(transaction.pending)
        };
      })
    )
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const warnings = [
    ...(data.errors ?? []),
    ...(data.errlist ?? []).map((e) =>
      e.code && REAUTH_CODES.has(e.code)
        ? `${e.msg || 'A bank connection needs attention.'} Sign in to SimpleFIN Bridge to reconnect this bank.`
        : e.msg || e.code || 'Unknown SimpleFIN error'
    )
  ];

  return { accounts, transactions, warnings, fetchedAt };
}

export class SimpleFinService {
  private credentials: SimpleFinCredentials | null = this.loadCredentials();

  private loadCredentials(): SimpleFinCredentials | null {
    try {
      const raw = localStorage.getItem(CREDENTIALS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  isConnected(): boolean {
    return this.credentials !== null;
  }

  disconnect(): void {
    this.credentials = null;
    localStorage.removeItem(CREDENTIALS_KEY);
    // Cached balances/transactions shouldn't outlive the connection,
    // especially on a shared device.
    localStorage.removeItem(CACHE_KEY);
  }

  async connect(setupToken: string): Promise<void> {
    // Setup tokens are base64-encoded claim URLs.
    let claimUrl: string;
    try {
      claimUrl = atob(setupToken.trim());
      new URL(claimUrl);
    } catch {
      throw new Error("That doesn't look like a SimpleFIN setup token. Copy the whole token from SimpleFIN Bridge.");
    }

    const response = await fetch(claimUrl, { method: 'POST' });

    if (response.status === 403) {
      throw new Error('This setup token was already used or is invalid. Generate a new one in SimpleFIN Bridge.');
    }
    if (!response.ok) {
      throw new Error('Failed to connect to SimpleFIN');
    }

    // The claim endpoint returns the plain-text Access URL, which embeds
    // Basic Auth credentials, e.g. https://user:pass@bridge.simplefin.org/simplefin
    const parsed = new URL((await response.text()).trim());

    this.credentials = {
      setupToken,
      accessToken: `${decodeURIComponent(parsed.username)}:${decodeURIComponent(parsed.password)}`,
      baseUrl: `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(/\/$/, '')
    };
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(this.credentials));
  }

  getCached(): SyncResult | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { fetchedAt, data } = JSON.parse(raw);
      return parseAccountSet(data, new Date(fetchedAt));
    } catch {
      return null;
    }
  }

  async fetchAccounts(now = new Date()): Promise<SyncResult> {
    if (!this.credentials) {
      throw new Error('Not connected to SimpleFIN');
    }

    const startDate = Math.floor(now.getTime() / 1000) - HISTORY_DAYS * 24 * 60 * 60;
    const url = `${this.credentials.baseUrl}/accounts?version=2&pending=1&start-date=${startDate}`;

    const response = await fetch(url, {
      headers: { Authorization: `Basic ${btoa(this.credentials.accessToken)}` }
    });

    if (response.status === 401 || response.status === 403) {
      this.disconnect();
      throw new Error('Your SimpleFIN access was revoked or expired. Please reconnect with a new setup token.');
    }
    if (!response.ok) {
      throw new Error(`SimpleFIN returned an error (${response.status}). Try again later.`);
    }

    const data: SimpleFinAccountSet = await response.json();
    localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: now.toISOString(), data }));
    return parseAccountSet(data, now);
  }
}

export const simpleFinService = new SimpleFinService();
