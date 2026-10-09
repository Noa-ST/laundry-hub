import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import axiosClient from './api/axiosClient';
import ShopDiscoveryPage from './pages/ShopDiscoveryPage';
import MyOrdersPage from './pages/MyOrdersPage';
import OwnerDashboardPage from './pages/OwnerDashboardPage';
import UserProfile from './components/UserProfile';
import NotificationBell from './components/NotificationBell';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AuthModal from './components/AuthModal';
import Footer from './components/Footer';
import { Toaster } from 'react-hot-toast';

const OwnerRoute = () => {
    return (
        <div className="relative min-h-screen bg-slate-50">
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
      return <AdminDashboardPage />;
  }

  // Public/Customer View
  return (
    <div className="relative min-h-screen bg-gray-50 flex flex-col">
      
      <div className="fixed top-0 left-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/50 z-50 shadow-[0_4px_30px_rgba(0,0,0,0.02)] transition-all">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
              <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => {window.location.hash = 'discovery'; setCurrentTab('discovery');}}>
                  <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-2 rounded-xl shadow-inner shadow-indigo-300">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                  </div>
                  <span className="font-extrabold text-xl bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 hidden sm:block tracking-tight">LaundryHub</span>
              </div>
              
              <div className="flex space-x-1 flex-1 justify-center max-w-sm">
                  <a 
                      href="#discovery"
                      className={`relative px-5 py-2 rounded-full font-semibold text-sm transition-all duration-300 ${currentTab === 'discovery' ? 'text-indigo-700 bg-indigo-50/80 shadow-sm ring-1 ring-indigo-100/50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
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
                      className={`relative px-5 py-2 rounded-full font-semibold text-sm transition-all duration-300 ${currentTab === 'orders' ? 'text-indigo-700 bg-indigo-50/80 shadow-sm ring-1 ring-indigo-100/50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                  >
                      Đơn hàng
                  </a>
              </div>
              
              <div>
                  {isAuthenticated ? (
                      <div className="flex items-center space-x-5">
                          <NotificationBell />
                          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
                          <UserProfile />
                      </div>
                  ) : (
                      <div className="flex items-center space-x-3">
                          <button 
                              onClick={() => { setAuthTab('login'); setIsAuthModalOpen(true); }}
                              className="px-5 py-2.5 text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          >
                              Đăng nhập
                          </button>
                          <button 
                              onClick={() => { setAuthTab('register'); setIsAuthModalOpen(true); }}
                              className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/20 rounded-xl transition-all"
                          >
                              Đăng ký
                          </button>
                      </div>
                  )}
              </div>
          </div>
      </div>
      
      <div className="pt-[72px] flex-grow">
          {currentTab === 'discovery' ? <ShopDiscoveryPage /> : <MyOrdersPage />}
      </div>

      <Footer />

      <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)} 
          defaultTab={authTab}
      />
      <Toaster position="top-center" />
    </div>
  );
}

export default App;