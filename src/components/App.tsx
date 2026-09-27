import { createSignal, onMount, Component } from 'solid-js';
import { ConnectForm } from './ConnectForm';
import { Dashboard } from './Dashboard';
import { simpleFinService } from '../services/simplefin';
import { FinancialData } from '../types';

export const App: Component = () => {
  const [isConnected, setIsConnected] = createSignal(simpleFinService.isConnected());
  const [financialData, setFinancialData] = createSignal<FinancialData | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal('');

  const handleRefreshData = async () => {
    if (!simpleFinService.isConnected()) return;

    setIsLoading(true);
    setError('');
    try {
      const data = await simpleFinService.getFinancialData();
      setFinancialData(data);
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
      // getFinancialData disconnects on a revoked/expired connection
      setIsConnected(simpleFinService.isConnected());
    } finally {
      setIsLoading(false);
    }
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
          <Dashboard data={financialData() || { accounts: [], transactions: [], budgets: [] }} />
        )}
      </main>
    </div>
  );
};
