import { createSignal, Component } from 'solid-js';
import { simpleFinService } from '../services/simplefin';

export const ConnectForm: Component<{ onConnected: () => void }> = (props) => {
  const [setupToken, setSetupToken] = createSignal('');
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal('');

  const handleConnect = async (e: Event) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await simpleFinService.connect(setupToken());
      props.onConnected();
    } catch (err) {
      setError('Failed to connect. Please check your setup token.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div class="connect-form">
      <h2>Connect to SimpleFin</h2>
      <p>
        Get your setup token from <a href="https://bridge.simplefin.org" target="_blank">SimpleFin Bridge</a>
      </p>

      <form onSubmit={handleConnect}>
        <div class="form-group">
          <label for="setup-token">Setup Token:</label>
          <input
            id="setup-token"
            type="text"
            value={setupToken()}
            onInput={(e) => setSetupToken(e.target.value)}
            placeholder="Enter your setup token"
            required
          />
        </div>

        <button type="submit" disabled={isLoading()}>
          {isLoading() ? 'Connecting...' : 'Connect'}
        </button>

        {error() && <div class="error">{error()}</div>}
      </form>
    </div>
  );
};