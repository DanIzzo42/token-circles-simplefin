import { SimpleFinCredentials, FinancialData } from '../types';

interface SimpleFinTransaction {
  id: string;
  posted?: number;
  transacted_at?: number;
  amount: string;
  description: string;
}

interface SimpleFinAccount {
  id: string;
  name: string;
  type?: string;
  balance: string;
  org?: { name?: string; domain?: string };
  transactions?: SimpleFinTransaction[];
}

interface SimpleFinAccountSet {
  errors?: string[];
  accounts: SimpleFinAccount[];
}

const STORAGE_KEY = 'simplefin_credentials';

export class SimpleFinService {
  private credentials: SimpleFinCredentials | null = this.loadCredentials();

  private loadCredentials(): SimpleFinCredentials | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  disconnect(): void {
    this.credentials = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  async connect(setupToken: string): Promise<void> {
    try {
      // Setup tokens are base64-encoded claim URLs.
      const claimUrl = atob(setupToken.trim());

      const response = await fetch(claimUrl, { method: 'POST' });

      if (!response.ok) {
        throw new Error('Failed to connect to SimpleFin');
      }

      // The claim endpoint returns the plain-text Access URL, which embeds
      // Basic Auth credentials, e.g. https://user:pass@bridge.simplefin.org/simplefin
      const accessUrl = (await response.text()).trim();
      const parsed = new URL(accessUrl);

      this.credentials = {
        setupToken,
        accessToken: `${decodeURIComponent(parsed.username)}:${decodeURIComponent(parsed.password)}`,
        baseUrl: `${parsed.protocol}//${parsed.host}${parsed.pathname}`
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.credentials));
    } catch (error) {
      console.error('SimpleFin connection error:', error);
      throw error;
    }
  }

  async getFinancialData(): Promise<FinancialData> {
    if (!this.credentials) {
      throw new Error('Not connected to SimpleFin');
    }

    try {
      const response = await fetch(`${this.credentials.baseUrl}/accounts`, {
        headers: {
          Authorization: `Basic ${btoa(this.credentials.accessToken)}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        this.disconnect();
        throw new Error('SimpleFin connection was revoked. Please reconnect.');
      }

      if (!response.ok) {
        throw new Error('Failed to fetch financial data');
      }

      const data: SimpleFinAccountSet = await response.json();

      if (data.errors?.length) {
        console.warn('SimpleFin reported errors:', data.errors);
      }

      const accounts = data.accounts.map((account) => ({
        id: account.id,
        name: account.name,
        type: (account.type?.toLowerCase() || 'checking') as 'checking' | 'savings' | 'credit' | 'investment',
        balance: parseFloat(account.balance),
        institution: account.org?.name || account.org?.domain || 'Unknown'
      }));

      const transactions = data.accounts.flatMap((account) =>
        (account.transactions || []).map((transaction) => {
          const amount = parseFloat(transaction.amount);
          const postedSeconds = transaction.posted ?? transaction.transacted_at ?? 0;
          return {
            id: transaction.id,
            accountId: account.id,
            date: new Date(postedSeconds * 1000),
            description: transaction.description,
            amount,
            // SimpleFin has no category field; the app's categorization
            // rules (see services/budgets.ts) assign the real category.
            category: 'Uncategorized',
            type: (amount >= 0 ? 'income' : 'expense') as 'income' | 'expense'
          };
        })
      );

      return {
        accounts,
        transactions,
        budgets: [] // Budgets would be managed separately
      };
    } catch (error) {
      console.error('Error fetching financial data:', error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.credentials !== null;
  }
}

export const simpleFinService = new SimpleFinService();
