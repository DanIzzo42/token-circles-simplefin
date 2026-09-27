export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'investment';
  balance: number;
  institution: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: Date;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
}

export interface BudgetConfig {
  id: string;
  name: string;
  category: string;
  amount: number;
  period: 'monthly' | 'weekly';
}

export interface Budget extends BudgetConfig {
  spent: number;
}

export interface CategoryRule {
  id: string;
  keyword: string;
  category: string;
}

export interface SimpleFinCredentials {
  setupToken: string;
  accessToken: string;
  baseUrl: string;
}

export interface FinancialData {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
}