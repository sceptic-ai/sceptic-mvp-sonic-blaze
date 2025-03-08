import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

// Layouts
import MainLayout from './layouts/MainLayout';

// Pages
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import AnalysisPage from './pages/AnalysisPage';
import TokenAnalysisPage from './pages/TokenAnalysisPage';
import DataMarketplacePage from './pages/DataMarketplacePage';
import DAOPage from './pages/DAOPage';
import ProfilePage from './pages/ProfilePage';

// Components
import { WalletModal } from './components/WalletModal';

// Context
import { WalletProvider } from './contexts/WalletContext';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <Router>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<HomePage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="analysis" element={<AnalysisPage />} />
              <Route path="token-analysis" element={<TokenAnalysisPage />} />
              <Route path="marketplace" element={<DataMarketplacePage />} />
              <Route path="dao" element={<DAOPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Routes>
          <WalletModal />
        </Router>
        <Toaster position="top-right" />
      </WalletProvider>
    </QueryClientProvider>
  );
}

export default App;