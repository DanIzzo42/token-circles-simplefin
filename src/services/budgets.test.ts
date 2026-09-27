import { beforeEach, describe, expect, it } from 'vitest';
import {
  BudgetService,
  computeBudgetProgress,
  guessKeyword,
  isInCurrentMonth,
  TRANSFER,
  UNCATEGORIZED
} from './budgets';
import { BudgetConfig, Transaction } from '../types';

const NOW = new Date(2026, 8, 20, 12, 0, 0); // Sep 20 2026, local time

function txn(overrides: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(36).slice(2),
    accountId: 'acc1',
    date: NOW,
    description: 'SOMETHING',
    amount: -10,
    category: UNCATEGORIZED,
    type: 'expense',
    pending: false,
    ...overrides
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('guessKeyword', () => {
  it.each([
    ['SQ *STARBUCKS #1234', 'STARBUCKS'],
    ['WHOLE FOODS MKT 10234', 'WHOLE FOODS'],
    ['POSTMATES ORDER 88', 'POSTMATES ORDER'],
    ['DEBIT CARD PURCHASE TARGET 00012', 'TARGET'],
    ['AMAZON.COM*AB12CD', 'AMAZON.COM'],
    ["TST* JOE'S PIZZA 555-1234", "JOE'S PIZZA"],
    ['Netflix.com', 'NETFLIX.COM'],
    ['12345', '12345']
  ])('%s -> %s', (description, expected) => {
    expect(guessKeyword(description)).toBe(expected);
  });

  it('falls back to a single word when the two-word guess is not contiguous in the description', () => {
    expect(guessKeyword('UBER *TRIP HELP.UBER.COM')).toBe('UBER');
  });

  it.each([
    'SQ *STARBUCKS #1234',
    'UBER *TRIP HELP.UBER.COM',
    'DEBIT CARD PURCHASE TARGET 00012',
    'ACH   PAYROLL ACME CORP',
    '#9921 GAS STATION',
    'x'
  ])('always produces a keyword whose rule matches its own transaction: %s', (description) => {
    const service = new BudgetService();
    service.addRule(guessKeyword(description), 'Test');
    expect(service.categorize(description)).toBe('Test');
  });
});

describe('BudgetService rules', () => {
  it('categorizes by case-insensitive substring match and falls back to Uncategorized', () => {
    const service = new BudgetService();
    service.addRule('starbucks', 'Dining');
    expect(service.categorize('SQ *Starbucks #1234')).toBe('Dining');
    expect(service.categorize('WHOLE FOODS')).toBe(UNCATEGORIZED);
  });

  it('upserts a rule for the same keyword instead of duplicating it', () => {
    const service = new BudgetService();
    service.addRule('STARBUCKS', 'Dining');
    service.addRule(' starbucks ', 'Coffee');
    expect(service.getRules()).toHaveLength(1);
    expect(service.categorize('STARBUCKS #1')).toBe('Coffee');
  });

  it('uses the first matching rule in creation order', () => {
    const service = new BudgetService();
    service.addRule('AMAZON', 'Shopping');
    service.addRule('AMAZON PRIME', 'Subscriptions');
    expect(service.categorize('AMAZON PRIME VIDEO')).toBe('Shopping');
  });

  it('ignores blank keywords', () => {
    const service = new BudgetService();
    service.addRule('   ', 'Dining');
    expect(service.getRules()).toHaveLength(0);
  });

  it('deletes rules, sending matching transactions back to Uncategorized', () => {
    const service = new BudgetService();
    service.addRule('STARBUCKS', 'Dining');
    service.deleteRule(service.getRules()[0].id);
    expect(service.categorize('STARBUCKS')).toBe(UNCATEGORIZED);
  });

  it('persists rules and budgets across instances via localStorage', () => {
    const first = new BudgetService();
    first.addRule('STARBUCKS', 'Dining');
    first.addBudget({ name: 'Eating out', category: 'Dining', amount: 200, period: 'monthly' });

    const second = new BudgetService();
    expect(second.categorize('STARBUCKS')).toBe('Dining');
    expect(second.getBudgets().map((b) => b.name)).toEqual(['Eating out']);
  });

  it('offers budget categories plus Transfer, without duplicates', () => {
    const service = new BudgetService();
    service.addBudget({ name: 'Food', category: 'Groceries', amount: 400, period: 'monthly' });
    service.addBudget({ name: 'Food (weekly)', category: 'Groceries', amount: 100, period: 'weekly' });
    expect(service.getCategories()).toEqual(['Groceries', TRANSFER]);
  });

  it('re-categorizes a list of transactions without mutating the input', () => {
    const service = new BudgetService();
    service.addRule('STARBUCKS', 'Dining');
    const input = [txn({ description: 'STARBUCKS' }), txn({ description: 'OTHER' })];
    const output = service.categorizeAll(input);
    expect(output.map((t) => t.category)).toEqual(['Dining', UNCATEGORIZED]);
    expect(input[0].category).toBe(UNCATEGORIZED);
  });
});

describe('computeBudgetProgress', () => {
  const monthly: BudgetConfig = { id: 'b1', name: 'Dining', category: 'Dining', amount: 100, period: 'monthly' };
  const weekly: BudgetConfig = { id: 'b2', name: 'Dining wk', category: 'Dining', amount: 30, period: 'weekly' };

  it('sums this calendar month of expenses in the budget category only', () => {
    const transactions = [
      txn({ category: 'Dining', amount: -40, date: new Date(2026, 8, 2) }),
      txn({ category: 'Dining', amount: -15.5, date: new Date(2026, 8, 19), pending: true }),
      txn({ category: 'Dining', amount: -99, date: new Date(2026, 7, 31) }), // last month
      txn({ category: 'Groceries', amount: -60, date: new Date(2026, 8, 10) }), // other category
      txn({ category: 'Dining', amount: 25, type: 'income', date: new Date(2026, 8, 10) }) // refund
    ];
    const [progress] = computeBudgetProgress([monthly], transactions, NOW);
    expect(progress.spent).toBeCloseTo(55.5);
    expect(progress).toMatchObject({ id: 'b1', amount: 100 });
  });

  it('uses the trailing 7 days for weekly budgets', () => {
    const transactions = [
      txn({ category: 'Dining', amount: -10, date: new Date(2026, 8, 14) }), // 6 days ago
      txn({ category: 'Dining', amount: -20, date: new Date(2026, 8, 10) }) // 10 days ago
    ];
    const [progress] = computeBudgetProgress([weekly], transactions, NOW);
    expect(progress.spent).toBe(10);
  });

  it('reports zero spend for a budget with no matching transactions', () => {
    expect(computeBudgetProgress([monthly], [], NOW)[0].spent).toBe(0);
  });
});

describe('isInCurrentMonth', () => {
  it('compares year and month', () => {
    expect(isInCurrentMonth(new Date(2026, 8, 1), NOW)).toBe(true);
    expect(isInCurrentMonth(new Date(2026, 7, 31), NOW)).toBe(false);
    expect(isInCurrentMonth(new Date(2025, 8, 20), NOW)).toBe(false);
  });
});
