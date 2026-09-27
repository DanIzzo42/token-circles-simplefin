import { createSignal, Component, For } from 'solid-js';
import { Budget } from '../types';
import { budgetService } from '../services/budgets';

export const BudgetManager: Component<{ budgets: Budget[]; onChange: () => void }> = (props) => {
  const [name, setName] = createSignal('');
  const [category, setCategory] = createSignal('');
  const [amount, setAmount] = createSignal('');
  const [period, setPeriod] = createSignal<'monthly' | 'weekly'>('monthly');

  const handleAdd = (e: Event) => {
    e.preventDefault();
    const amountValue = parseFloat(amount());
    if (!name().trim() || !category().trim() || !(amountValue > 0)) return;

    budgetService.addBudget({ name: name().trim(), category: category().trim(), amount: amountValue, period: period() });
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
    <div class="budgets-section">
      <h2>Budgets</h2>

      <div class="budgets">
        <For each={props.budgets}>
          {(budget) => {
            const percent = () => Math.min(100, (budget.spent / budget.amount) * 100);
            const overBudget = () => budget.spent > budget.amount;
            return (
              <div class="budget-card">
                <div class="budget-header">
                  <h3>{budget.name}</h3>
                  <button onClick={() => handleDelete(budget.id)} aria-label={`Delete ${budget.name} budget`}>
                    ×
                  </button>
                </div>
                <p class="budget-category">
                  {budget.category} · {budget.period}
                </p>
                <div class="budget-bar">
                  <div
                    class={`budget-bar-fill ${overBudget() ? 'over' : ''}`}
                    style={{ width: `${percent()}%` }}
                  />
                </div>
                <p class={`budget-amounts ${overBudget() ? 'over' : ''}`}>
                  ${budget.spent.toFixed(2)} / ${budget.amount.toFixed(2)}
                </p>
              </div>
            );
          }}
        </For>
      </div>

      <form class="budget-form" onSubmit={handleAdd}>
        <h3>Add Budget</h3>
        <input
          type="text"
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
          placeholder="Budget name (e.g. Groceries)"
          aria-label="Budget name"
        />
        <input
          type="text"
          value={category()}
          onInput={(e) => setCategory(e.currentTarget.value)}
          placeholder="Category (e.g. Groceries)"
          aria-label="Category"
        />
        <input
          type="number"
          step="0.01"
          value={amount()}
          onInput={(e) => setAmount(e.currentTarget.value)}
          placeholder="Amount"
          aria-label="Budget amount"
        />
        <select value={period()} onChange={(e) => setPeriod(e.currentTarget.value as 'monthly' | 'weekly')}>
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
        </select>
        <button type="submit">Add Budget</button>
      </form>
    </div>
  );
};
