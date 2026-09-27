import { render } from 'solid-js/web';
import { App } from './components/App';
import './index.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element not found');
}

render(() => <App />, root);