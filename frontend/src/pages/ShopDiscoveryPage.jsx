import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axiosClient from '../api/axiosClient';
import { useCurrentLocation } from '../hooks/useCurrentLocation';
import ShopCard from '../components/ShopCard';
import ShopMapView from '../components/ShopMapView';
import LocationPickerMap from '../components/LocationPickerMap';

const ShopDiscoveryPage = () => {
    const { location, error: locError, loading: locLoading, setLocation } = useCurrentLocation();
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [radius, setRadius] = useState(15);
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [sortBy, setSortBy] = useState('distance');
    const [minRating, setMinRating] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [tempLat, setTempLat] = useState(null);
    const [tempLng, setTempLng] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Reset về trang 1 khi người dùng đổi bộ lọc tìm kiếm
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedCategory, sortBy, minRating, radius, location]);

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

    // Helper to check if shop has a specific service category
    const hasServiceCategory = (shop, category) => {
        if (!shop.services || shop.services.length === 0) return false;
        
        const keywords = {
            'BASIC': ['cơ bản', 'quần áo', 'giặt sấy', 'lấy liền'],
            'PREMIUM': ['hấp', 'veston', 'cao cấp'],
            'SHOES': ['giày', 'sneaker'],
            'BEDDING': ['gấu bông', 'chăn', 'ga', 'mền']
        };
        
        if (!keywords[category]) return true;
        
        return shop.services.some(service => {
            const name = service.name.toLowerCase();
            return keywords[category].some(kw => name.includes(kw));
        });
    };

    // Client-side filtering
    let filteredShops = shops.filter(shop => {
        const matchSearch = shop.name.toLowerCase().includes(searchQuery.toLowerCase()) || (shop.address && shop.address.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchRating = (shop.rating || 0) >= minRating;
        
        let matchCategory = true;
        if (selectedCategory !== 'ALL') {
            matchCategory = hasServiceCategory(shop, selectedCategory);
        }
        
        return matchSearch && matchRating && matchCategory;
    });

    // Client-side sorting
    filteredShops.sort((a, b) => {
        if (sortBy === 'rating') {
            return (b.rating || 0) - (a.rating || 0);
        } else if (sortBy === 'price') {
            const minA = a.services?.length > 0 ? Math.min(...a.services.map(s => s.price)) : 9999999;
            const minB = b.services?.length > 0 ? Math.min(...b.services.map(s => s.price)) : 9999999;
            return minA - minB;
        } else {
            return (a.distanceKm || 0) - (b.distanceKm || 0);
        }
    });

    // Pagination calculations
    const totalShops = filteredShops.length;
    const totalPages = Math.ceil(totalShops / itemsPerPage) || 1;
    const paginatedShops = filteredShops.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            const el = document.getElementById('shops-grid-section');
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    };

    const getPageNumbers = () => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        if (currentPage <= 4) {
            return [1, 2, 3, 4, 5, '...', totalPages];
        }
        if (currentPage >= totalPages - 3) {
            return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        }
        return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
    };

    return (
        <div className="bg-slate-50/60 font-sans pb-12">
            
            {/* Hero Section */}
            <div className="relative pb-16 pt-12 overflow-hidden">
                {/* Background Image & Overlay */}
                <div className="absolute inset-0">
                    <img 
                        src="https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?q=80&w=2070&auto=format&fit=crop" 
                        alt="Laundry Background" 
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-900/40"></div>
                </div>
                
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white z-10 pt-4">
                    <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-shadow-md">
                        Tìm Tiệm Giặt Tốt Nhất Quanh Bạn
                    </h1>
                    <p className="text-teal-50 max-w-2xl mx-auto text-lg md:text-xl font-semibold mb-8 text-shadow-sm">
                        Giặt thảnh thơi - Giao tận nơi
                    </p>
                    <p className="text-teal-100/80 max-w-2xl mx-auto text-sm md:text-base font-medium mb-8">
                        Khám phá hàng trăm tiệm giặt chất lượng, giá cả minh bạch và dịch vụ giao nhận tận nơi.
                    </p>
                    
                    {/* Location UI */}
                    <div className="inline-flex items-center justify-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-sm text-sm">
                        <svg className="w-5 h-5 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-semibold">
                            {locLoading ? "Đang định vị..." : locError ? locError : "Vị trí của bạn"}
                        </span>
                        {!locLoading && !locError && (
                            <span className="text-teal-100 ml-1 border-l border-white/30 pl-2 opacity-80 text-xs hidden sm:inline-block">
                                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                            </span>
                        )}
                        {!locLoading && (
                            <button onClick={() => {
                                setTempLat(location?.lat || 10.7769);
                                setTempLng(location?.lng || 106.7009);
                                setIsLocationModalOpen(true);
                            }} className="text-white hover:text-amber-200 font-bold ml-2 transition-colors">Thay đổi</button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
                {/* Search & Filters Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4 md:p-5 mb-8 flex flex-col gap-4">
                    
                    {/* Top Row: Search & Core Filters */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between w-full">
                        {/* Search Bar */}
                        <div className="relative w-full md:flex-1 max-w-lg">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Tên tiệm, địa chỉ..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                            />
                        </div>

                        {/* Right side controls */}
                        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0 justify-start md:justify-end">
                            {/* Sort Dropdown */}
                            <select 
                                value={sortBy} 
                                onChange={(e) => setSortBy(e.target.value)}
                                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all cursor-pointer"
                            >
                                <option value="distance">Gần tôi nhất</option>
                                <option value="rating">Đánh giá cao nhất</option>
                                <option value="price">Giá thấp nhất</option>
                            </select>

                            {/* Radius Dropdown */}
                            <select 
                                value={radius} 
                                onChange={(e) => setRadius(Number(e.target.value))}
                                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all cursor-pointer"
                            >
                                <option value={5}>Dưới 5 km</option>
                                <option value={15}>Dưới 15 km</option>
                                <option value={50}>Dưới 50 km</option>
                                <option value={5000}>Toàn quốc (5000km)</option>
                            </select>

                            {/* View Toggle */}
                            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                                <button 
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    title="Xem dạng lưới"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                                </button>
                                <button 
                                    onClick={() => setViewMode('map')}
                                    className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${viewMode === 'map' ? 'bg-white shadow-sm text-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    title="Xem trên bản đồ"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Categories & Rating Filter */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between pt-3 border-t border-slate-100">
                        {/* Filter Chips - Categories */}
                        <div className="flex overflow-x-auto scrollbar-hide gap-2 w-full md:flex-1 pb-1">
                            {[
                                { id: 'ALL', label: 'Tất cả dịch vụ' },
                                { id: 'BASIC', label: 'Giặt sấy cơ bản' },
                                { id: 'PREMIUM', label: 'Giặt hấp / Veston' },
                                { id: 'SHOES', label: 'Vệ sinh Giày' },
                                { id: 'BEDDING', label: 'Chăn ga / Gấu bông' }
                            ].map(cat => (
                                <button 
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-semibold transition-all border shrink-0 ${
                                        selectedCategory === cat.id 
                                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm' 
                                        : 'bg-white text-slate-700 border-slate-300 hover:border-teal-500 hover:bg-teal-50/50'
                                    }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                        
                        {/* Rating Filter */}
                        <button 
                            onClick={() => setMinRating(minRating === 4 ? 0 : 4)}
                            className={`shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold transition-all border ${
                                minRating === 4 ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-sm' : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-50/50 hover:border-amber-300'
                            }`}
                        >
                            <svg className={`w-4 h-4 ${minRating === 4 ? 'text-amber-500' : 'text-slate-500'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                            Chỉ tiệm uy tín (≥ 4 Sao)
                        </button>
                    </div>
                </div>

                {/* Results Header Info */}
                <div id="shops-grid-section" className="flex items-center justify-between mb-5 pt-3 scroll-mt-24">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-800">
                            Tìm thấy <span className="text-teal-700 font-extrabold">{totalShops}</span> tiệm giặt
                        </span>
                        {radius && (
                            <span className="text-[11px] bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-full border border-slate-300">
                                trong bán kính {radius >= 1000 ? 'Toàn quốc' : `${radius} km`}
                            </span>
                        )}
                    </div>
                    {viewMode === 'grid' && totalPages > 1 && (
                        <span className="text-xs text-slate-700 font-semibold hidden sm:inline-block">
                            Trang <strong className="text-slate-900">{currentPage}</strong> / {totalPages} (8 tiệm / trang)
                        </span>
                    )}
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200/80 h-72 animate-pulse flex flex-col shadow-sm">
                                <div className="h-6 bg-slate-200 rounded-md w-2/3 mb-4"></div>
                                <div className="h-4 bg-slate-100 rounded-md w-full mb-2"></div>
                                <div className="h-4 bg-slate-100 rounded-md w-1/2 mb-6"></div>
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 h-20 mb-4"></div>
                                <div className="h-10 bg-slate-200 rounded-xl w-full mt-auto"></div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="bg-rose-50 text-rose-600 p-4 rounded-xl border border-rose-100 text-center text-sm font-medium shadow-sm">
                        {error}
                    </div>
                ) : filteredShops.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                        <svg className="mx-auto h-12 w-12 text-slate-300 stroke-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="mt-3 text-base font-bold text-slate-900">Không tìm thấy tiệm nào</h3>
                        <p className="mt-1 text-sm text-slate-500">Thử thay đổi bộ lọc hoặc mở rộng bán kính tìm kiếm của bạn.</p>
                        {radius < 5000 && (
                            <button 
                                onClick={() => { setRadius(5000); setSearchQuery(''); setSelectedCategory('ALL'); }}
                                className="mt-4 px-5 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-xl text-sm font-semibold transition-colors"
                            >
                                Xóa bộ lọc & Tìm toàn quốc
                            </button>
                        )}
                    </div>
                ) : viewMode === 'map' ? (
                    <ShopMapView shops={filteredShops} userLocation={location} location={location} />
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {paginatedShops.map(shop => (
                                <ShopCard key={shop.id} shop={shop} location={location} />
                            ))}
                        </div>

                        {/* Pagination Navigation */}
                        {totalPages > 1 && (
                            <div className="mt-10 pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-xs text-slate-500 font-medium text-center sm:text-left">
                                    Hiển thị <span className="font-bold text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-bold text-slate-800">{Math.min(currentPage * itemsPerPage, totalShops)}</span> trong số <span className="font-bold text-slate-800">{totalShops}</span> tiệm giặt
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {/* Prev Button */}
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="h-9 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                                        title="Trang trước"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                        </svg>
                                        <span className="hidden sm:inline">Trước</span>
                                    </button>

                                    {/* Page Number Buttons */}
                                    <div className="flex items-center gap-1">
                                        {getPageNumbers().map((pageItem, idx) => {
                                            if (pageItem === '...') {
                                                return (
                                                    <span key={`ellipsis-${idx}`} className="w-8 text-center text-slate-400 font-bold text-xs select-none">
                                                        ...
                                                    </span>
                                                );
                                            }
                                            const isActive = pageItem === currentPage;
                                            return (
                                                <button
                                                    key={pageItem}
                                                    onClick={() => handlePageChange(pageItem)}
                                                    className={`w-9 h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                                                        isActive
                                                            ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 ring-2 ring-teal-600/20'
                                                            : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:border-slate-300'
                                                    }`}
                                                >
                                                    {pageItem}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Next Button */}
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="h-9 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                                        title="Trang sau"
                                    >
                                        <span className="hidden sm:inline">Sau</span>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Location Picker Modal */}
            {isLocationModalOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-slide-up">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                            <h2 className="font-bold text-slate-900">Chọn vị trí tìm kiếm</h2>
                            <button onClick={() => setIsLocationModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto">
                            <p className="text-sm text-slate-500 mb-4">Di chuyển bản đồ để chọn khu vực bạn muốn tìm tiệm giặt.</p>
                            <LocationPickerMap 
                                initialLat={tempLat}
                                initialLng={tempLng}
                                onLocationChange={(lat, lng) => {
                                    setTempLat(lat);
                                    setTempLng(lng);
                                }}
                            />
                        </div>
                        <div className="p-4 border-t border-slate-100 shrink-0">
                            <button
                                onClick={() => {
                                    if (setLocation && tempLat && tempLng) {
                                        setLocation({ lat: tempLat, lng: tempLng });
                                    }
                                    setIsLocationModalOpen(false);
                                }}
                                className="w-full bg-teal-600 text-white font-bold py-2.5 rounded-xl hover:bg-teal-700 transition-colors"
                            >
                                Xác nhận vị trí
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ShopDiscoveryPage;
