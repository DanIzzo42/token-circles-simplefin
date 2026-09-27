import { Budget, BudgetConfig, CategoryRule, Transaction } from '../types';

const BUDGETS_KEY = 'budget_configs';
const RULES_KEY = 'category_rules';

export const UNCATEGORIZED = 'Uncategorized';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// Strips common bank-statement prefixes, then returns the first word-like
// token as a starting-point keyword. The user confirms/edits it before it's
// saved as a rule, so this only needs to be a reasonable guess.
export function guessKeyword(description: string): string {
  const cleaned = description
    .replace(/^(SQ|POS|ACH|DEBIT|CREDIT|PURCHASE|PMT|PAYMENT)\s*\*?\s*/i, '')
    .trim();
  const match = cleaned.match(/[A-Za-z][A-Za-z'&-]{2,}/);
  return (match?.[0] || cleaned.split(/\s+/)[0] || description).toUpperCase();
}

export function periodStart(period: 'monthly' | 'weekly', now = new Date()): Date {
  if (period === 'weekly') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return start;
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function computeBudgetProgress(
  configs: BudgetConfig[],
  transactions: Transaction[],
  now = new Date()
): Budget[] {
  return configs.map((config) => {
    const start = periodStart(config.period, now);
    const spent = transactions
      .filter((t) => t.type === 'expense' && t.category === config.category && t.date >= start && t.date <= now)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return { ...config, spent };
  });
}

export class BudgetService {
  private budgets: BudgetConfig[] = load(BUDGETS_KEY, []);
  private rules: CategoryRule[] = load(RULES_KEY, []);

  getBudgets(): BudgetConfig[] {
    return this.budgets;
  }

  getCategories(): string[] {
    return [...new Set(this.budgets.map((b) => b.category))];
  }

  addBudget(input: Omit<BudgetConfig, 'id'>): BudgetConfig {
    const budget: BudgetConfig = { ...input, id: crypto.randomUUID() };
    this.budgets = [...this.budgets, budget];
    save(BUDGETS_KEY, this.budgets);
    return budget;
  }

  deleteBudget(id: string): void {
    this.budgets = this.budgets.filter((b) => b.id !== id);
    save(BUDGETS_KEY, this.budgets);
  }

  getRules(): CategoryRule[] {
    return this.rules;
  }

  // Assigns a transaction (identified by its merchant keyword) to a category.
  // Upserts by keyword so re-categorizing the same merchant updates the rule
  // rather than creating a duplicate.
  addRule(keyword: string, category: string): void {
    const normalized = keyword.trim().toUpperCase();
    if (!normalized) return;
    const existing = this.rules.find((r) => r.keyword === normalized);
    if (existing) {
      existing.category = category;
      this.rules = [...this.rules];
    } else {
      this.rules = [...this.rules, { id: crypto.randomUUID(), keyword: normalized, category }];
    }
    save(RULES_KEY, this.rules);
  }

  deleteRule(id: string): void {
    this.rules = this.rules.filter((r) => r.id !== id);
    save(RULES_KEY, this.rules);
  }

  // First matching rule wins, in the order rules were created.
  categorize(description: string): string {
    const upper = description.toUpperCase();
    const match = this.rules.find((r) => upper.includes(r.keyword));
    return match?.category ?? UNCATEGORIZED;
  }

  categorizeAll(transactions: Transaction[]): Transaction[] {
    return transactions.map((t) => ({ ...t, category: this.categorize(t.description) }));
  }
}

export const budgetService = new BudgetService();
