import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import UserProfile from '../components/UserProfile';
import NotificationBell from '../components/NotificationBell';
import AdminDisputeTab from '../components/AdminDisputeTab';
import AdminPayoutTab from '../components/AdminPayoutTab';
import AdminSupportTab from '../components/AdminSupportTab';
import toast from 'react-hot-toast';

const AdminDashboardPage = () => {
    const [activeTab, setActiveTab] = useState('stats');
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [unreadSupportCount, setUnreadSupportCount] = useState(0);
    const [pendingShopsCount, setPendingShopsCount] = useState(0);
    const [shopStatusFilter, setShopStatusFilter] = useState('ALL'); // ALL, PENDING_APPROVAL, APPROVED, REJECTED
    const [selectedShopDetail, setSelectedShopDetail] = useState(null);
    const [rejectModalShop, setRejectModalShop] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

    useEffect(() => {
        setSearchQuery('');
        fetchData();
    }, [activeTab, shopStatusFilter]);

    useEffect(() => {
        axiosClient.get('/support/admin/unread-count')
            .then(res => {
                if (res?.success) setUnreadSupportCount(res.data);
            })
            .catch(() => {});
        fetchPendingShopsCount();
    }, []);

    const fetchPendingShopsCount = async () => {
        try {
            const res = await axiosClient.get('/admin/shops/pending-count');
            if (res && res.pendingCount !== undefined) {
                setPendingShopsCount(res.pendingCount);
            }
        } catch {
            // Silently ignore
        }
    };

    const extractList = (res) => {
        if (!res) return [];
        if (Array.isArray(res)) return res;
        if (Array.isArray(res.content)) return res.content;
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.data?.content)) return res.data.content;
        return [];
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'stats') {
                const res = await axiosClient.get('/admin/dashboard-stats');
                const data = res.data ? res.data : res;
                setStats(data);
            } else if (activeTab === 'users') {
                const res = await axiosClient.get('/admin/users?size=100');
                setUsers(extractList(res));
            } else if (activeTab === 'shops') {
                const url = shopStatusFilter !== 'ALL'
                    ? `/admin/shops?size=100&approvalStatus=${shopStatusFilter}`
                    : '/admin/shops?size=100';
                const res = await axiosClient.get(url);
                setShops(extractList(res));
                fetchPendingShopsCount();
            } else if (activeTab === 'disputes' || activeTab === 'payouts' || activeTab === 'support') {
                // Component fetches its own data
                setLoading(false);
            }
        } catch (error) {
            console.error("Lỗi lấy dữ liệu", error);
            toast.error("Không thể tải danh sách dữ liệu.");
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(u => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
            (u.fullName && u.fullName.toLowerCase().includes(q)) ||
            (u.phone && u.phone.includes(q)) ||
            (u.email && u.email.toLowerCase().includes(q)) ||
            (u.role && u.role.toLowerCase().includes(q)) ||
            String(u.id).includes(q)
        );
    });

    const filteredShops = shops.filter(s => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
            (s.name && s.name.toLowerCase().includes(q)) ||
            (s.ownerName && s.ownerName.toLowerCase().includes(q)) ||
            (s.ownerPhone && s.ownerPhone.includes(q)) ||
            (s.phone && s.phone.includes(q)) ||
            (s.address && s.address.toLowerCase().includes(q)) ||
            String(s.id).includes(q)
        );
    });

    const toggleUserStatus = async (id) => {
        try {
            const res = await axiosClient.put(`/admin/users/${id}/toggle-status`);
            toast.success(res?.message || "Cập nhật trạng thái thành công");
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi cập nhật");
        }
    };

    const toggleShopStatus = async (id) => {
        try {
            const res = await axiosClient.put(`/admin/shops/${id}/toggle-status`);
            toast.success(res?.message || "Cập nhật trạng thái thành công");
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi cập nhật");
        }
    };

    const handleApproveShop = async (shopId) => {
        if (!window.confirm("Bạn có chắc chắn muốn phê duyệt tiệm này để lên sàn hoạt động không?")) return;
        setIsSubmittingApproval(true);
        try {
            const res = await axiosClient.put(`/admin/shops/${shopId}/approve`);
            toast.success(res?.message || "Phê duyệt tiệm thành công!");
            if (selectedShopDetail && selectedShopDetail.id === shopId) {
                setSelectedShopDetail(null);
            }
            fetchData();
            fetchPendingShopsCount();
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi phê duyệt tiệm");
        } finally {
            setIsSubmittingApproval(false);
        }
    };

    const handleRejectShop = async () => {
        if (!rejectModalShop) return;
        if (!rejectReason.trim()) {
            toast.error("Vui lòng nhập lý do từ chối để chủ tiệm khắc phục!");
            return;
        }
        setIsSubmittingApproval(true);
        try {
            const res = await axiosClient.put(`/admin/shops/${rejectModalShop.id}/reject`, {
                reason: rejectReason.trim()
            });
            toast.success(res?.message || "Đã từ chối duyệt tiệm!");
            setRejectModalShop(null);
            setRejectReason('');
            if (selectedShopDetail && selectedShopDetail.id === rejectModalShop.id) {
                setSelectedShopDetail(null);
            }
            fetchData();
            fetchPendingShopsCount();
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi khi từ chối tiệm");
        } finally {
            setIsSubmittingApproval(false);
        }
    };

    const formatDateTime = (dt) => {
        if (!dt) return '';
        return new Date(dt).toLocaleString('vi-VN');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            {/* Sidebar */}
            <div className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-20 md:min-h-screen sticky top-0 shrink-0">
                <div className="h-16 flex items-center px-6 bg-slate-950 border-b border-slate-800">
                    <span className="text-white font-extrabold text-xl tracking-tight">Admin<span className="text-indigo-500">Panel</span></span>
                </div>
                <div className="flex-1 py-6 flex flex-col gap-2 px-4">
                    <button 
                        onClick={() => setActiveTab('stats')}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all font-medium flex items-center gap-3 ${activeTab === 'stats' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        Tổng quan
                    </button>
                    <button 
                        onClick={() => setActiveTab('users')}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all font-medium flex items-center gap-3 ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        Người dùng
                    </button>
                    <button 
                        onClick={() => setActiveTab('shops')}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all font-medium flex items-center justify-between ${activeTab === 'shops' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            <span>Tiệm giặt</span>
                        </div>
                        {pendingShopsCount > 0 && (
                            <span className="bg-amber-400 text-slate-900 text-[11px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                                {pendingShopsCount} chờ
                            </span>
                        )}
                    </button>
                    <button 
                        onClick={() => setActiveTab('payouts')}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all font-medium flex items-center gap-3 ${activeTab === 'payouts' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        Đối soát & Giải ngân
                    </button>
                    <button 
                        onClick={() => setActiveTab('disputes')}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all font-medium flex items-center gap-3 ${activeTab === 'disputes' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
                        Tranh chấp & Khiếu nại
                    </button>
                    <button 
                        onClick={() => { setActiveTab('support'); setUnreadSupportCount(0); }}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all font-medium flex items-center justify-between ${activeTab === 'support' ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            <span>Hỗ trợ & CSKH</span>
                        </div>
                        {unreadSupportCount > 0 && (
                            <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                                {unreadSupportCount}
                            </span>
                        )}
                    </button>
                </div>
                <div className="p-4 border-t border-slate-800">
                    <UserProfile hideRole />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
                    <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        {activeTab === 'support' ? (
                            <span>Trung Tâm Hỗ Trợ & CSKH Trực Tuyến</span>
                        ) : activeTab === 'stats' 
                            ? 'Thống kê Tổng quan' 
                            : activeTab === 'users' 
                                ? (
                                    <>
                                        <span>Quản lý Người Dùng</span>
                                        <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold border border-indigo-200">
                                            {users.length}
                                        </span>
                                    </>
                                ) : activeTab === 'shops' ? (
                                    <>
                                        <span>Quản lý Tiệm Giặt</span>
                                        <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold border border-indigo-200">
                                            {shops.length}
                                        </span>
                                    </>
                                ) : activeTab === 'payouts' ? (
                                    <span>Đối Soát & Giải Ngân Doanh Thu Tiệm</span>
                                ) : (
                                    <span>Giải Quyết Tranh Chấp & Khiếu Nại</span>
                                )}
                    </h2>
                    <div className="flex items-center">
                        <NotificationBell />
                    </div>
                </div>

                <div className={`${activeTab === 'support' ? 'p-0 flex-1 flex flex-col overflow-hidden min-w-0' : 'p-8 flex-1 overflow-x-auto'}`}>
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : activeTab === 'support' ? (
                        <AdminSupportTab />
                    ) : activeTab === 'payouts' ? (
                        <AdminPayoutTab />
                    ) : activeTab === 'disputes' ? (
                        <AdminDisputeTab />
                    ) : activeTab === 'stats' ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Tổng Người Dùng</p>
                                        <p className="text-2xl font-bold text-slate-900">{stats?.totalUsers || 0}</p>
                                        <p className="text-xs text-slate-400 mt-1">{stats?.totalCustomers || 0} Khách - {stats?.totalOwners || 0} Tiệm</p>
                                    </div>
                                </div>
                                
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Tiệm Đang Hoạt Động</p>
                                        <p className="text-2xl font-bold text-slate-900">{stats?.activeShops || 0} <span className="text-sm font-normal text-slate-400">/ {stats?.totalShops || 0}</span></p>
                                    </div>
                                </div>
                                
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                                    <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Tổng Đơn Hàng</p>
                                        <p className="text-2xl font-bold text-slate-900">{stats?.totalOrders || 0}</p>
                                        <p className="text-xs text-slate-400 mt-1">{stats?.successfulOrders || 0} thành công</p>
                                    </div>
                                </div>
                                
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                                    <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Tổng Doanh Thu Sàn</p>
                                        <p className="text-2xl font-bold text-slate-900">{(stats?.totalRevenue || 0).toLocaleString()}đ</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                                <h3 className="font-bold text-lg mb-4 text-slate-800">Chào mừng trở lại, Super Admin!</h3>
                                <p className="text-slate-600">Hệ thống đang hoạt động ổn định. Vui lòng chuyển sang các tab "Người dùng" hoặc "Tiệm giặt" để quản lý chi tiết.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Search and Filter toolbar */}
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                                    <div className="relative w-full sm:w-80">
                                        <input 
                                            type="text"
                                            placeholder={activeTab === 'users' ? "Tìm theo tên, email, SĐT, vai trò..." : "Tìm theo tên tiệm, chủ tiệm, SĐT, địa chỉ..."}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                        />
                                        <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>

                                    {activeTab === 'shops' && (
                                        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
                                            <button
                                                onClick={() => setShopStatusFilter('ALL')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                                                    shopStatusFilter === 'ALL'
                                                        ? 'bg-white text-slate-900 shadow-sm'
                                                        : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                            >
                                                Tất cả
                                            </button>
                                            <button
                                                onClick={() => setShopStatusFilter('PENDING_APPROVAL')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                                    shopStatusFilter === 'PENDING_APPROVAL'
                                                        ? 'bg-amber-500 text-white shadow-sm'
                                                        : 'text-amber-700 hover:bg-amber-100/60'
                                                }`}
                                            >
                                                <span>Chờ duyệt</span>
                                                {pendingShopsCount > 0 && (
                                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                                        shopStatusFilter === 'PENDING_APPROVAL'
                                                            ? 'bg-amber-700 text-white'
                                                            : 'bg-amber-200 text-amber-900'
                                                    }`}>
                                                        {pendingShopsCount}
                                                    </span>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => setShopStatusFilter('APPROVED')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                                                    shopStatusFilter === 'APPROVED'
                                                        ? 'bg-emerald-600 text-white shadow-sm'
                                                        : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                            >
                                                Đã duyệt
                                            </button>
                                            <button
                                                onClick={() => setShopStatusFilter('REJECTED')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                                                    shopStatusFilter === 'REJECTED'
                                                        ? 'bg-rose-600 text-white shadow-sm'
                                                        : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                            >
                                                Từ chối
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <span className="text-xs text-slate-500 font-medium whitespace-nowrap self-end lg:self-center">
                                    Hiển thị {activeTab === 'users' ? filteredUsers.length : filteredShops.length} kết quả
                                </span>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <table className="w-full text-left border-collapse min-w-[900px]">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            {activeTab === 'users' ? (
                                                <>
                                                    <th className="p-4 pl-6">ID</th>
                                                    <th className="p-4">Người dùng</th>
                                                    <th className="p-4">Email</th>
                                                    <th className="p-4">SĐT</th>
                                                    <th className="p-4">Vai trò</th>
                                                    <th className="p-4">Ngày đăng ký</th>
                                                    <th className="p-4 text-center">Trạng thái</th>
                                                    <th className="p-4 text-right pr-6">Hành động</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th className="p-4 pl-6">ID</th>
                                                    <th className="p-4">Tiệm giặt</th>
                                                    <th className="p-4">Chủ tiệm</th>
                                                    <th className="p-4">Địa chỉ & Giờ mở</th>
                                                    <th className="p-4 text-center">Thiết bị</th>
                                                    <th className="p-4 text-center">Kiểm duyệt</th>
                                                    <th className="p-4 text-center">Hoạt động</th>
                                                    <th className="p-4 text-right pr-6">Hành động</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {activeTab === 'users' ? (
                                            filteredUsers.length === 0 ? (
                                                <tr>
                                                    <td colSpan="8" className="p-12 text-center text-slate-400 text-sm">
                                                        {users.length === 0 ? "Không có dữ liệu người dùng." : "Không tìm thấy người dùng phù hợp với từ khóa tìm kiếm."}
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredUsers.map(u => (
                                                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                                                        <td className="p-4 pl-6 font-medium text-slate-900">#{u.id}</td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase overflow-hidden shrink-0">
                                                                    {u.avatarUrl ? (
                                                                        <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        (u.fullName || 'U').charAt(0)
                                                                    )}
                                                                </div>
                                                                <span className="font-semibold text-slate-800">{u.fullName || 'Chưa đặt tên'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-slate-500 text-xs">{u.email || '-'}</td>
                                                        <td className="p-4 text-slate-600 font-mono text-xs">{u.phone}</td>
                                                        <td className="p-4">
                                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                                                                u.role === 'SHOP_OWNER' 
                                                                    ? 'bg-amber-100 text-amber-800' 
                                                                    : (u.role === 'ADMIN' ? 'bg-rose-100 text-rose-800' : 'bg-indigo-100 text-indigo-800')
                                                            }`}>
                                                                {u.role === 'SHOP_OWNER' ? 'CHỦ TIỆM' : (u.role === 'ADMIN' ? 'ADMIN' : 'KHÁCH HÀNG')}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-slate-500 text-xs">{formatDateTime(u.createdAt)}</td>
                                                        <td className="p-4 text-center">
                                                            {u.isActive ? (
                                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                                    Hoạt động
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                                                    Bị khóa
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 pr-6 text-right">
                                                            {u.role !== 'ADMIN' && (
                                                                <button 
                                                                    onClick={() => toggleUserStatus(u.id)}
                                                                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                                                                        u.isActive 
                                                                            ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200' 
                                                                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                                                                    }`}
                                                                >
                                                                    {u.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )
                                        ) : (
                                            filteredShops.length === 0 ? (
                                                <tr>
                                                    <td colSpan="8" className="p-12 text-center text-slate-400 text-sm">
                                                        {shops.length === 0 ? "Không có dữ liệu tiệm giặt trong mục này." : "Không tìm thấy tiệm giặt phù hợp với từ khóa tìm kiếm."}
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredShops.map(s => (
                                                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                                                        <td className="p-4 pl-6 font-medium text-slate-900">#{s.id}</td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                {s.coverImage ? (
                                                                    <img 
                                                                        src={s.coverImage} 
                                                                        alt="" 
                                                                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" 
                                                                    />
                                                                ) : (
                                                                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                                                                        TIỆM
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <p className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer" onClick={() => setSelectedShopDetail(s)}>
                                                                        {s.name}
                                                                    </p>
                                                                    <p className="text-xs text-slate-400 font-mono">{s.phone || 'Chưa có SĐT'}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <p className="font-medium text-slate-800">{s.ownerName || 'Chưa cập nhật'}</p>
                                                            <p className="text-xs text-slate-500 font-mono">{s.ownerPhone || '-'}</p>
                                                        </td>
                                                        <td className="p-4 text-xs text-slate-600 max-w-[220px]">
                                                            <p className="truncate font-medium text-slate-700" title={s.address}>{s.address || 'Chưa có địa chỉ'}</p>
                                                            <p className="text-slate-400 mt-0.5">{s.operatingHours || '07:00 - 22:00'}</p>
                                                        </td>
                                                        <td className="p-4 text-center text-xs">
                                                            <div className="inline-flex flex-col gap-0.5 text-[11px] text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                                                                <span>{s.totalWashers || 0} Giặt</span>
                                                                <span>{s.totalDryers || 0} Sấy</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            {s.approvalStatus === 'PENDING_APPROVAL' ? (
                                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                                                                    Chờ duyệt
                                                                </span>
                                                            ) : s.approvalStatus === 'APPROVED' ? (
                                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                                                    <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                                    Đã duyệt
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200" title={s.rejectionReason}>
                                                                    <svg className="w-3 h-3 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                                                    Từ chối
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            {s.isActive ? (
                                                                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                                    Bật
                                                                </span>
                                                            ) : (
                                                                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                                    Tắt
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 pr-6 text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button 
                                                                    onClick={() => setSelectedShopDetail(s)}
                                                                    className="text-xs font-semibold px-2.5 py-1 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                                >
                                                                    Chi tiết
                                                                </button>

                                                                {s.approvalStatus === 'PENDING_APPROVAL' && (
                                                                    <>
                                                                        <button 
                                                                            disabled={isSubmittingApproval}
                                                                            onClick={() => handleApproveShop(s.id)}
                                                                            className="text-xs font-semibold px-2.5 py-1 rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-sm"
                                                                        >
                                                                            Duyệt
                                                                        </button>
                                                                        <button 
                                                                            disabled={isSubmittingApproval}
                                                                            onClick={() => {
                                                                                setRejectModalShop(s);
                                                                                setRejectReason('');
                                                                            }}
                                                                            className="text-xs font-semibold px-2.5 py-1 rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all"
                                                                        >
                                                                            Từ chối
                                                                        </button>
                                                                    </>
                                                                )}

                                                                {s.approvalStatus === 'APPROVED' && (
                                                                    <button 
                                                                        onClick={() => toggleShopStatus(s.id)}
                                                                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                                                                            s.isActive 
                                                                                ? 'text-slate-600 hover:bg-slate-100' 
                                                                                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                                                                        }`}
                                                                    >
                                                                        {s.isActive ? 'Khóa tiệm' : 'Mở lại'}
                                                                    </button>
                                                                )}

                                                                {s.approvalStatus === 'REJECTED' && (
                                                                    <button 
                                                                        disabled={isSubmittingApproval}
                                                                        onClick={() => handleApproveShop(s.id)}
                                                                        className="text-xs font-semibold px-2.5 py-1 rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all"
                                                                    >
                                                                        Duyệt lại
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Chi tiết tiệm giặt */}
            {selectedShopDetail && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
                        <div className="relative h-48 bg-slate-100">
                            {selectedShopDetail.coverImage ? (
                                <img src={selectedShopDetail.coverImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                                    Không có ảnh bìa
                                </div>
                            )}
                            <button 
                                onClick={() => setSelectedShopDetail(null)}
                                className="absolute top-4 right-4 w-9 h-9 bg-slate-900/60 hover:bg-slate-900 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[calc(85vh-12rem)] overflow-y-auto">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">{selectedShopDetail.name}</h3>
                                    <p className="text-sm text-slate-500 mt-0.5">{selectedShopDetail.address}</p>
                                </div>
                                <div>
                                    {selectedShopDetail.approvalStatus === 'PENDING_APPROVAL' ? (
                                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                                            Chờ phê duyệt
                                        </span>
                                    ) : selectedShopDetail.approvalStatus === 'APPROVED' ? (
                                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                                            Đã duyệt
                                        </span>
                                    ) : (
                                        <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                                            Bị từ chối
                                        </span>
                                    )}
                                </div>
                            </div>

                            {selectedShopDetail.rejectionReason && (
                                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                                    <p className="font-bold">Lý do từ chối trước đó:</p>
                                    <p className="mt-0.5">{selectedShopDetail.rejectionReason}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-slate-400 font-medium">Chủ sở hữu</p>
                                    <p className="text-sm font-bold text-slate-800 mt-1">{selectedShopDetail.ownerName || 'Chưa cập nhật'}</p>
                                    <p className="text-slate-500 font-mono mt-0.5">SĐT: {selectedShopDetail.ownerPhone || '-'}</p>
                                </div>
                                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-slate-400 font-medium">Hotline tiệm</p>
                                    <p className="text-sm font-bold text-slate-800 mt-1 font-mono">{selectedShopDetail.phone || 'Chưa có'}</p>
                                    <p className="text-slate-500 mt-0.5">Giờ: {selectedShopDetail.operatingHours || '07:00 - 22:00'}</p>
                                </div>
                                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-slate-400 font-medium">Cơ sở vật chất</p>
                                    <p className="text-sm font-bold text-slate-800 mt-1">{selectedShopDetail.totalWashers || 0} máy giặt, {selectedShopDetail.totalDryers || 0} máy sấy</p>
                                </div>
                                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-slate-400 font-medium">Ngày đăng ký</p>
                                    <p className="text-sm font-bold text-slate-800 mt-1">{formatDateTime(selectedShopDetail.createdAt) || 'Mới đây'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                            <button 
                                onClick={() => setSelectedShopDetail(null)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                Đóng
                            </button>
                            {selectedShopDetail.approvalStatus === 'PENDING_APPROVAL' && (
                                <>
                                    <button 
                                        disabled={isSubmittingApproval}
                                        onClick={() => {
                                            const s = selectedShopDetail;
                                            setSelectedShopDetail(null);
                                            setRejectModalShop(s);
                                            setRejectReason('');
                                        }}
                                        className="px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                                    >
                                        Từ chối tiệm
                                    </button>
                                    <button 
                                        disabled={isSubmittingApproval}
                                        onClick={() => handleApproveShop(selectedShopDetail.id)}
                                        className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
                                    >
                                        Phê duyệt lên sàn
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Lý do từ chối tiệm */}
            {rejectModalShop && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-150 space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900">Từ chối duyệt tiệm</h4>
                                    <p className="text-xs text-slate-500">{rejectModalShop.name}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setRejectModalShop(null)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                Lý do từ chối (Chủ tiệm sẽ nhận được thông báo này):
                            </label>
                            <textarea 
                                rows={4}
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Ví dụ: Hình ảnh biển hiệu hoặc cơ sở tiệm chưa rõ ràng; Địa chỉ chưa chính xác; Thiếu số điện thoại liên hệ..."
                                className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:border-rose-500 focus:outline-none"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-2">
                            <button 
                                onClick={() => setRejectModalShop(null)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                            >
                                Hủy bỏ
                            </button>
                            <button 
                                disabled={isSubmittingApproval || !rejectReason.trim()}
                                onClick={handleRejectShop}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-sm"
                            >
                                Xác nhận từ chối
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboardPage;
