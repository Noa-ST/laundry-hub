import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import AdminDisputeModal from './AdminDisputeModal';
import toast from 'react-hot-toast';

const STATUS_FILTER_OPTIONS = [
    { key: 'ALL', label: 'Tất cả tranh chấp' },
    { key: 'ADMIN_REVIEWING', label: 'Cần Admin xử lý gấp' },
    { key: 'OPEN', label: 'Chờ tiệm duyệt' },
    { key: 'RESOLVED_REFUNDED', label: 'Đã hoàn tiền' },
    { key: 'REJECTED', label: 'Bị từ chối' }
];

const STATUS_BADGES = {
    OPEN: { label: 'Chờ tiệm phản hồi', class: 'bg-amber-50 text-amber-700 border-amber-200' },
    SHOP_REVIEWING: { label: 'Tiệm đang kiểm tra', class: 'bg-blue-50 text-blue-700 border-blue-200' },
    ADMIN_REVIEWING: { label: 'Khách yêu cầu Admin can thiệp', class: 'bg-purple-100 text-purple-800 border-purple-300 font-bold animate-pulse' },
    RESOLVED_REFUNDED: { label: 'Đã bồi thường', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    REJECTED: { label: 'Đã từ chối', class: 'bg-rose-50 text-rose-700 border-rose-200' }
};

const AdminDisputeTab = () => {
    const [disputes, setDisputes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedDispute, setSelectedDispute] = useState(null);

    useEffect(() => {
        setPage(0);
        fetchDisputes(0, filter);
    }, [filter]);

    const fetchDisputes = async (pageNumber = 0, currentFilter = filter) => {
        try {
            setLoading(true);
            const statusParam = currentFilter !== 'ALL' ? `?status=${currentFilter}&page=${pageNumber}&size=15` : `?page=${pageNumber}&size=15`;
            const res = await axiosClient.get(`/admin/disputes${statusParam}`);

            const data = res.data ? res.data : res;
            if (data.content) {
                setDisputes(data.content);
                setTotalPages(data.totalPages || 1);
            } else if (Array.isArray(data)) {
                setDisputes(data);
                setTotalPages(1);
            } else {
                setDisputes([]);
            }
        } catch (err) {
            console.error('Lỗi lấy danh sách tranh chấp phía Admin:', err);
            toast.error('Không thể tải danh sách tranh chấp');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header & Filter Controls */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        Quản Lý & Phán Quyết Tranh Chấp
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Xử lý các đơn khiếu nại bồi thường phát sinh giữa Khách hàng và Chủ tiệm giặt
                    </p>
                </div>

                <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-xl">
                    {STATUS_FILTER_OPTIONS.map(opt => (
                        <button
                            key={opt.key}
                            onClick={() => setFilter(opt.key)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                filter === opt.key
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List Table / Cards */}
            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                    <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <span className="text-xs font-semibold">Đang tải danh sách khiếu nại...</span>
                </div>
            ) : disputes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                    <div className="w-12 h-12 mx-auto rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-3 text-xl">
                        
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">Không có tranh chấp nào</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                        Hiện tại không có tranh chấp nào cần phán quyết trong danh mục này.
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                                    <th className="py-3.5 px-4">Mã Đơn / KN</th>
                                    <th className="py-3.5 px-4">Lý do khiếu nại</th>
                                    <th className="py-3.5 px-4">Đòi bồi thường</th>
                                    <th className="py-3.5 px-4">Trạng thái</th>
                                    <th className="py-3.5 px-4">Thời gian</th>
                                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {disputes.map(item => {
                                    const badge = STATUS_BADGES[item.status] || { label: item.status, class: 'bg-slate-50' };
                                    const isUrgent = item.status === 'ADMIN_REVIEWING';

                                    return (
                                        <tr key={item.id} className={`hover:bg-slate-50/80 transition-colors ${isUrgent ? 'bg-purple-50/30' : ''}`}>
                                            <td className="py-3.5 px-4 font-semibold text-slate-900">
                                                <div>Đơn #{item.orderId}</div>
                                                <div className="text-[10px] text-slate-400">KN #{item.id}</div>
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-800">
                                                <div className="font-bold text-rose-600">{item.reason}</div>
                                                <div className="text-[11px] text-slate-500 truncate max-w-xs">{item.description}</div>
                                            </td>
                                            <td className="py-3.5 px-4 font-bold text-slate-900">
                                                {item.requestedAmount ? Number(item.requestedAmount).toLocaleString('vi-VN') + ' đ' : 'N/A'}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className={`inline-block text-[10px] px-2.5 py-1 rounded-full border ${badge.class}`}>
                                                    {badge.label}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                                                {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <button
                                                    onClick={() => setSelectedDispute(item)}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                                                        isUrgent
                                                            ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200'
                                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                                    }`}
                                                >
                                                    {isUrgent ? 'Phán quyết ngay' : 'Chi tiết'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-2">
                    <button
                        disabled={page === 0}
                        onClick={() => {
                            setPage(p => p - 1);
                            fetchDisputes(page - 1);
                        }}
                        className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg disabled:opacity-50"
                    >
                        Trang trước
                    </button>
                    <span className="text-xs self-center text-slate-500">
                        {page + 1} / {totalPages}
                    </span>
                    <button
                        disabled={page >= totalPages - 1}
                        onClick={() => {
                            setPage(p => p + 1);
                            fetchDisputes(page + 1);
                        }}
                        className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg disabled:opacity-50"
                    >
                        Trang sau
                    </button>
                </div>
            )}

            {/* Admin Dispute Modal */}
            <AdminDisputeModal
                isOpen={!!selectedDispute}
                dispute={selectedDispute}
                onClose={() => setSelectedDispute(null)}
                onSuccess={() => fetchDisputes(page)}
            />
        </div>
    );
};

export default AdminDisputeTab;
