import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CRITICAL APP ERROR CAUGHT BY BOUNDARY:', error, errorInfo);
  }

  handleReload = () => {
    try {
      localStorage.removeItem('crash_active_bet');
      localStorage.removeItem('crash_queued_bet');
    } catch (e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#07090e',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'Inter, sans-serif',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👑</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px 0', color: '#00e699' }}>
            Royal X
          </h2>
          <p style={{ fontSize: '14px', color: '#8a8d98', margin: '0 0 20px 0', maxWidth: '300px' }}>
            Произошло обновление данных приложения. Нажмите кнопку ниже для продолжения.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: '12px 28px',
              backgroundColor: '#00e699',
              color: '#07090e',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '15px',
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(0, 230, 153, 0.4)'
            }}
          >
            Перезагрузить приложение
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
