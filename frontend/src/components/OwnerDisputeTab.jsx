import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import OwnerDisputeModal from './OwnerDisputeModal';
import toast from 'react-hot-toast';

const REASON_MAP = {
    MISSING_ITEM: 'Thiếu đồ',
    DAMAGED_ITEM: 'Rách/Hỏng/Lem màu',
    WRONG_ITEM: 'Giao nhầm đồ',
    POOR_QUALITY: 'Giặt không sạch',
    OTHER: 'Lý do khác'
};

const STATUS_TABS = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'OPEN', label: 'Chờ phản hồi' },
    { key: 'ADMIN_REVIEWING', label: 'Admin can thiệp' },
    { key: 'RESOLVED_REFUNDED', label: 'Đã bồi thường' },
    { key: 'REJECTED', label: 'Đã từ chối' }
];

const STATUS_BADGES = {
    OPEN: { label: 'Chờ phản hồi', class: 'bg-amber-50 text-amber-700 border-amber-200' },
    SHOP_REVIEWING: { label: 'Đang kiểm tra', class: 'bg-blue-50 text-blue-700 border-blue-200' },
    ADMIN_REVIEWING: { label: 'Admin đang xử lý', class: 'bg-purple-50 text-purple-700 border-purple-200' },
    RESOLVED_REFUNDED: { label: 'Đã bồi thường', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    REJECTED: { label: 'Đã từ chối', class: 'bg-rose-50 text-rose-700 border-rose-200' }
};

const OwnerDisputeTab = ({ shopId, targetOrderId, onClearTargetOrder }) => {
    const [disputes, setDisputes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedDispute, setSelectedDispute] = useState(null);

    useEffect(() => {
        if (shopId) {
            setPage(0);
            fetchDisputes(0, activeFilter);
        }
    }, [shopId, activeFilter]);

    useEffect(() => {
        if (targetOrderId && disputes.length > 0) {
            const found = disputes.find(d => String(d.orderId) === String(targetOrderId));
            if (found) {
                setSelectedDispute(found);
                if (onClearTargetOrder) onClearTargetOrder();
            } else if (activeFilter !== 'ALL') {
                setActiveFilter('ALL');
            }
        }
    }, [targetOrderId, disputes, activeFilter, onClearTargetOrder]);

    const fetchDisputes = async (pageNumber = 0, filter = activeFilter) => {
        try {
            setLoading(true);
            const statusParam = filter !== 'ALL' ? `&status=${filter}` : '';
            const res = await axiosClient.get(`/owner/disputes/shops/${shopId}?page=${pageNumber}&size=10${statusParam}`);
            
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
            console.error('Lỗi lấy danh sách khiếu nại của tiệm:', err);
            toast.error('Không thể tải danh sách khiếu nại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header & Filter Tabs */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <div>
                    <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                        Quản Lý Khiếu Nại & Bồi Thường
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Theo dõi và xử lý các phản ánh về sự cố giặt ủi, đồ thất lạc từ phía khách hàng
                    </p>
                </div>

                <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl">
                    {STATUS_TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveFilter(tab.key)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                activeFilter === tab.key
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                    <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <span className="text-xs font-medium">Đang tải danh sách khiếu nại...</span>
                </div>
            ) : disputes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">Không có khiếu nại nào</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                        Hiện tại không có đơn hàng nào phát sinh sự cố trong mục này. Dịch vụ của bạn đang vận hành rất tốt!
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {disputes.map(dispute => {
                        const statusConfig = STATUS_BADGES[dispute.status] || { label: dispute.status, class: 'bg-slate-50' };
                        const isActionable = dispute.status === 'OPEN' || dispute.status === 'SHOP_REVIEWING';

                        return (
                            <div 
                                key={dispute.id}
                                className={`bg-white rounded-2xl border transition-all p-5 shadow-sm hover:shadow-md flex flex-col justify-between ${
                                    isActionable ? 'border-amber-200 ring-1 ring-amber-100' : 'border-slate-200/80'
                                }`}
                            >
                                <div className="space-y-3">
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-slate-900">
                                                    Đơn hàng #{dispute.orderId}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    (Mã KN: #{dispute.id})
                                                </span>
                                            </div>
                                            <p className="text-xs font-semibold text-rose-600 mt-0.5">
                                                {REASON_MAP[dispute.reason] || dispute.reason}
                                            </p>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusConfig.class}`}>
                                            {statusConfig.label}
                                        </span>
                                    </div>

                                    <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1.5 border border-slate-100">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Yêu cầu đền bù:</span>
                                            <strong className="text-slate-900">
                                                {dispute.requestedAmount ? Number(dispute.requestedAmount).toLocaleString('vi-VN') + ' đ' : 'Thương lượng'}
                                            </strong>
                                        </div>
                                        {dispute.acceptedAmount && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Đã chốt bồi thường:</span>
                                                <strong className="text-emerald-600">
                                                    {Number(dispute.acceptedAmount).toLocaleString('vi-VN')} đ
                                                </strong>
                                            </div>
                                        )}
                                        {dispute.description && (
                                            <p className="text-slate-600 line-clamp-2 pt-1 border-t border-slate-200/50 italic text-[11px]">
                                                "{dispute.description}"
                                            </p>
                                        )}
                                    </div>

                                    {dispute.evidenceUrls && dispute.evidenceUrls.length > 0 && (
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] text-slate-400 font-medium">Bằng chứng:</span>
                                            <div className="flex gap-1">
                                                {dispute.evidenceUrls.slice(0, 3).map((url, i) => (
                                                    <img key={i} src={url} alt="Bằng chứng" className="w-7 h-7 object-cover rounded-md border border-slate-200" />
                                                ))}
                                                {dispute.evidenceUrls.length > 3 && (
                                                    <span className="w-7 h-7 bg-slate-100 rounded-md text-[10px] flex items-center justify-center font-bold text-slate-500">
                                                        +{dispute.evidenceUrls.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-[11px] text-slate-400">
                                        {new Date(dispute.createdAt).toLocaleDateString('vi-VN')}
                                    </span>

                                    <button
                                        onClick={() => setSelectedDispute(dispute)}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                                            isActionable
                                                ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-200'
                                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                        }`}
                                    >
                                        {isActionable ? 'Xem & Phản hồi' : 'Chi tiết'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination if multiple pages */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-4">
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

            {/* Owner Modal */}
            <OwnerDisputeModal
                isOpen={!!selectedDispute}
                dispute={selectedDispute}
                onClose={() => setSelectedDispute(null)}
                onSuccess={() => {
                    fetchDisputes(page);
                }}
            />
        </div>
    );
};

export default OwnerDisputeTab;
