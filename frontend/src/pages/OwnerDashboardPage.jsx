import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import NotificationBell from '../components/NotificationBell';
import UserProfile from '../components/UserProfile';
import ServiceManagementTab from '../components/ServiceManagementTab';
import PosOrderModal from '../components/PosOrderModal';
import OrderDetailModal from '../components/OrderDetailModal';
import InspectOrderModal from '../components/InspectOrderModal';
import CancelOrderModal from '../components/CancelOrderModal';
import ChatModal from '../components/ChatModal';
import StatisticsTab from '../components/StatisticsTab';
import VoucherTab from '../components/VoucherTab';
import LocationPickerMap from '../components/LocationPickerMap';
import { useWebSocket } from '../context/WebSocketContext';
import toast from 'react-hot-toast';

const OwnerDashboardPage = () => {
    const [shopData, setShopData] = useState(null);
    const [hasShop, setHasShop] = useState(false);
    const [mainTab, setMainTab] = useState('statistics'); // 'statistics', 'orders', 'services', 'machines', 'settings'
    const { notification } = useWebSocket();

    // Orders State
    const [orders, setOrders] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [summary, setSummary] = useState({ pendingCount: 0, processingCount: 0, readyCount: 0, completedCount: 0, totalRevenue: 0 });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ALL');
    const [isPosModalOpen, setIsPosModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [inspectOrder, setInspectOrder] = useState(null);
    const [cancelOrderId, setCancelOrderId] = useState(null);
    const [chatOrder, setChatOrder] = useState(null);
    
    // Settings Form State
    const [isSavingShop, setIsSavingShop] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [shopForm, setShopForm] = useState({
        name: '', phone: '', operatingHours: '07:00 - 21:00',
        address: '', latitude: 0, longitude: 0,
        totalWashers: 1, totalDryers: 0,
        baseShippingFee: 15000,
        extraShippingFeePerKm: 5000,
        maxDeliveryDistance: 10,
        coverImage: '',
        galleryImages: []
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
                        totalDryers: shopRes.data.totalDryers || 0,
                        baseShippingFee: shopRes.data.baseShippingFee || 15000,
                        extraShippingFeePerKm: shopRes.data.extraShippingFeePerKm || 5000,
                        maxDeliveryDistance: shopRes.data.maxDeliveryDistance || 10,
                        coverImage: shopRes.data.coverImage || '',
                        galleryImages: shopRes.data.galleryImages || []
                    });

                    // Fetch orders and summary only if shop exists
                    const summaryRes = await axiosClient.get('/owner/orders/summary');
                    if (summaryRes.success) setSummary(summaryRes.data);
                    
                    await fetchOrders(0, false, activeTab);
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

    const fetchOrders = async (pageNum = 0, append = false, currentActiveTab = activeTab) => {
        try {
            if (append) setLoadingMore(true);

            let url = `/owner/orders?page=${pageNum}&size=10`;
            if (currentActiveTab !== 'ALL') {
                let statuses = [];
                if (currentActiveTab === 'PENDING') statuses = ['PENDING'];
                else if (currentActiveTab === 'PICKING_UP') statuses = ['PICKING_UP'];
                else if (currentActiveTab === 'WASHING') statuses = ['RECEIVED', 'PROCESSING'];
                else if (currentActiveTab === 'LOGISTICS') statuses = ['READY', 'DELIVERING'];
                else if (currentActiveTab === 'COMPLETED') statuses = ['COMPLETED'];
                else if (currentActiveTab === 'CANCELLED') statuses = ['CANCELLED'];
                
                if (statuses.length > 0) {
                    url += `&statuses=${statuses.join(',')}`;
                }
            }

            const ordersRes = await axiosClient.get(url);
            if (ordersRes.success) {
                if (append) {
                    setOrders(prev => {
                        const existingIds = new Set(prev.map(o => o.id));
                        const newOrders = ordersRes.data.content.filter(o => !existingIds.has(o.id));
                        return [...prev, ...newOrders];
                    });
                } else {
                    setOrders(ordersRes.data.content);
                }
                setTotalPages(ordersRes.data.totalPages);
                setPage(pageNum);
            }
        } catch (err) {
            console.error(err);
        } finally {
            if (append) setLoadingMore(false);
        }
    };

    useEffect(() => { 
        fetchDashboardData(); 
    }, []);
    
    // Auto refresh when receiving a new order notification
    useEffect(() => {
        if (notification && notification.title === "Đơn hàng mới") {
            fetchDashboardData();
        }
    }, [notification]);

    useEffect(() => {
        if (selectedOrder && orders.length > 0) {
            const updated = orders.find(o => o.id === selectedOrder.id);
            if (updated && JSON.stringify(updated) !== JSON.stringify(selectedOrder)) {
                setSelectedOrder(updated);
            }
        }
    }, [orders]);

    const handlePosSuccess = () => {
        setIsPosModalOpen(false);
        setSelectedOrder(null);
        setMainTab('orders');
        handleTabChange('ALL');
        fetchDashboardData();
    };

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
                toast.success(hasShop ? "Cập nhật thành công!" : "Tạo tiệm thành công!");
                fetchDashboardData();
            } else {
                toast.error(res.message || "Lỗi lưu thông tin");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi kết nối khi lưu");
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
                (error) => toast.error("Không thể lấy vị trí: " + error.message)
            );
        } else {
            toast("Trình duyệt của bạn không hỗ trợ Geolocation.");
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, ...).');
            return;
        }

        try {
            setUploadingImage(true);
            const formData = new FormData();
            formData.append('file', file);
            
            // Lấy từ biến môi trường Vite (.env)
            const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'laundry_hub_preset'; 
            const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dexample'; 
            
            if (cloudName === 'dexample') {
                 toast.error('Vui lòng tạo file .env trong thư mục frontend và thêm VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET của bạn.');
                 setUploadingImage(false);
                 return;
            }

            formData.append('upload_preset', uploadPreset); 

            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            
            if (data.secure_url) {
                setShopForm(prev => ({ ...prev, coverImage: data.secure_url }));
            } else {
                console.error("Cloudinary Error:", data);
                toast.error(`Lỗi Cloudinary: ${data.error?.message || 'Không rõ nguyên nhân'}`);
            }
        } catch (error) {
            console.error('Lỗi upload ảnh:', error);
            toast.error('Đã xảy ra lỗi khi tải ảnh lên. Vui lòng kiểm tra mạng hoặc cấu hình Cloudinary.');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleGalleryUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        try {
            setUploadingImage(true);
            const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'laundry_hub_preset'; 
            const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dexample'; 
            
            if (cloudName === 'dexample') {
                 toast.error('Vui lòng cấu hình VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET trong file .env');
                 setUploadingImage(false); return;
            }

            const uploadedUrls = [];
            for (const file of files) {
                if (!file.type.startsWith('image/')) continue;
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', uploadPreset); 
                
                const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                    method: 'POST', body: formData,
                });
                const data = await response.json();
                if (data.secure_url) uploadedUrls.push(data.secure_url);
            }
            
            setShopForm(prev => ({ ...prev, galleryImages: [...prev.galleryImages, ...uploadedUrls] }));
        } catch (error) {
            console.error('Lỗi upload ảnh thư viện:', error);
            toast.error('Đã xảy ra lỗi khi tải ảnh lên.');
        } finally {
            setUploadingImage(false);
        }
    };

    const removeGalleryImage = (indexToRemove) => {
        setShopForm(prev => ({
            ...prev,
            galleryImages: prev.galleryImages.filter((_, idx) => idx !== indexToRemove)
        }));
    };

    const updateStatus = async (orderId, newStatus, reason = null) => {
        try {
            const res = await axiosClient.put(`/owner/orders/${orderId}/status`, { newStatus, cancelReason: reason });
            if (res.success) {
                if (selectedOrder && selectedOrder.id === orderId) {
                    setSelectedOrder({ ...selectedOrder, status: newStatus });
                }
                fetchDashboardData();
            } else {
                toast.error(res.message || "Có lỗi xảy ra");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi kết nối khi cập nhật trạng thái");
        }
    };

    const formatMoney = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

    const filteredOrders = orders;

    const tabs = [
        { id: 'ALL', label: 'Tất cả' },
        { id: 'PENDING', label: 'Chờ duyệt' },
        { id: 'PICKING_UP', label: 'Đang đi lấy' },
        { id: 'WASHING', label: 'Đang giặt' },
        { id: 'LOGISTICS', label: 'Chờ giao/lấy' },
        { id: 'COMPLETED', label: 'Hoàn thành' },
        { id: 'CANCELLED', label: 'Đã hủy' }
    ];

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        fetchOrders(0, false, tabId);
    };

    const renderActionButtons = (order, isTableMode = false, isModalMode = false) => {
        const { id, status, inboundType, outboundType } = order;
        
        let btnBaseClass = "font-semibold transition-all flex items-center justify-center";
        
        if (isTableMode) {
            btnBaseClass += " whitespace-nowrap text-[11px] py-1.5 px-3 rounded-md shadow-sm";
        } else if (isModalMode) {
            btnBaseClass += " w-full text-xs py-2.5 px-6 rounded-xl shadow-sm";
        } else {
            btnBaseClass += " w-full mt-4 text-xs py-2.5 px-3 rounded-xl shadow-sm";
        }
        
        let actions = null;

        if (status === 'PENDING') {
            actions = (
                <div className={`flex items-center ${isTableMode ? 'gap-2' : 'gap-3 w-full'}`}>
                    <button onClick={() => updateStatus(id, 'CONFIRMED')} className={`${btnBaseClass} bg-slate-900 text-white hover:bg-slate-800`}>Nhận đơn</button>
                    <button onClick={() => setCancelOrderId(id)} className={`${isTableMode ? 'text-rose-600 text-xs hover:underline' : btnBaseClass + ' bg-rose-50 text-rose-700 hover:bg-rose-100'}`}>Từ chối</button>
                </div>
            );
        } else if (status === 'CONFIRMED') {
            if (inboundType === 'SHOP_PICK_UP') {
                actions = <button onClick={() => updateStatus(id, 'PICKING_UP')} className={`${btnBaseClass} bg-slate-800 text-white hover:bg-slate-900`}>Đi lấy đồ</button>;
            } else if (inboundType === 'CUSTOMER_DROP_OFF') {
                actions = <button onClick={() => updateStatus(id, 'RECEIVED')} className={`${btnBaseClass} bg-slate-800 text-white hover:bg-slate-900`}>Đã nhận đồ</button>;
            }
        } else if (status === 'PICKING_UP') {
            actions = <button onClick={() => updateStatus(id, 'RECEIVED')} className={`${btnBaseClass} bg-slate-800 text-white hover:bg-slate-900`}>Đã mang về tiệm</button>;
        } else if (status === 'RECEIVED') {
            if (isTableMode) {
                // In table mode, maybe just a direct button to open modal or process
                actions = <button onClick={() => setSelectedOrder(order)} className={`${btnBaseClass} bg-indigo-600 text-white hover:bg-indigo-700`}>Kiểm tra & Giặt</button>;
            } else {
                // In modal mode, it acts as the primary "Tiến hành giặt"
                actions = <button onClick={() => updateStatus(id, 'PROCESSING')} className={`${btnBaseClass} bg-indigo-600 text-white hover:bg-indigo-700`}>Bắt đầu giặt</button>;
            }
        } else if (status === 'PROCESSING') {
            actions = <button onClick={() => updateStatus(id, 'READY')} className={`${btnBaseClass} bg-sky-600 text-white hover:bg-sky-700`}>Đã giặt xong</button>;
        } else if (status === 'READY') {
            if (outboundType === 'SHOP_DELIVERY') {
                actions = <button onClick={() => updateStatus(id, 'DELIVERING')} className={`${btnBaseClass} bg-slate-800 text-white hover:bg-slate-900`}>Đi giao hàng</button>;
            } else if (outboundType === 'CUSTOMER_PICK_UP') {
                actions = <button onClick={() => updateStatus(id, 'COMPLETED')} className={`${btnBaseClass} bg-emerald-600 text-white hover:bg-emerald-700`}>Khách đã lấy & Thu tiền</button>;
            }
        } else if (status === 'DELIVERING') {
            actions = <button onClick={() => updateStatus(id, 'COMPLETED')} className={`${btnBaseClass} bg-emerald-600 text-white hover:bg-emerald-700`}>Giao xong & Thu tiền</button>;
        }

        if (isTableMode) {
            return (
                <div className="flex items-center gap-2 justify-end w-full">
                    {actions}
                    <button 
                        onClick={() => setChatOrder(order)}
                        className="flex items-center gap-1.5 text-teal-600 hover:text-teal-800 text-xs font-semibold px-2 py-1 transition-colors hover:bg-teal-50 rounded"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        Chat
                    </button>
                    <button 
                        onClick={() => setSelectedOrder(order)}
                        className="text-slate-600 hover:text-slate-900 text-xs font-semibold px-2 py-1 transition-colors underline-offset-2 hover:underline"
                    >
                        Chi tiết
                    </button>
                </div>
            );
        }

        return actions;
    };

    const getStatusStyle = (status) => {
        const styles = {
            'PENDING': 'bg-amber-100 text-amber-800 border-amber-200',
            'CONFIRMED': 'bg-blue-100 text-blue-800 border-blue-200',
            'PICKING_UP': 'bg-purple-100 text-purple-800 border-purple-200',
            'RECEIVED': 'bg-indigo-100 text-indigo-800 border-indigo-200',
            'PROCESSING': 'bg-sky-100 text-sky-800 border-sky-200',
            'READY': 'bg-teal-100 text-teal-800 border-teal-200',
            'DELIVERING': 'bg-orange-100 text-orange-800 border-orange-200',
            'COMPLETED': 'bg-emerald-100 text-emerald-800 border-emerald-200',
            'CANCELLED': 'bg-rose-100 text-rose-800 border-rose-200'
        };
        return styles[status] || 'bg-slate-100 text-slate-800 border-slate-200';
    };

    const getStatusText = (status) => {
        const textMap = {
            'PENDING': 'Chờ Xác Nhận',
            'CONFIRMED': 'Đã Xác Nhận',
            'PICKING_UP': 'Đang Đi Lấy',
            'RECEIVED': 'Đã Nhận Đồ',
            'PROCESSING': 'Đang Giặt',
            'READY': 'Chờ Giao',
            'DELIVERING': 'Đang Giao',
            'COMPLETED': 'Hoàn Thành',
            'CANCELLED': 'Đã Hủy'
        };
        return textMap[status] || status;
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
            toast.error("Vui lòng hoàn tất Thông tin Tiệm trước khi sử dụng các tính năng này.");
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
            <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 shadow-[0_4px_30px_rgba(0,0,0,0.02)] pt-4 px-4 sm:px-6 lg:px-8 mb-0 sticky top-0 z-40 transition-all">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                    <div className="flex items-center space-x-3 flex-1 min-w-0 w-full">
                        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-2 rounded-xl shadow-inner shadow-indigo-300 mr-1 hidden sm:block shrink-0">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 truncate" title={hasShop ? shopData.name : 'Khởi tạo Tiệm Giặt'}>
                            {hasShop ? shopData.name : 'Khởi tạo Tiệm Giặt'}
                        </h1>
                        {hasShop && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 uppercase tracking-wide shrink-0 hidden sm:inline-block">
                                Đang mở cửa
                            </span>
                        )}
                    </div>
                    
                    <div className="flex items-center space-x-4 self-end md:self-auto shrink-0 justify-end">
                        <button 
                            onClick={() => setIsPosModalOpen(true)}
                            disabled={!hasShop}
                            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Tạo đơn tại quầy
                        </button>
                        
                        <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
                        
                        <NotificationBell />
                        <UserProfile />
                    </div>
                </div>

                <div className="max-w-6xl mx-auto flex space-x-2 overflow-x-auto custom-scrollbar pb-0">
                    {[
                        { id: 'statistics', label: 'Thống kê' },
                        { id: 'orders', label: 'Đơn hàng' },
                        { id: 'vouchers', label: 'Mã Giảm Giá' },
                        { id: 'services', label: 'Dịch vụ & Bảng giá' },
                        { id: 'machines', label: 'Máy giặt & Sấy' },
                        { id: 'settings', label: 'Thông tin Tiệm' }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => handleTabClick(t.id)}
                            className={`pb-3 px-3 text-sm whitespace-nowrap transition-all duration-300 relative ${
                                mainTab === t.id 
                                ? 'text-indigo-700 font-bold' 
                                : 'text-slate-500 hover:text-slate-900 font-medium'
                            } ${!hasShop && t.id !== 'settings' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {t.label}
                            {mainTab === t.id && (
                                <div className="absolute bottom-0 left-0 w-full h-[3px] bg-indigo-600 rounded-t-full"></div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-8 min-w-0">
                
                {/* -------------------- TAB: STATISTICS -------------------- */}
                {mainTab === 'statistics' && hasShop && (
                    <div className="animate-fade-in">
                        <StatisticsTab />
                    </div>
                )}

                {/* -------------------- TAB: VOUCHERS -------------------- */}
                {mainTab === 'vouchers' && hasShop && (
                    <div className="animate-fade-in">
                        <VoucherTab />
                    </div>
                )}

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
                                        onClick={() => handleTabChange(tab.id)}
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
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                            <th className="p-4 whitespace-nowrap">Đơn Hàng</th>
                                            <th className="p-4">Khách Hàng</th>
                                            <th className="p-4 text-right">Tổng Tiền</th>
                                            <th className="p-4 text-center">Trạng Thái</th>
                                            <th className="p-4 text-center">Hành Động</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {filteredOrders.map(order => (
                                            <tr key={order.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0">
                                                <td className="p-4 align-middle whitespace-nowrap">
                                                    <span className="font-bold text-slate-900 bg-slate-100 inline-block px-2 py-0.5 rounded text-xs mr-2">#{order.id}</span>
                                                    <span className="text-[11px] font-medium text-slate-500">{new Date(order.bookingTime).toLocaleString('vi-VN')}</span>
                                                </td>
                                                <td className="p-4 align-middle whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900">{order.receiverName || 'Khách vãng lai'}</span>
                                                        <span className="text-xs text-slate-500">({order.receiverPhone || '--'})</span>
                                                        <div className="flex items-center gap-1.5 mt-2">
                                                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                                {order.inboundType === 'CUSTOMER_DROP_OFF' ? 'Nhận: Khách mang tới' : 'Nhận: Tiệm đi lấy'}
                                                            </span>
                                                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                                {order.outboundType === 'CUSTOMER_PICK_UP' ? 'Trả: Khách tự lấy' : 'Trả: Tiệm đi giao'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 align-middle text-right whitespace-nowrap">
                                                    <span className="font-bold text-slate-900 text-[14px]">{formatMoney(order.finalTotalPrice)}</span>
                                                    {order.paymentStatus === 'PAID' && (
                                                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md inline-block border bg-emerald-50 border-emerald-200 text-emerald-700">
                                                            Đã Thanh Toán
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 align-middle text-center whitespace-nowrap">
                                                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${getStatusStyle(order.status)}`}>
                                                        {getStatusText(order.status)}
                                                    </span>
                                                </td>
                                                <td className="p-4 align-middle whitespace-nowrap">
                                                    {renderActionButtons(order, true)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                
                                {page < totalPages - 1 && (
                                    <div className="flex justify-center p-4 border-t border-slate-100">
                                        <button
                                            onClick={() => fetchOrders(page + 1, true, activeTab)}
                                            disabled={loadingMore}
                                            className="bg-white border border-slate-200 text-slate-700 font-semibold py-2 px-6 rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50"
                                        >
                                            {loadingMore ? 'Đang tải...' : 'Xem thêm đơn hàng'}
                                        </button>
                                    </div>
                                )}
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
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ảnh Bìa (Tải lên) *</label>
                                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl bg-slate-50 relative overflow-hidden group">
                                            {shopForm.coverImage && !uploadingImage ? (
                                                <>
                                                    <img src={shopForm.coverImage} alt="Cover Preview" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                                                    <div className="relative z-10 flex flex-col items-center justify-center bg-white/80 p-4 rounded-xl shadow-sm backdrop-blur-sm">
                                                        <svg className="mx-auto h-8 w-8 text-teal-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <p className="text-sm text-slate-700 font-semibold">Đã tải ảnh lên thành công</p>
                                                        <label htmlFor="file-upload" className="mt-2 cursor-pointer bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors">
                                                            Tải ảnh khác
                                                        </label>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="space-y-1 text-center relative z-10">
                                                    {uploadingImage ? (
                                                        <div className="flex flex-col items-center">
                                                            <svg className="animate-spin h-8 w-8 text-indigo-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                            <p className="text-sm text-slate-500 font-medium">Đang tải ảnh lên Cloudinary...</p>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <svg className="mx-auto h-12 w-12 text-slate-300" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                            <div className="flex text-sm text-slate-600 justify-center">
                                                                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-semibold text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 px-1">
                                                                    <span>Tải file lên</span>
                                                                </label>
                                                                <p className="pl-1">hoặc kéo thả vào đây</p>
                                                            </div>
                                                            <p className="text-xs text-slate-500">PNG, JPG, GIF lên tới 10MB</p>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                                        </div>
                                        <input type="hidden" required value={shopForm.coverImage} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Thư viện ảnh (Tùy chọn)</label>
                                        <p className="text-[10px] text-slate-500 mb-3">Tải lên các hình ảnh không gian tiệm, máy móc, hoặc mặt tiền để khách hàng hiểu rõ hơn về tiệm của bạn.</p>
                                        <div className="flex flex-wrap gap-4">
                                            {shopForm.galleryImages.map((imgUrl, idx) => (
                                                <div key={idx} className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 shadow-sm group">
                                                    <img src={imgUrl} alt="Gallery item" className="w-full h-full object-cover" />
                                                    <button 
                                                        type="button"
                                                        onClick={() => removeGalleryImage(idx)}
                                                        className="absolute top-1 right-1 bg-white/90 text-rose-500 hover:text-white rounded-full p-1 hover:bg-rose-600 shadow-sm transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))}
                                            
                                            <label className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 transition-colors text-slate-500 hover:text-indigo-600 group relative">
                                                {uploadingImage ? (
                                                    <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                ) : (
                                                    <>
                                                        <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                                        </svg>
                                                        <span className="text-[10px] font-semibold text-center leading-tight">Thêm ảnh</span>
                                                    </>
                                                )}
                                                <input type="file" multiple accept="image/*" onChange={handleGalleryUpload} className="sr-only" disabled={uploadingImage} />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Address & GPS */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center">
                                    <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs mr-2">2</span>
                                    Địa chỉ & Định vị
                                </h3>
                                <LocationPickerMap 
                                    initialAddress={shopForm.address}
                                    initialLat={shopForm.latitude}
                                    initialLng={shopForm.longitude}
                                    onChange={({ address, latitude, longitude }) => {
                                        setShopForm(prev => ({
                                            ...prev,
                                            address,
                                            latitude,
                                            longitude
                                        }));
                                    }}
                                />
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

                            

                            {/* Section 4: Shipping Config */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center">
                                    <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs mr-2">4</span>
                                    Cấu hình giao nhận
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phí ship 2km đầu tiên (VNĐ) *</label>
                                        <input type="number" min="0" step="5000" required value={shopForm.baseShippingFee} onChange={e=>setShopForm({...shopForm, baseShippingFee: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phí ship mỗi km tiếp theo *</label>
                                        <input type="number" min="0" step="1000" required value={shopForm.extraShippingFeePerKm} onChange={e=>setShopForm({...shopForm, extraShippingFeePerKm: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Bán kính phục vụ tối đa (km) *</label>
                                        <input type="number" min="1" step="0.5" required value={shopForm.maxDeliveryDistance} onChange={e=>setShopForm({...shopForm, maxDeliveryDistance: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
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

            <PosOrderModal
                isOpen={isPosModalOpen}
                onClose={() => setIsPosModalOpen(false)}
                onSuccess={handlePosSuccess}
            />

            <InspectOrderModal 
                isOpen={!!inspectOrder}
                order={inspectOrder}
                onClose={() => setInspectOrder(null)}
                formatMoney={formatMoney}
                onSuccess={() => {
                    setInspectOrder(null);
                    fetchDashboardData();
                }}
            />

            <CancelOrderModal 
                isOpen={!!cancelOrderId}
                orderId={cancelOrderId}
                onClose={() => setCancelOrderId(null)}
                onSubmit={async (reason) => {
                    await updateStatus(cancelOrderId, 'CANCELLED', reason);
                    setCancelOrderId(null);
                }}
            />

            <OrderDetailModal
                isOpen={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                order={selectedOrder}
                formatMoney={formatMoney}
                renderActions={(order) => renderActionButtons(order, false)}
                onUpdateSuccess={() => {
                    fetchDashboardData();
                }}
            />
            {/* Chat Modal */}
            {chatOrder && (
                <ChatModal 
                    isOpen={!!chatOrder}
                    onClose={() => setChatOrder(null)}
                    orderId={chatOrder.id}
                    orderCode={chatOrder.id.toString().padStart(4, '0')}
                    shopName={chatOrder.shopName}
                    customerName={chatOrder.receiverName || chatOrder.customerName || 'Khách hàng'}
                />
            )}
        </div>
    );
};

export default OwnerDashboardPage;