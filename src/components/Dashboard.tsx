import { Component, For, Show } from 'solid-js';
import { FinancialData } from '../types';
import { budgetService, UNCATEGORIZED } from '../services/budgets';
import { CategorizeTransaction } from './CategorizeTransaction';
import { BudgetManager } from './BudgetManager';

export const Dashboard: Component<{ data: FinancialData; onChange: () => void }> = (props) => {
  const totalBalance = () => props.data.accounts.reduce((sum, account) => sum + account.balance, 0);
  const monthlyIncome = () =>
    props.data.transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const monthlyExpenses = () =>
    props.data.transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const categoryTotals = () =>
    props.data.transactions.reduce((acc, transaction) => {
      if (transaction.type === 'expense') {
        acc[transaction.category] = (acc[transaction.category] || 0) + Math.abs(transaction.amount);
      }
      return acc;
    }, {} as Record<string, number>);

  return (
    <div class="dashboard">
      <h1>Financial Dashboard</h1>

      {/* Summary Cards */}
      <div class="summary-cards">
        <div class="card">
          <h3>Total Balance</h3>
          <p class="balance">${totalBalance().toFixed(2)}</p>
        </div>

        <div class="card">
          <h3>Monthly Income</h3>
          <p class="income">+${monthlyIncome().toFixed(2)}</p>
        </div>

        <div class="card">
          <h3>Monthly Expenses</h3>
          <p class="expense">-${monthlyExpenses().toFixed(2)}</p>
        </div>
      </div>

      {/* Accounts */}
      <div class="accounts-section">
        <h2>Accounts</h2>
        <div class="accounts">
          <For each={props.data.accounts}>
            {(account) => (
              <div class="account-card">
                <h3>{account.name}</h3>
                <p class="institution">{account.institution}</p>
                <p class="balance">${account.balance.toFixed(2)}</p>
              </div>
            )}
          </For>
        </div>
      </div>

      {/* Budgets */}
      <BudgetManager budgets={props.data.budgets} onChange={props.onChange} />

      {/* Recent Transactions */}
      <div class="transactions-section">
        <h2>Recent Transactions</h2>
        <div class="transactions">
          <For each={props.data.transactions.slice(0, 10)}>
            {(transaction) => (
              <div class="transaction">
                <div class="transaction-row">
                  <div class="transaction-info">
                    <span class="description">{transaction.description}</span>
                    <span class="category">{transaction.category}</span>
                  </div>
                  <span class={`amount ${transaction.type}`}>
                    {transaction.type === 'income' ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                  </span>
                </div>
                <Show when={transaction.category === UNCATEGORIZED}>
                  <CategorizeTransaction
                    transaction={transaction}
                    categories={budgetService.getCategories()}
                    onSaved={props.onChange}
                  />
                </Show>
              </div>
            )}
          </For>
        </div>
      </div>

      {/* Category Breakdown */}
      <div class="categories-section">
        <h2>Expense Categories</h2>
        <div class="categories">
          <For each={Object.entries(categoryTotals())}>
            {([category, total]) => (
              <div class="category">
                <span>{category}</span>
                <span>${total.toFixed(2)}</span>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
};
