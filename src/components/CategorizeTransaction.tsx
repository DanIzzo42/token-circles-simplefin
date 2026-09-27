import { createSignal, untrack, Component, For, Show } from 'solid-js';
import { Transaction } from '../types';
import { budgetService, guessKeyword } from '../services/budgets';

export const CategorizeTransaction: Component<{
  transaction: Transaction;
  categories: string[];
  onSaved: () => void;
}> = (props) => {
  // Seed local form state from props once at creation; this form isn't meant
  // to react to later prop changes (a new transaction/category list means a
  // new row, via <For>'s keying), so the reads are intentionally untracked.
  const [category, setCategory] = createSignal(untrack(() => props.categories[0] || ''));
  const [isNewCategory, setIsNewCategory] = createSignal(untrack(() => props.categories.length === 0));
  const [newCategory, setNewCategory] = createSignal('');
  const [keyword, setKeyword] = createSignal(untrack(() => guessKeyword(props.transaction.description)));

  const handleSave = (e: Event) => {
    e.preventDefault();
    const finalCategory = isNewCategory() ? newCategory().trim() : category();
    if (!finalCategory || !keyword().trim()) return;
    budgetService.addRule(keyword(), finalCategory);
    props.onSaved();
  };

  return (
    <form class="categorize-form" onSubmit={handleSave}>
      <input
        type="text"
        value={keyword()}
        onInput={(e) => setKeyword(e.currentTarget.value)}
        placeholder="Match keyword"
        aria-label="Keyword to match this merchant"
      />

      <Show
        when={!isNewCategory()}
        fallback={
          <input
            type="text"
            value={newCategory()}
            onInput={(e) => setNewCategory(e.currentTarget.value)}
            placeholder="New category name"
            aria-label="New category name"
          />
        }
      >
        <select value={category()} onChange={(e) => setCategory(e.currentTarget.value)} aria-label="Category">
          <For each={props.categories}>{(c) => <option value={c}>{c}</option>}</For>
        </select>
      </Show>

      <Show when={props.categories.length > 0}>
        <label class="new-category-toggle">
          <input
            type="checkbox"
            checked={isNewCategory()}
            onChange={(e) => setIsNewCategory(e.currentTarget.checked)}
          />
          New category
        </label>
      </Show>

      <button type="submit">Categorize</button>
    </form>
  );
};
