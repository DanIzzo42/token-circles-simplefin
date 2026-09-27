import { Component, For, Show } from 'solid-js';
import { CategoryRule } from '../types';
import { budgetService } from '../services/budgets';

export const RulesManager: Component<{ rules: CategoryRule[]; onChange: () => void }> = (props) => {
  const handleDelete = (id: string) => {
    budgetService.deleteRule(id);
    props.onChange();
  };

  return (
    <details class="rules-section">
      <summary>
        <h2>Categorization rules ({props.rules.length})</h2>
      </summary>
      <p class="hint">
        A transaction whose description contains a keyword gets that rule's category. The first matching rule wins.
        Deleting a rule sends its transactions back to “Needs category”.
      </p>
      <Show when={props.rules.length > 0} fallback={<p class="empty">No rules yet — categorize a transaction to create one.</p>}>
        <ul class="rules">
          <For each={props.rules}>
            {(rule) => (
              <li class="rule">
                <code>{rule.keyword}</code>
                <span class="rule-arrow" aria-hidden="true">
                  →
                </span>
                <span class="rule-category">{rule.category}</span>
                <button
                  class="icon-button"
                  onClick={() => handleDelete(rule.id)}
                  aria-label={`Delete rule ${rule.keyword}`}
                >
                  ×
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </details>
  );
};
