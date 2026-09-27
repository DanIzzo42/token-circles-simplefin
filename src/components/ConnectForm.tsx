import { createSignal, Component, Show } from 'solid-js';
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
      console.error(err);
      // fetch() rejects with a TypeError when the request never completes,
      // e.g. offline or blocked by the browser (CORS).
      setError(
        err instanceof TypeError
          ? "Couldn't reach SimpleFIN from this browser. Check your connection and try again."
          : err instanceof Error
            ? err.message
            : 'Failed to connect. Please check your setup token.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div class="connect-form">
      <h2>Connect your bank</h2>
      <ol class="steps">
        <li>
          Sign in to{' '}
          <a href="https://bridge.simplefin.org" target="_blank" rel="noopener noreferrer">
            SimpleFIN Bridge
          </a>{' '}
          and link your bank accounts.
        </li>
        <li>Under “Apps”, create a new connection and copy its setup token.</li>
        <li>Paste it below. Each token works once, so each person/device needs its own.</li>
      </ol>

      <form onSubmit={handleConnect}>
        <label for="setup-token">Setup token</label>
        <input
          id="setup-token"
          type="text"
          value={setupToken()}
          onInput={(e) => setSetupToken(e.currentTarget.value)}
          placeholder="Paste your setup token"
          autocomplete="off"
          spellcheck={false}
          required
        />

        <button type="submit" disabled={isLoading()}>
          {isLoading() ? 'Connecting…' : 'Connect'}
        </button>

        <Show when={error()}>
          <div class="error">{error()}</div>
        </Show>
      </form>

      <p class="hint">
        Your connection and categories are stored only in this browser. Nothing is sent anywhere except SimpleFIN.
      </p>
    </div>
  );
};
