import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import axiosClient from './api/axiosClient';
import ShopDiscoveryPage from './pages/ShopDiscoveryPage';
import MyOrdersPage from './pages/MyOrdersPage';
import OwnerDashboardPage from './pages/OwnerDashboardPage';
import UserProfile from './components/UserProfile';
import AuthModal from './components/AuthModal';

const OwnerRoute = () => {
    return (
        <div className="relative min-h-screen bg-gray-50">
            <div className="fixed top-0 right-0 p-4 z-50">
                <UserProfile />
            </div>
            <OwnerDashboardPage />
        </div>
    );
};

function App() {
  const [currentTab, setCurrentTab] = useState('discovery');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState('login');
  
  const { currentUser, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    const handleHashChange = () => {
        const hash = window.location.hash.replace('#', '') || 'discovery';
        if (hash === 'orders' && !isAuthenticated) {
            window.dispatchEvent(new Event('auth:required'));
            window.location.hash = 'discovery';
            return;
        }
        setCurrentTab(hash);
    };

    const handleAuthRequired = () => {
        setAuthTab('login');
        setIsAuthModalOpen(true);
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('auth:required', handleAuthRequired);
    
    return () => {
        window.removeEventListener('hashchange', handleHashChange);
        window.removeEventListener('auth:required', handleAuthRequired);
    };
  }, [isAuthenticated]);

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
      );
  }

  // Redirect Logic for Shop Owner and Admin
  if (isAuthenticated && currentUser.role === 'SHOP_OWNER') {
      return <OwnerRoute />;
  }

  if (isAuthenticated && currentUser.role === 'ADMIN') {
      return (
          <div className="relative min-h-screen bg-gray-50 flex items-center justify-center flex-col space-y-4">
              <h2 className="text-2xl font-bold">Trang dành cho Admin đang phát triển</h2>
              <UserProfile />
          </div>
      );
  }

  // Public/Customer View
  return (
    <div className="relative min-h-screen bg-gray-50">
      
      <div className="fixed top-0 left-0 w-full bg-white border-b border-gray-200 z-40 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                  <div className="bg-indigo-600 p-2 rounded-lg">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                  </div>
                  <span className="font-bold text-xl text-gray-900 hidden sm:block">LaundryHub</span>
              </div>
              
              <div className="flex space-x-1 flex-1 justify-center max-w-sm">
                  <a 
                      href="#discovery"
                      className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${currentTab === 'discovery' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                      Khám phá
                  </a>
                  <a 
                      href={isAuthenticated ? "#orders" : "#"}
                      onClick={(e) => {
                          if (!isAuthenticated) {
                              e.preventDefault();
                              window.dispatchEvent(new Event('auth:required'));
                          }
                      }}
                      className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${currentTab === 'orders' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                      Đơn hàng
                  </a>
              </div>
              
              <div>
                  {isAuthenticated ? (
                      <UserProfile />
                  ) : (
                      <div className="flex items-center space-x-2">
                          <button 
                              onClick={() => { setAuthTab('login'); setIsAuthModalOpen(true); }}
                              className="px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                              Đăng nhập
                          </button>
                          <button 
                              onClick={() => { setAuthTab('register'); setIsAuthModalOpen(true); }}
                              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
                          >
                              Đăng ký
                          </button>
                      </div>
                  )}
              </div>
          </div>
      </div>
      
      <div className="pt-16">
          {currentTab === 'discovery' ? <ShopDiscoveryPage /> : <MyOrdersPage />}
      </div>

      <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)} 
          defaultTab={authTab}
      />
    </div>
  );
}

export default App;