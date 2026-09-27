import { SimpleFinCredentials, FinancialData } from '../types';

export class SimpleFinService {
  private credentials: SimpleFinCredentials | null = null;

  async connect(setupToken: string): Promise<void> {
    try {
      // Exchange setup token for access token
      const response = await fetch(`https://bridge.simplefin.org/claim/${setupToken}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to connect to SimpleFin');
      }

      const data = await response.json();
      this.credentials = {
        setupToken,
        accessToken: data.access_token,
        baseUrl: data.base_url
      };
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
          'Authorization': `Basic ${btoa(`${this.credentials.accessToken}:`)}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch financial data');
      }

      const data = await response.json();

      // Transform SimpleFin data to our format
      const accounts = data.accounts.map((account: any) => ({
        id: account.id,
        name: account.name,
        type: account.type.toLowerCase(),
        balance: account.balance,
        institution: account.institution
      }));

      const transactions = data.transactions?.map((transaction: any) => ({
        id: transaction.id,
        accountId: transaction.account_id,
        date: new Date(transaction.date),
        description: transaction.description,
        amount: transaction.amount,
        category: transaction.category || 'Uncategorized',
        type: transaction.amount > 0 ? 'income' : 'expense'
      })) || [];

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