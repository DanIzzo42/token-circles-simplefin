import { createSignal, Component } from 'solid-js';
import { ConnectForm } from './ConnectForm';
import { Dashboard } from './Dashboard';
import { simpleFinService } from '../services/simplefin';
import { FinancialData } from '../types';

export const App: Component = () => {
  const [isConnected, setIsConnected] = createSignal(false);
  const [financialData, setFinancialData] = createSignal<FinancialData | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);

  const handleRefreshData = async () => {
    if (!simpleFinService.isConnected()) return;

    setIsLoading(true);
    try {
      const data = await simpleFinService.getFinancialData();
      setFinancialData(data);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnected = () => {
    setIsConnected(true);
    handleRefreshData();
  };

  return (
    <div class="app">
      <header>
        <h1>Token Circles - SimpleFin Edition</h1>
        {isConnected() && (
          <div class="header-actions">
            <button onClick={handleRefreshData} disabled={isLoading()}>
              {isLoading() ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        )}
      </header>

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