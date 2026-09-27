import { createMemo, createSignal, onMount, Component, For, Show } from 'solid-js';
import { ConnectForm } from './ConnectForm';
import { Dashboard } from './Dashboard';
import { CACHE_MAX_AGE_MS, simpleFinService, SyncResult } from '../services/simplefin';
import { budgetService, computeBudgetProgress } from '../services/budgets';
import { FinancialData } from '../types';

function formatAge(fetchedAt: Date, now = new Date()): string {
  const minutes = Math.round((now.getTime() - fetchedAt.getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return fetchedAt.toLocaleDateString();
}

export const App: Component = () => {
  const [isConnected, setIsConnected] = createSignal(simpleFinService.isConnected());
  const [sync, setSync] = createSignal<SyncResult | null>(null);
  // Bumped whenever a rule or budget changes, so categorization re-runs
  // locally over the already-fetched transactions (no network call).
  const [rulesVersion, setRulesVersion] = createSignal(0);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal('');

  const financialData = createMemo<FinancialData>(() => {
    rulesVersion();
    const current = sync();
    const transactions = budgetService.categorizeAll(current?.transactions ?? []);
    return {
      accounts: current?.accounts ?? [],
      transactions,
      budgets: computeBudgetProgress(budgetService.getBudgets(), transactions),
      rules: budgetService.getRules(),
      categories: budgetService.getCategories(),
      warnings: current?.warnings ?? [],
      fetchedAt: current?.fetchedAt ?? null
    };
  });

  const handleRefreshData = async () => {
    if (!simpleFinService.isConnected()) return;

    setIsLoading(true);
    setError('');
    try {
      setSync(await simpleFinService.fetchAccounts());
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
      // fetchAccounts disconnects on a revoked/expired connection
      if (!simpleFinService.isConnected()) {
        setIsConnected(false);
        setSync(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnected = () => {
    setIsConnected(true);
    setError('');
    handleRefreshData();
  };

  const handleDisconnect = () => {
    simpleFinService.disconnect();
    setIsConnected(false);
    setSync(null);
    setError('');
  };

  onMount(() => {
    if (!isConnected()) return;
    const cached = simpleFinService.getCached();
    if (cached) setSync(cached);
    if (!cached || Date.now() - cached.fetchedAt.getTime() > CACHE_MAX_AGE_MS) {
      handleRefreshData();
    }
  });

  return (
    <div class="app">
      <header>
        <h1>Token Circles</h1>
        <Show when={isConnected()}>
          <div class="header-actions">
            <Show when={financialData().fetchedAt}>
              {(fetchedAt) => <span class="last-updated">Updated {formatAge(fetchedAt())}</span>}
            </Show>
            <button onClick={handleRefreshData} disabled={isLoading()}>
              {isLoading() ? 'Refreshing...' : 'Refresh'}
            </button>
            <button class="secondary" onClick={handleDisconnect}>
              Disconnect
            </button>
          </div>
        </Show>
      </header>

      <Show when={error()}>
        <div class="error">{error()}</div>
      </Show>

      <For each={financialData().warnings}>{(warning) => <div class="warning">{warning}</div>}</For>

      <main>
        <Show when={isConnected()} fallback={<ConnectForm onConnected={handleConnected} />}>
          <Show when={sync()} fallback={<p class="loading">Loading your accounts…</p>}>
            <Dashboard data={financialData()} onChange={() => setRulesVersion((v) => v + 1)} />
          </Show>
        </Show>
      </main>
    </div>
  );
};
