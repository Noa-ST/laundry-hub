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

    useEffect(() => {
        setSearchQuery('');
        fetchData();
    }, [activeTab]);

    useEffect(() => {
        axiosClient.get('/support/admin/unread-count')
            .then(res => {
                if (res?.success) setUnreadSupportCount(res.data);
            })
            .catch(() => {});
    }, []);

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
                const res = await axiosClient.get('/admin/shops?size=100');
                setShops(extractList(res));
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
            (s.address && s.address.toLowerCase().includes(q)) ||
            String(s.id).includes(q)
        );
    });

    const toggleUserStatus = async (id) => {
        try {
            await axiosClient.put(`/admin/users/${id}/toggle-status`);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi cập nhật");
        }
    };

    const toggleShopStatus = async (id) => {
        try {
            await axiosClient.put(`/admin/shops/${id}/toggle-status`);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi cập nhật");
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
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all font-medium flex items-center gap-3 ${activeTab === 'shops' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        Tiệm giặt
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
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="relative w-full sm:w-80">
                                    <input 
                                        type="text"
                                        placeholder={activeTab === 'users' ? "Tìm theo tên, SĐT, vai trò..." : "Tìm theo tên tiệm, chủ tiệm, địa chỉ..."}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                    />
                                    <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <span className="text-xs text-slate-500 font-medium">
                                    Hiển thị {activeTab === 'users' ? filteredUsers.length : filteredShops.length} mục
                                </span>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            {activeTab === 'users' ? (
                                                <>
                                                    <th className="p-4 pl-6">ID</th>
                                                    <th className="p-4">Họ tên</th>
                                                    <th className="p-4">SĐT</th>
                                                    <th className="p-4">Vai trò</th>
                                                    <th className="p-4">Ngày đăng ký</th>
                                                    <th className="p-4 text-center">Trạng thái</th>
                                                    <th className="p-4 text-right pr-6">Hành động</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th className="p-4 pl-6">ID</th>
                                                    <th className="p-4">Tên Tiệm</th>
                                                    <th className="p-4">Chủ Tiệm</th>
                                                    <th className="p-4">Địa chỉ</th>
                                                    <th className="p-4 text-center">Đánh giá</th>
                                                    <th className="p-4 text-center">Trạng thái</th>
                                                    <th className="p-4 text-right pr-6">Hành động</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {activeTab === 'users' ? (
                                            filteredUsers.length === 0 ? (
                                                <tr>
                                                    <td colSpan="7" className="p-12 text-center text-slate-400 text-sm">
                                                        {users.length === 0 ? "Không có dữ liệu người dùng." : "Không tìm thấy người dùng phù hợp với từ khóa tìm kiếm."}
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredUsers.map(u => (
                                                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                                                        <td className="p-4 pl-6 font-medium text-slate-900">#{u.id}</td>
                                                        <td className="p-4 font-medium text-slate-800">{u.fullName}</td>
                                                        <td className="p-4 text-slate-500">{u.phone}</td>
                                                        <td className="p-4">
                                                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${u.role === 'SHOP_OWNER' ? 'bg-amber-100 text-amber-800' : (u.role === 'ADMIN' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800')}`}>
                                                                {u.role}
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
                                                                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${u.isActive ? 'text-rose-600 bg-rose-50 hover:bg-rose-100' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'}`}
                                                                >
                                                                    {u.isActive ? 'Khóa' : 'Mở khóa'}
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )
                                        ) : (
                                            filteredShops.length === 0 ? (
                                                <tr>
                                                    <td colSpan="7" className="p-12 text-center text-slate-400 text-sm">
                                                        {shops.length === 0 ? "Không có dữ liệu tiệm giặt." : "Không tìm thấy tiệm giặt phù hợp với từ khóa tìm kiếm."}
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredShops.map(s => (
                                                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                                                        <td className="p-4 pl-6 font-medium text-slate-900">#{s.id}</td>
                                                        <td className="p-4 font-semibold text-indigo-700">{s.name}</td>
                                                        <td className="p-4">{s.ownerName}</td>
                                                        <td className="p-4 text-slate-500 text-xs truncate max-w-[200px]" title={s.address}>{s.address}</td>
                                                        <td className="p-4 text-center text-xs">
                                                            {s.rating > 0 ? (
                                                                <span className="flex items-center justify-center gap-1">
                                                                    <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                                                                    <span className="font-bold">{s.rating}</span>
                                                                    <span className="text-slate-400">({s.reviewCount})</span>
                                                                </span>
                                                            ) : '-'}
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            {s.isActive ? (
                                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                                    Hoạt động
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                                                    Chờ duyệt / Khóa
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 pr-6 text-right">
                                                            <button 
                                                                onClick={() => toggleShopStatus(s.id)}
                                                                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${s.isActive ? 'text-rose-600 bg-rose-50 hover:bg-rose-100' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'}`}
                                                            >
                                                                {s.isActive ? 'Đình chỉ' : 'Phê duyệt'}
                                                            </button>
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
        </div>
    );
};

export default AdminDashboardPage;
