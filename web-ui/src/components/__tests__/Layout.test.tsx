import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Layout } from '../Layout';
import { AppProvider } from '../../contexts/AppContext';

// Mock the API service
jest.mock('../../services/api', () => ({
  apiService: {
    getSchemas: jest.fn().mockResolvedValue({ schemas: [] }),
    getStatus: jest.fn().mockResolvedValue({
      status: 'healthy',
      protocols: { rest: true, graphql: true, websocket: true },
      storage: { type: 'file', available: true, schemaCount: 0 },
      version: '1.0.0'
    })
  }
}));

const renderWithProviders = (children: React.ReactNode) => {
  return render(
    <BrowserRouter>
      <AppProvider>
        {children}
      </AppProvider>
    </BrowserRouter>
  );
};

describe('Layout', () => {
  it('renders the main navigation', () => {
    renderWithProviders(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    expect(screen.getByText('API Explorer')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Introspect')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders the system status section', () => {
    renderWithProviders(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    expect(screen.getByText('System Status')).toBeInTheDocument();
  });

  it('renders children content', () => {
    renderWithProviders(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
});
