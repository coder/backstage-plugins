import '@backstage/cli/asset-types';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@backstage/ui/css/styles.css';

const root = document.getElementById('root');
if (root === null) {
  throw new Error('Application root is missing from initial static HTML file');
}

ReactDOM.createRoot(root).render(<App />);
