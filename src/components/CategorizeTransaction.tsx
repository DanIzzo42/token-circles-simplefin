import { createSignal, untrack, Component, For, Show } from 'solid-js';
import { Transaction } from '../types';
import { budgetService, guessKeyword, UNCATEGORIZED } from '../services/budgets';

export const CategorizeTransaction: Component<{
  transaction: Transaction;
  categories: string[];
  onSaved: () => void;
  onCancel?: () => void;
}> = (props) => {
  // Seed local form state from props once at creation; this form isn't meant
  // to react to later prop changes (a new transaction/category list means a
  // new row, via <For>'s keying), so the reads are intentionally untracked.
  const initialCategory = untrack(() =>
    props.transaction.category !== UNCATEGORIZED ? props.transaction.category : props.categories[0] || ''
  );
  const [category, setCategory] = createSignal(initialCategory);
  const [isNewCategory, setIsNewCategory] = createSignal(untrack(() => props.categories.length === 0));
  const [newCategory, setNewCategory] = createSignal('');
  const [keyword, setKeyword] = createSignal(untrack(() => guessKeyword(props.transaction.description)));

  const keywordMatches = () =>
    keyword().trim() !== '' && props.transaction.description.toUpperCase().includes(keyword().trim().toUpperCase());

  const handleSave = (e: Event) => {
    e.preventDefault();
    const finalCategory = isNewCategory() ? newCategory().trim() : category();
    if (!finalCategory || !keywordMatches()) return;
    budgetService.addRule(keyword(), finalCategory);
    props.onSaved();
  };

  return (
    <form class="categorize-form" onSubmit={handleSave}>
      <label class="field">
        <span>Merchant keyword</span>
        <input
          type="text"
          value={keyword()}
          onInput={(e) => setKeyword(e.currentTarget.value)}
          aria-label="Keyword to match this merchant"
          aria-invalid={!keywordMatches()}
        />
      </label>

      <label class="field">
        <span>Category</span>
        <Show
          when={!isNewCategory()}
          fallback={
            <input
              type="text"
              value={newCategory()}
              onInput={(e) => setNewCategory(e.currentTarget.value)}
              placeholder="e.g. Groceries"
              aria-label="New category name"
            />
          }
        >
          <select value={category()} onChange={(e) => setCategory(e.currentTarget.value)} aria-label="Category">
            <For each={props.categories}>{(c) => <option value={c}>{c}</option>}</For>
          </select>
        </Show>
      </label>

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

      <div class="form-actions">
        <button type="submit" disabled={!keywordMatches()}>
          Save rule
        </button>
        <Show when={props.onCancel}>
          <button type="button" class="secondary" onClick={() => props.onCancel?.()}>
            Cancel
          </button>
        </Show>
      </div>

      <Show when={!keywordMatches()}>
        <p class="hint">The keyword has to appear in “{props.transaction.description}”.</p>
      </Show>
    </form>
  );
};
