import { createMemo, Component, For, Show } from 'solid-js';
import { FinancialData } from '../types';
import { isInCurrentMonth, TRANSFER } from '../services/budgets';
import { BudgetManager } from './BudgetManager';
import { RulesManager } from './RulesManager';
import { TransactionList } from './TransactionList';

const money = (value: number) =>
  value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

export const Dashboard: Component<{ data: FinancialData; onChange: () => void }> = (props) => {
  const totalBalance = () => props.data.accounts.reduce((sum, account) => sum + account.balance, 0);

  const thisMonth = createMemo(() =>
    props.data.transactions.filter((t) => isInCurrentMonth(t.date) && t.category !== TRANSFER)
  );
  const monthlyIncome = () =>
    thisMonth()
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  const monthlySpending = () =>
    thisMonth()
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const spendingByCategory = createMemo(() => {
    const totals = new Map<string, number>();
    for (const t of thisMonth()) {
      if (t.type === 'expense') totals.set(t.category, (totals.get(t.category) ?? 0) + Math.abs(t.amount));
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  });

  const monthName = () => new Date().toLocaleDateString(undefined, { month: 'long' });

  return (
    <div class="dashboard">
      <section class="summary-cards">
        <div class="card">
          <h3>Total balance</h3>
          <p class="stat">{money(totalBalance())}</p>
        </div>
        <div class="card">
          <h3>{monthName()} income</h3>
          <p class="stat income">{money(monthlyIncome())}</p>
        </div>
        <div class="card">
          <h3>{monthName()} spending</h3>
          <p class="stat expense">{money(monthlySpending())}</p>
        </div>
      </section>

      <section class="accounts-section">
        <h2>Accounts</h2>
        <div class="accounts">
          <For each={props.data.accounts} fallback={<p class="empty">No accounts returned by SimpleFIN.</p>}>
            {(account) => (
              <div class="account-card">
                <div>
                  <h3>{account.name}</h3>
                  <p class="institution">{account.institution}</p>
                </div>
                <p class={`account-balance ${account.balance < 0 ? 'negative' : ''}`}>{money(account.balance)}</p>
              </div>
            )}
          </For>
        </div>
      </section>

      <BudgetManager budgets={props.data.budgets} onChange={props.onChange} />

      <TransactionList
        transactions={props.data.transactions}
        categories={props.data.categories}
        onChange={props.onChange}
      />

      <section class="categories-section">
        <h2>{monthName()} spending by category</h2>
        <Show when={spendingByCategory().length > 0} fallback={<p class="empty">No spending yet this month.</p>}>
          <div class="categories">
            <For each={spendingByCategory()}>
              {([category, total]) => (
                <div class="category-row">
                  <span>{category}</span>
                  <span>{money(total)}</span>
                </div>
              )}
            </For>
          </div>
        </Show>
      </section>

      <RulesManager rules={props.data.rules} onChange={props.onChange} />
    </div>
  );
};
