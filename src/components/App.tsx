import { createSignal, onMount, Component } from 'solid-js';
import { ConnectForm } from './ConnectForm';
import { Dashboard } from './Dashboard';
import { simpleFinService } from '../services/simplefin';
import { budgetService, computeBudgetProgress } from '../services/budgets';
import { FinancialData } from '../types';

export const App: Component = () => {
  const [isConnected, setIsConnected] = createSignal(simpleFinService.isConnected());
  const [financialData, setFinancialData] = createSignal<FinancialData | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal('');

  const applyCategorization = (data: FinancialData): FinancialData => {
    const transactions = budgetService.categorizeAll(data.transactions);
    const budgets = computeBudgetProgress(budgetService.getBudgets(), transactions);
    return { ...data, transactions, budgets };
  };

  const handleRefreshData = async () => {
    if (!simpleFinService.isConnected()) return;

    setIsLoading(true);
    setError('');
    try {
      const data = await simpleFinService.getFinancialData();
      setFinancialData(applyCategorization(data));
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
      // getFinancialData disconnects on a revoked/expired connection
      setIsConnected(simpleFinService.isConnected());
    } finally {
      setIsLoading(false);
    }
  };

  // Re-runs categorization/budget math over already-fetched transactions,
  // without a network round-trip. Used after a rule or budget is added/removed.
  const handleRecategorize = () => {
    const current = financialData();
    if (current) setFinancialData(applyCategorization(current));
  };

  const handleConnected = () => {
    setIsConnected(true);
    handleRefreshData();
  };

  const handleDisconnect = () => {
    simpleFinService.disconnect();
    setIsConnected(false);
    setFinancialData(null);
    setError('');
  };

  onMount(() => {
    if (isConnected()) {
      handleRefreshData();
    }
  });

  return (
    <div class="app">
      <header>
        <h1>Token Circles - SimpleFin Edition</h1>
        {isConnected() && (
          <div class="header-actions">
            <button onClick={handleRefreshData} disabled={isLoading()}>
              {isLoading() ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <button onClick={handleDisconnect}>Disconnect</button>
          </div>
        )}
      </header>

      {error() && <div class="error">{error()}</div>}

      <main>
        {!isConnected() ? (
          <ConnectForm onConnected={handleConnected} />
        ) : (
          <Dashboard
            data={financialData() || { accounts: [], transactions: [], budgets: [] }}
            onChange={handleRecategorize}
          />
        )}
      </main>
    </div>
  );
};
