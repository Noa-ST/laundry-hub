import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { useCurrentLocation } from '../hooks/useCurrentLocation';
import ShopCard from '../components/ShopCard';

const ShopDiscoveryPage = () => {
    const { location, error: locError, loading: locLoading } = useCurrentLocation();
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [radius, setRadius] = useState(15); // Default 15km

    useEffect(() => {
        if (!location) return;

        const fetchShops = async () => {
            try {
                setLoading(true);
                const response = await axiosClient.get(`/shops/nearby?lat=${location.lat}&lng=${location.lng}&radius=${radius}`);
                if (response.success) {
                    setShops(response.data);
                }
            } catch (err) {
                setError("Không thể tải danh sách tiệm giặt.");
            } finally {
                setLoading(false);
            }
        };

        fetchShops();
    }, [location, radius]);

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 pt-20">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Khám phá Tiệm giặt gần bạn</h1>
                        <p className="text-gray-500 mt-2">
                            {locLoading ? "Đang định vị vị trí của bạn..." : 
                             locError ? locError : `Đang tìm tiệm giặt quanh toạ độ: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
                        </p>
                    </div>
                    
                    {!locLoading && (
                        <div className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Bán kính:</label>
                            <select 
                                value={radius} 
                                onChange={(e) => setRadius(Number(e.target.value))}
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2"
                            >
                                <option value={5}>5 km</option>
                                <option value={15}>15 km</option>
                                <option value={50}>50 km</option>
                                <option value={5000}>Toàn quốc (5000km)</option>
                            </select>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-xl p-5 border border-gray-200 h-64 animate-pulse flex flex-col">
                                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                                <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
                                <div className="space-y-3 mt-auto">
                                    <div className="h-4 bg-gray-100 rounded w-full"></div>
                                    <div className="h-4 bg-gray-100 rounded w-5/6"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100">
                        {error}
                    </div>
                ) : shops.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Không tìm thấy tiệm nào</h3>
                        <p className="mt-1 text-sm text-gray-500">Rất tiếc không có tiệm giặt nào trong bán kính {radius}km.</p>
                        {radius < 5000 && (
                            <button 
                                onClick={() => setRadius(5000)}
                                className="mt-4 text-indigo-600 hover:text-indigo-800 font-medium text-sm transition-colors"
                            >
                                Bấm vào đây để tìm toàn quốc
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {shops.map(shop => (
                            <ShopCard key={shop.id} shop={shop} location={location} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShopDiscoveryPage;
