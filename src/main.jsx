import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './context/AppContext';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[React ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#090a0f',
          color: '#ffffff',
          fontFamily: 'sans-serif',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#ff4d4d', marginBottom: '12px' }}>⚠️ Ошибка интерфейса</h2>
          <p style={{ color: '#9da3b4', fontSize: '14px', maxWidth: '360px', marginBottom: '20px' }}>
            {this.state.error?.message || 'Произошла непредвиденная ошибка при отображении страницы.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#00e699',
              color: '#05140d',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Перезагрузить страницу
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
