import { BrowserRouter } from 'react-router';
import { AppRoutes } from './routes';
import './styles/tokens.css';
import './styles/base.css';
import './styles/motion.css';

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
