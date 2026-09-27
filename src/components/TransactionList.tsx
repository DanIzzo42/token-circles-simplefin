import { createMemo, createSignal, Component, For, Show } from 'solid-js';
import { Transaction } from '../types';
import { UNCATEGORIZED } from '../services/budgets';
import { CategorizeTransaction } from './CategorizeTransaction';
import { money } from '../format';

const PAGE_SIZE = 20;

const needsCategory = (t: Transaction) => t.type === 'expense' && t.category === UNCATEGORIZED;

const formatDate = (date: Date) => date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const TransactionRow: Component<{ transaction: Transaction; categories: string[]; onChange: () => void }> = (
  props
) => {
  const [editing, setEditing] = createSignal(false);
  const showForm = () => needsCategory(props.transaction) || editing();

  return (
    <div class="transaction">
      <div class="transaction-row">
        <span class="transaction-date">{formatDate(props.transaction.date)}</span>
        <div class="transaction-info">
          <span class="description">{props.transaction.description}</span>
          <span class="transaction-meta">
            <Show when={props.transaction.pending}>
              <span class="badge">Pending</span>
            </Show>
            {/* Uncategorized income isn't flagged (it doesn't count against a
                budget), but can still be categorized, e.g. as a Transfer. */}
            <Show when={props.transaction.type === 'expense' || props.transaction.category !== UNCATEGORIZED}>
              <span class={`category ${props.transaction.category === UNCATEGORIZED ? 'uncategorized' : ''}`}>
                {props.transaction.category}
              </span>
            </Show>
            <Show when={!showForm()}>
              <button class="link-button" onClick={() => setEditing(true)}>
                {props.transaction.category === UNCATEGORIZED ? 'Categorize' : 'Change'}
              </button>
            </Show>
          </span>
        </div>
        <span class={`amount ${props.transaction.type}`}>
          {props.transaction.type === 'income' ? '+' : '−'}
          {money(Math.abs(props.transaction.amount))}
        </span>
      </div>
      <Show when={showForm()}>
        <CategorizeTransaction
          transaction={props.transaction}
          categories={props.categories}
          onSaved={() => {
            setEditing(false);
            props.onChange();
          }}
          onCancel={editing() ? () => setEditing(false) : undefined}
        />
      </Show>
    </div>
  );
};

export const TransactionList: Component<{
  transactions: Transaction[];
  categories: string[];
  onChange: () => void;
}> = (props) => {
  const [filter, setFilter] = createSignal<'all' | 'uncategorized'>('all');
  const [visible, setVisible] = createSignal(PAGE_SIZE);

  const uncategorizedCount = createMemo(() => props.transactions.filter(needsCategory).length);
  const filtered = createMemo(() =>
    filter() === 'uncategorized' ? props.transactions.filter(needsCategory) : props.transactions
  );

  const selectFilter = (value: 'all' | 'uncategorized') => {
    setFilter(value);
    setVisible(PAGE_SIZE);
  };

  return (
    <section class="transactions-section">
      <div class="section-header">
        <h2>Transactions</h2>
        <div class="filter-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={filter() === 'all'}
            class={filter() === 'all' ? 'active' : ''}
            onClick={() => selectFilter('all')}
          >
            All ({props.transactions.length})
          </button>
          <button
            role="tab"
            aria-selected={filter() === 'uncategorized'}
            class={filter() === 'uncategorized' ? 'active' : ''}
            onClick={() => selectFilter('uncategorized')}
          >
            Needs category ({uncategorizedCount()})
          </button>
        </div>
      </div>

      <div class="transactions">
        <For
          each={filtered().slice(0, visible())}
          fallback={
            <p class="empty">
              {filter() === 'uncategorized' ? 'Everything is categorized.' : 'No transactions in the last 60 days.'}
            </p>
          }
        >
          {(transaction) => (
            <TransactionRow transaction={transaction} categories={props.categories} onChange={props.onChange} />
          )}
        </For>
      </div>

      <Show when={filtered().length > visible()}>
        <button class="secondary show-more" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
          Show more ({filtered().length - visible()} remaining)
        </button>
      </Show>
    </section>
  );
};
