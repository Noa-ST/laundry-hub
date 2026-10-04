import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import ActualWeightModal from '../components/ActualWeightModal';
import ServiceManagementTab from '../components/ServiceManagementTab';

const OwnerDashboardPage = () => {
    const [shopData, setShopData] = useState(null);
    const [hasShop, setHasShop] = useState(false);
    const [mainTab, setMainTab] = useState('orders'); // 'orders', 'services', 'machines', 'settings'

    // Orders State
    const [orders, setOrders] = useState([]);
    const [summary, setSummary] = useState({ pendingCount: 0, processingCount: 0, readyCount: 0, completedCount: 0, totalRevenue: 0 });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ALL');
    const [weightModalOrder, setWeightModalOrder] = useState(null);
    
    // Settings Form State
    const [isSavingShop, setIsSavingShop] = useState(false);
    const [shopForm, setShopForm] = useState({
        name: '', phone: '', operatingHours: '07:00 - 21:00',
        address: '', latitude: 0, longitude: 0,
        totalWashers: 1, totalDryers: 0
    });

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const shopRes = await axiosClient.get('/owner/my-shop');
            if (shopRes.success) {
                if (shopRes.data && shopRes.data.id) {
                    setShopData(shopRes.data);
                    setHasShop(true);
                    setMainTab('orders');
                    setShopForm({
                        name: shopRes.data.name || '',
                        phone: shopRes.data.phone || '',
                        operatingHours: shopRes.data.operatingHours || '07:00 - 21:00',
                        address: shopRes.data.address || '',
                        latitude: shopRes.data.latitude || 0,
                        longitude: shopRes.data.longitude || 0,
                        totalWashers: shopRes.data.totalWashers || 1,
                        totalDryers: shopRes.data.totalDryers || 0
                    });

                    // Fetch orders only if shop exists
                    const [ordersRes, summaryRes] = await Promise.all([
                        axiosClient.get('/owner/orders'),
                        axiosClient.get('/owner/orders/summary')
                    ]);
                    if (ordersRes.success) setOrders(ordersRes.data);
                    if (summaryRes.success) setSummary(summaryRes.data);
                } else {
                    setHasShop(false);
                    setMainTab('settings');
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDashboardData(); }, []);

    const handleSaveShop = async (e) => {
        e.preventDefault();
        try {
            setIsSavingShop(true);
            const payload = {
                ...shopForm,
                latitude: parseFloat(shopForm.latitude),
                longitude: parseFloat(shopForm.longitude),
                totalWashers: parseInt(shopForm.totalWashers),
                totalDryers: parseInt(shopForm.totalDryers)
            };
            
            let res;
            if (hasShop) {
                res = await axiosClient.put('/owner/my-shop', payload);
            } else {
                res = await axiosClient.post('/owner/setup-shop', payload);
            }
            
            if (res.success) {
                alert(hasShop ? "Cập nhật thành công!" : "Tạo tiệm thành công!");
                fetchDashboardData();
            } else {
                alert(res.message || "Lỗi lưu thông tin");
            }
        } catch (error) {
            alert(error.response?.data?.message || "Lỗi kết nối khi lưu");
        } finally {
            setIsSavingShop(false);
        }
    };

    const handleGetLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setShopForm(prev => ({
                        ...prev,
                        latitude: parseFloat(position.coords.latitude.toFixed(6)),
                        longitude: parseFloat(position.coords.longitude.toFixed(6))
                    }));
                },
                (error) => alert("Không thể lấy vị trí: " + error.message)
            );
        } else {
            alert("Trình duyệt của bạn không hỗ trợ Geolocation.");
        }
    };

    const updateStatus = async (orderId, newStatus, reason = null) => {
        try {
            const res = await axiosClient.patch(`/owner/orders/${orderId}/status`, { newStatus, cancelReason: reason });
            if (res.success) {
                fetchDashboardData();
            } else {
                alert(res.message || "Có lỗi xảy ra");
            }
        } catch (error) {
            alert("Lỗi kết nối khi cập nhật trạng thái");
        }
    };

    const formatMoney = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

    const filteredOrders = orders.filter(o => {
        if (activeTab === 'ALL') return true;
        if (activeTab === 'PENDING') return o.status === 'PENDING';
        if (activeTab === 'PICKING_UP') return o.status === 'PICKING_UP';
        if (activeTab === 'WASHING') return ['RECEIVED', 'PROCESSING'].includes(o.status);
        if (activeTab === 'LOGISTICS') return ['READY', 'DELIVERING'].includes(o.status);
        if (activeTab === 'COMPLETED') return o.status === 'COMPLETED';
        if (activeTab === 'CANCELLED') return o.status === 'CANCELLED';
        return true;
    });

    const tabs = [
        { id: 'ALL', label: 'Tất cả' },
        { id: 'PENDING', label: 'Chờ duyệt' },
        { id: 'PICKING_UP', label: 'Đang đi lấy' },
        { id: 'WASHING', label: 'Đang giặt' },
        { id: 'LOGISTICS', label: 'Chờ giao/lấy' },
        { id: 'COMPLETED', label: 'Hoàn thành' },
        { id: 'CANCELLED', label: 'Đã hủy' }
    ];

    const renderActionButtons = (order) => {
        const { id, status, inboundMethod, outboundMethod } = order;
        
        if (status === 'PENDING') {
            return (
                <div className="flex space-x-2 w-full mt-4">
                    <button onClick={() => updateStatus(id, 'CONFIRMED')} className="flex-1 bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold py-2 px-3 rounded-lg hover:bg-indigo-100 shadow-sm text-xs transition-colors">Xác nhận Đơn</button>
                    <button onClick={() => { const reason = prompt("Lý do từ chối?"); if(reason) updateStatus(id, 'CANCELLED', reason); }} className="flex-1 bg-rose-50 text-rose-700 border border-rose-200 font-semibold py-2 px-3 rounded-lg hover:bg-rose-100 shadow-sm text-xs transition-colors">Từ chối</button>
                </div>
            );
        }
        if (status === 'CONFIRMED') {
            if (inboundMethod === 'STORE_PICKUP') {
                return <button onClick={() => updateStatus(id, 'PICKING_UP')} className="w-full mt-4 bg-slate-800 text-white font-semibold py-2 px-3 rounded-lg hover:bg-slate-900 shadow-sm text-xs transition-colors">Xuất phát đi lấy</button>;
            }
            return <button onClick={() => updateStatus(id, 'RECEIVED')} className="w-full mt-4 bg-slate-800 text-white font-semibold py-2 px-3 rounded-lg hover:bg-slate-900 shadow-sm text-xs transition-colors">Khách đã giao đồ</button>;
        }
        if (status === 'PICKING_UP') {
            return <button onClick={() => updateStatus(id, 'RECEIVED')} className="w-full mt-4 bg-slate-800 text-white font-semibold py-2 px-3 rounded-lg hover:bg-slate-900 shadow-sm text-xs transition-colors">Đã nhận & mang về</button>;
        }
        if (status === 'RECEIVED') {
            return <button onClick={() => setWeightModalOrder(id)} className="w-full mt-4 bg-indigo-600 text-white font-semibold py-2 px-3 rounded-lg hover:bg-indigo-700 shadow-sm text-xs transition-colors">Cân ký & Giặt</button>;
        }
        if (status === 'PROCESSING') {
            return <button onClick={() => updateStatus(id, 'READY')} className="w-full mt-4 bg-emerald-600 text-white font-semibold py-2 px-3 rounded-lg hover:bg-emerald-700 shadow-sm text-xs transition-colors">Hoàn thành & Đóng gói</button>;
        }
        if (status === 'READY') {
            if (outboundMethod === 'DELIVERY_TO_HOME') {
                return <button onClick={() => updateStatus(id, 'DELIVERING')} className="w-full mt-4 bg-slate-800 text-white font-semibold py-2 px-3 rounded-lg hover:bg-slate-900 shadow-sm text-xs transition-colors">Bắt đầu đi giao</button>;
            }
            return <button onClick={() => updateStatus(id, 'COMPLETED')} className="w-full mt-4 bg-emerald-600 text-white font-semibold py-2 px-3 rounded-lg hover:bg-emerald-700 shadow-sm text-xs transition-colors">Khách đã nhận đồ</button>;
        }
        if (status === 'DELIVERING') {
            return <button onClick={() => updateStatus(id, 'COMPLETED')} className="w-full mt-4 bg-emerald-600 text-white font-semibold py-2 px-3 rounded-lg hover:bg-emerald-700 shadow-sm text-xs transition-colors">Đã giao thành công</button>;
        }
        return null;
    };

    if (loading && !shopData && !hasShop) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const handleTabClick = (tabId) => {
        if (!hasShop && tabId !== 'settings') {
            alert("Vui lòng hoàn tất Thông tin Tiệm trước khi sử dụng các tính năng này.");
            return;
        }
        setMainTab(tabId);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            
            {!hasShop && (
                <div className="bg-indigo-600 text-white text-sm font-medium text-center py-3 shadow-md z-40 relative">
                    Chào mừng bạn! Vui lòng hoàn tất thông tin tiệm giặt bên dưới để bắt đầu cấu hình dịch vụ và nhận đơn.
                </div>
            )}

            {/* Header & Sub-Navbar */}
            <div className="bg-white border-b border-slate-200 shadow-sm pt-4 px-4 sm:px-6 lg:px-8 mb-0 sticky top-0 z-30">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                    <div className="flex items-center space-x-3">
                        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                            {hasShop ? shopData.name : 'Khởi tạo Tiệm Giặt'}
                        </h1>
                        {hasShop && (
                            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 whitespace-nowrap">
                                Đang mở cửa
                            </span>
                        )}
                    </div>
                    
                    <button 
                        disabled={!hasShop}
                        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Tạo đơn tại quầy
                    </button>
                </div>

                <div className="max-w-6xl mx-auto flex space-x-6 overflow-x-auto custom-scrollbar">
                    {[
                        { id: 'orders', label: 'Đơn hàng' },
                        { id: 'services', label: 'Dịch vụ & Bảng giá' },
                        { id: 'machines', label: 'Máy giặt & Sấy' },
                        { id: 'settings', label: 'Thông tin Tiệm' }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => handleTabClick(t.id)}
                            className={`pb-3 text-sm whitespace-nowrap transition-colors ${
                                mainTab === t.id 
                                ? 'border-b-2 border-slate-900 text-slate-900 font-semibold -mb-px' 
                                : 'border-b-2 border-transparent text-slate-500 hover:text-slate-800 font-medium'
                            } ${!hasShop && t.id !== 'settings' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-8">
                
                {/* -------------------- TAB: ORDERS -------------------- */}
                {mainTab === 'orders' && hasShop && (
                    <div className="animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm flex flex-col">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chờ xác nhận</span>
                                <span className="text-2xl font-bold text-slate-900 mt-2">{summary.pendingCount}</span>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm flex flex-col">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đang xử lý</span>
                                <span className="text-2xl font-bold text-slate-900 mt-2">{summary.processingCount}</span>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm flex flex-col">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sẵn sàng / Chờ giao</span>
                                <span className="text-2xl font-bold text-slate-900 mt-2">{summary.readyCount}</span>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm flex flex-col">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Doanh thu hoàn tất</span>
                                <span className="text-2xl font-bold text-emerald-600 mt-2">{formatMoney(summary.totalRevenue)}</span>
                            </div>
                        </div>

                        <div className="flex overflow-x-auto mb-6 custom-scrollbar">
                            <div className="bg-slate-100 p-1 rounded-xl flex gap-1 whitespace-nowrap min-w-max">
                                {tabs.map(tab => (
                                    <button 
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {filteredOrders.length === 0 ? (
                            <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-slate-200 flex flex-col items-center">
                                <h3 className="text-lg font-bold text-slate-900 mb-1">Không tìm thấy đơn hàng</h3>
                                <p className="text-slate-500 text-sm">Hiện không có đơn hàng nào khớp với trạng thái lọc này.</p>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredOrders.map(order => (
                                    <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col hover:border-slate-300 transition-colors relative overflow-hidden">
                                        {order.status === 'CANCELLED' && <div className="absolute top-4 right-[-30px] bg-rose-50 text-rose-700 border-b border-l border-rose-200 text-[10px] font-bold px-10 py-1.5 rotate-45 uppercase tracking-wider z-10">Đã hủy</div>}
                                        {order.status === 'COMPLETED' && <div className="absolute top-4 right-[-30px] bg-emerald-50 text-emerald-700 border-b border-l border-emerald-200 text-[10px] font-bold px-10 py-1.5 rotate-45 uppercase tracking-wider z-10">Thành công</div>}
                                        
                                        <div className="flex-1">
                                            <div className="mb-4 pr-10">
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <span className="text-slate-900 bg-slate-100 text-[10px] font-bold px-2 py-0.5 rounded uppercase">#{order.id}</span>
                                                    <span className="text-xs text-slate-500 font-medium">{new Date(order.bookingTime).toLocaleString('vi-VN')}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-slate-50/50 rounded-xl p-3 mb-4 border border-slate-100 text-sm">
                                                <div className="mb-2">
                                                    <p className="font-semibold text-slate-900">{order.receiverName || 'Khách vãng lai'}</p>
                                                    <p className="text-slate-500 text-xs mt-0.5">{order.receiverPhone || 'Không có SĐT'}</p>
                                                </div>
                                                {(order.inboundMethod === 'STORE_PICKUP' || order.outboundMethod === 'DELIVERY_TO_HOME') && (
                                                    <div className="mt-2 pt-2 border-t border-slate-100">
                                                        <p className="text-xs text-slate-600 line-clamp-2"><span className="font-semibold text-slate-900">Địa chỉ:</span> {order.deliveryAddress}</p>
                                                    </div>
                                                )}
                                                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-semibold uppercase tracking-wide">
                                                    <div className="bg-white px-2 py-2 rounded-lg border border-slate-200 text-center text-slate-700">
                                                        <span className="text-slate-400 block mb-1">Nhận đồ</span>
                                                        {order.inboundMethod === 'STORE_PICKUP' ? 'Tiệm lấy' : 'Khách mang'}
                                                    </div>
                                                    <div className="bg-white px-2 py-2 rounded-lg border border-slate-200 text-center text-slate-700">
                                                        <span className="text-slate-400 block mb-1">Trả đồ</span>
                                                        {order.outboundMethod === 'DELIVERY_TO_HOME' ? 'Giao tận nơi' : 'Khách ra lấy'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2 mb-4">
                                                {order.items.map(i => (
                                                    <div key={i.id} className="flex justify-between items-center text-sm text-slate-700">
                                                        <span className="font-medium bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-600">{i.quantity} {i.unit}</span>
                                                        <span className="flex-1 px-3 truncate text-xs font-medium">{i.serviceName}</span>
                                                        <span className="font-bold text-slate-900">{formatMoney(i.priceAtBooking * i.quantity)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="mt-auto border-t border-slate-100 pt-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${order.paymentMethod === 'VIETQR' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                                                    {order.paymentMethod === 'VIETQR' ? 'Chuyển khoản' : 'Tiền mặt'}
                                                </span>
                                                <span className="font-bold text-slate-900 text-lg tracking-tight">{formatMoney(order.finalTotalPrice)}</span>
                                            </div>
                                            {renderActionButtons(order)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* -------------------- TAB: SERVICES -------------------- */}
                {mainTab === 'services' && hasShop && (
                    <ServiceManagementTab />
                )}

                {/* -------------------- TAB: MACHINES -------------------- */}
                {mainTab === 'machines' && hasShop && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-fade-in w-full">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Quản lý Máy giặt & Sấy</h2>
                                <p className="text-slate-500 text-sm mt-1">Trạng thái hoạt động của các thiết bị trong tiệm.</p>
                            </div>
                            <button className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-sm">
                                Thêm máy mới
                            </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 opacity-50">
                            {[1,2,3,4].map(m => (
                                <div key={m} className="border border-slate-200 p-6 rounded-xl flex flex-col items-center justify-center bg-slate-50">
                                    <div className="w-10 h-10 rounded-full border-2 border-slate-300 mb-3 flex items-center justify-center">
                                        <div className="w-4 h-4 rounded-full bg-slate-200"></div>
                                    </div>
                                    <span className="text-xs font-semibold text-slate-600">Máy số {m}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* -------------------- TAB: SETTINGS -------------------- */}
                {mainTab === 'settings' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-8 animate-fade-in max-w-4xl mx-auto w-full">
                        <div className="mb-8 border-b border-slate-100 pb-5">
                            <h2 className="text-xl font-bold text-slate-900">{hasShop ? 'Cập nhật Thông tin Tiệm' : 'Thiết lập Tiệm giặt mới'}</h2>
                            <p className="text-slate-500 text-sm mt-1">Quản lý hồ sơ doanh nghiệp, địa chỉ và thông tin liên hệ của bạn.</p>
                        </div>
                        
                        <form onSubmit={handleSaveShop} className="space-y-8">
                            
                            {/* Section 1: Business Info */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center">
                                    <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs mr-2">1</span>
                                    Thông tin kinh doanh
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tên tiệm giặt *</label>
                                        <input type="text" required value={shopForm.name} onChange={e=>setShopForm({...shopForm, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="VD: Giặt Sấy Nhanh 24/7"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Số điện thoại liên hệ *</label>
                                        <input type="tel" required value={shopForm.phone} onChange={e=>setShopForm({...shopForm, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="VD: 0987654321"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Giờ hoạt động *</label>
                                        <input type="text" required value={shopForm.operatingHours} onChange={e=>setShopForm({...shopForm, operatingHours: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="VD: 07:00 - 21:00"/>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Address & GPS */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center">
                                    <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs mr-2">2</span>
                                    Địa chỉ & Định vị
                                </h3>
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Địa chỉ chi tiết *</label>
                                        <input type="text" required value={shopForm.address} onChange={e=>setShopForm({...shopForm, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="Số nhà, Tên đường, Phường/Xã..."/>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                                        <div className="md:col-span-1">
                                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Vĩ độ (Lat) *</label>
                                            <input type="number" step="any" required value={shopForm.latitude} onChange={e=>setShopForm({...shopForm, latitude: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:bg-white outline-none" />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kinh độ (Lng) *</label>
                                            <input type="number" step="any" required value={shopForm.longitude} onChange={e=>setShopForm({...shopForm, longitude: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:bg-white outline-none" />
                                        </div>
                                        <div className="col-span-2 md:col-span-2">
                                            <button type="button" onClick={handleGetLocation} className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold p-3 rounded-lg text-sm transition-colors flex items-center justify-center h-full">
                                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                                Lấy vị trí hiện tại
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Equipment */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center">
                                    <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs mr-2">3</span>
                                    Quy mô trang thiết bị
                                </h3>
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Số máy giặt *</label>
                                        <input type="number" min="1" required value={shopForm.totalWashers} onChange={e=>setShopForm({...shopForm, totalWashers: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Số máy sấy *</label>
                                        <input type="number" min="0" required value={shopForm.totalDryers} onChange={e=>setShopForm({...shopForm, totalDryers: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100 flex justify-end">
                                <button type="submit" disabled={isSavingShop} className="bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-8 rounded-lg text-sm transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed">
                                    {isSavingShop ? 'Đang lưu...' : (hasShop ? 'Lưu thay đổi' : 'Hoàn tất khởi tạo')}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

            </div>

            <ActualWeightModal 
                orderId={weightModalOrder} 
                isOpen={!!weightModalOrder} 
                onClose={() => setWeightModalOrder(null)} 
                onSuccess={() => { setWeightModalOrder(null); fetchDashboardData(); }}
            />
        </div>
    );
};

export default OwnerDashboardPage;