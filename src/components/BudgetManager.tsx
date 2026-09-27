import { createSignal, Component, For, Show } from 'solid-js';
import { Budget } from '../types';
import { budgetService } from '../services/budgets';
import { money } from '../format';

export const BudgetManager: Component<{ budgets: Budget[]; onChange: () => void }> = (props) => {
  const [name, setName] = createSignal('');
  const [category, setCategory] = createSignal('');
  const [amount, setAmount] = createSignal('');
  const [period, setPeriod] = createSignal<'monthly' | 'weekly'>('monthly');

  const handleAdd = (e: Event) => {
    e.preventDefault();
    const amountValue = parseFloat(amount());
    if (!name().trim() || !category().trim() || !(amountValue > 0)) return;

    budgetService.addBudget({
      name: name().trim(),
      category: category().trim(),
      amount: amountValue,
      period: period()
    });
    setName('');
    setCategory('');
    setAmount('');
    props.onChange();
  };

  const handleDelete = (id: string) => {
    budgetService.deleteBudget(id);
    props.onChange();
  };

  return (
    <section class="budgets-section">
      <h2>Budgets</h2>

      <Show
        when={props.budgets.length > 0}
        fallback={
          <p class="empty">
            No budgets yet. Each budget's category becomes something you can assign transactions to.
          </p>
        }
      >
        <div class="budgets">
          <For each={props.budgets}>
            {(budget) => {
              const percent = () => Math.min(100, (budget.spent / budget.amount) * 100);
              const over = () => budget.spent > budget.amount;
              return (
                <div class="budget-card">
                  <div class="budget-header">
                    <h3>{budget.name}</h3>
                    <button
                      class="icon-button"
                      onClick={() => handleDelete(budget.id)}
                      aria-label={`Delete ${budget.name} budget`}
                    >
                      ×
                    </button>
                  </div>
                  <p class="budget-category">
                    {budget.category} · {budget.period === 'monthly' ? 'this month' : 'last 7 days'}
                  </p>
                  <div
                    class="budget-bar"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={budget.amount}
                    aria-valuenow={budget.spent}
                  >
                    <div class={`budget-bar-fill ${over() ? 'over' : ''}`} style={{ width: `${percent()}%` }} />
                  </div>
                  <p class="budget-amounts">
                    <span>
                      {money(budget.spent)} of {money(budget.amount)}
                    </span>
                    <span class={over() ? 'over' : 'remaining'}>
                      {over() ? `${money(budget.spent - budget.amount)} over` : `${money(budget.amount - budget.spent)} left`}
                    </span>
                  </p>
                </div>
              );
            }}
          </For>
        </div>
      </Show>

      <form class="budget-form" onSubmit={handleAdd}>
        <h3>Add a budget</h3>
        <input
          type="text"
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
          placeholder="Name (e.g. Eating out)"
          aria-label="Budget name"
        />
        <input
          type="text"
          value={category()}
          onInput={(e) => setCategory(e.currentTarget.value)}
          placeholder="Category (e.g. Dining)"
          aria-label="Category"
        />
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount()}
          onInput={(e) => setAmount(e.currentTarget.value)}
          placeholder="Amount"
          aria-label="Budget amount"
        />
        <select
          value={period()}
          onChange={(e) => setPeriod(e.currentTarget.value as 'monthly' | 'weekly')}
          aria-label="Budget period"
        >
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
        </select>
        <button type="submit">Add budget</button>
      </form>
    </section>
  );
};
