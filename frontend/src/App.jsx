import { useState, useEffect } from 'react';
import axiosClient from './api/axiosClient';
import UserSwitcher from './components/UserSwitcher';
import { useMockUser } from './context/MockUserContext';
import ShopDiscoveryPage from './pages/ShopDiscoveryPage';
import MyOrdersPage from './pages/MyOrdersPage';

function DashboardFallback({ healthInfo, loading, error }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative pt-20">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 transition-all hover:shadow-2xl duration-300">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white text-center">
          <div className="inline-block p-3 bg-white/20 rounded-full mb-3 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Laundry Hub</h1>
          <p className="mt-2 text-blue-100 font-medium">Dashboard Tiệm Giặt / Quản Trị</p>
        </div>
        
        <div className="p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3 border-b border-gray-100 pb-3 flex items-center">
              System Status
            </h2>
            
            {loading ? (
              <div className="flex items-center justify-center space-x-3 text-indigo-500 bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="font-medium">Connecting...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm">
                {error}
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl shadow-sm">
                <div className="ml-3 w-full">
                    <p className="text-sm text-emerald-800 font-bold">API Online</p>
                    <div className="mt-3 text-xs text-emerald-700 space-y-2 bg-emerald-100/50 p-3 rounded-lg">
                      <div className="flex justify-between items-center"><span className="font-semibold text-emerald-800">Service:</span> <span className="px-2 py-0.5 bg-white rounded shadow-sm">{healthInfo?.data?.service}</span></div>
                      <div className="flex justify-between items-center"><span className="font-semibold text-emerald-800">Status:</span> <span className="px-2 py-0.5 bg-emerald-500 text-white rounded font-bold shadow-sm">{healthInfo?.data?.status}</span></div>
                    </div>
                  </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const { currentUser, loading: userLoading } = useMockUser();
  const [healthInfo, setHealthInfo] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [currentTab, setCurrentTab] = useState('discovery');

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'orders') setCurrentTab('orders');
    else setCurrentTab('discovery');
    
    const handleHashChange = () => {
      const h = window.location.hash.replace('#', '');
      setCurrentTab(h === 'orders' ? 'orders' : 'discovery');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await axiosClient.get('/health');
        setHealthInfo(response);
        setError(null);
      } catch (err) {
        setError(err.message || 'Lỗi kết nối đến server');
        setHealthInfo(null);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, []);

  if (userLoading) return null;

  return (
    <div className="relative min-h-screen bg-gray-50">
      <UserSwitcher />
      
      {currentUser?.role === 'CUSTOMER' ? (
        <>
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
                    <div className="flex space-x-1 mr-48">
                        <a 
                            href="#discovery"
                            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${currentTab === 'discovery' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            Khám phá
                        </a>
                        <a 
                            href="#orders"
                            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${currentTab === 'orders' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            Đơn hàng của tôi
                        </a>
                    </div>
                </div>
            </div>
            
            <div className="pt-16">
                {currentTab === 'discovery' ? <ShopDiscoveryPage /> : <MyOrdersPage />}
            </div>
        </>
      ) : (
        <DashboardFallback healthInfo={healthInfo} loading={loading} error={error} />
      )}
    </div>
  );
}

export default App;
