import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';

const BANK_CODE_MAP = {
    'MBBank': 'MB',
    'MBBank (Quân Đội)': 'MB',
    'Vietcombank': 'VCB',
    'Techcombank': 'TCB',
    'VPBank': 'VPB',
    'ACB': 'ACB',
    'ACB (Á Châu)': 'ACB',
    'BIDV': 'BIDV',
    'Agribank': 'VBA',
    'TPBank': 'TPB',
    'Sacombank': 'STB',
    'HDBank': 'HDB',
    'OCB': 'OCB',
    'OCB (Phương Đông)': 'OCB',
    'VIB': 'VIB',
    'SHB': 'SHB'
};

const getVietQrCode = (bankName) => {
    if (!bankName) return 'MB';
    const cleanName = bankName.split('(')[0].trim();
    return BANK_CODE_MAP[bankName] || BANK_CODE_MAP[cleanName] || cleanName;
};

const formatMoney = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

const AdminPayoutTab = () => {
    const [stats, setStats] = useState(null);
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal Chốt kỳ
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createForm, setCreateForm] = useState({
        periodEnd: new Date().toISOString().split('T')[0],
        platformFeeRate: 5.0
    });
    const [isCreating, setIsCreating] = useState(false);

    // Modal Giải ngân
    const [selectedPayout, setSelectedPayout] = useState(null);
    const [confirmForm, setConfirmForm] = useState({ proofImageUrl: '', note: '' });
    const [selectedProofFile, setSelectedProofFile] = useState(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);

    // Modal Xem chi tiết đơn
    const [ordersPayout, setOrdersPayout] = useState(null);
    const [payoutOrdersList, setPayoutOrdersList] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    useEffect(() => {
        fetchData();
    }, [filterStatus]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, listRes] = await Promise.all([
                axiosClient.get('/admin/payouts/stats'),
                axiosClient.get(`/admin/payouts${filterStatus !== 'ALL' ? `?status=${filterStatus}` : ''}`)
            ]);

            if (statsRes?.data) setStats(statsRes.data);
            if (listRes?.data) setPayouts(Array.isArray(listRes.data) ? listRes.data : []);
        } catch (error) {
            console.error('Error fetching payouts data:', error);
            toast.error('Không thể tải dữ liệu giải ngân');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBatch = async (e) => {
        e.preventDefault();
        try {
            setIsCreating(true);
            const res = await axiosClient.post('/admin/payouts/create-batch', {
                periodEnd: createForm.periodEnd,
                platformFeeRate: parseFloat(createForm.platformFeeRate)
            });
            if (res.success) {
                toast.success(`Đã tạo thành công ${res.data?.length || 0} đợt giải ngân cho các tiệm!`);
                setIsCreateModalOpen(false);
                fetchData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi tạo đợt giải ngân');
        } finally {
            setIsCreating(false);
        }
    };

    const handleOpenConfirmModal = (payout) => {
        setSelectedPayout(payout);
        setConfirmForm({ proofImageUrl: '', note: '' });
        setSelectedProofFile(null);
    };

    const handleConfirmPayout = async () => {
        if (!selectedPayout) return;
        try {
            setIsConfirming(true);
            let finalProofUrl = confirmForm.proofImageUrl;

            // Nếu có upload ảnh từ máy
            if (selectedProofFile) {
                const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
                const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

                if (cloudName && uploadPreset) {
                    const formData = new FormData();
                    formData.append('file', selectedProofFile.file);
                    formData.append('upload_preset', uploadPreset);

                    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                        method: 'POST',
                        body: formData
                    });
                    const uploadData = await uploadRes.json();
                    if (uploadData.secure_url) {
                        finalProofUrl = uploadData.secure_url;
                    }
                }
            }

            const res = await axiosClient.post(`/admin/payouts/${selectedPayout.id}/confirm`, {
                proofImageUrl: finalProofUrl,
                note: confirmForm.note
            });

            if (res.success) {
                toast.success('Xác nhận giải ngân thành công!');
                setSelectedPayout(null);
                fetchData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi xác nhận giải ngân');
        } finally {
            setIsConfirming(false);
        }
    };

    const handleRejectPayout = async (payoutId) => {
        if (!window.confirm('Bạn có chắc muốn hủy đợt giải ngân này? Các đơn hàng sẽ được nhả về trạng thái chờ đối soát.')) return;
        try {
            const res = await axiosClient.post(`/admin/payouts/${payoutId}/reject`, { reason: 'Admin hủy đợt giải ngân' });
            if (res.success) {
                toast.success('Đã hủy đợt giải ngân thành công');
                fetchData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi hủy đợt');
        }
    };

    const handleViewOrders = async (payout) => {
        setOrdersPayout(payout);
        setLoadingOrders(true);
        try {
            const res = await axiosClient.get(`/admin/payouts/${payout.id}/orders`);
            if (res.success) {
                setPayoutOrdersList(Array.isArray(res.data) ? res.data : []);
            }
        } catch (error) {
            toast.error('Không thể tải danh sách đơn hàng');
        } finally {
            setLoadingOrders(false);
        }
    };

    const filteredPayouts = payouts.filter(p => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
            (p.shopName && p.shopName.toLowerCase().includes(q)) ||
            (p.ownerName && p.ownerName.toLowerCase().includes(q)) ||
            (p.bankAccountNumber && p.bankAccountNumber.includes(q)) ||
            String(p.id).includes(q)
        );
    });

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header & Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <span>Đối Soát & Giải Ngân Cho Tiệm</span>
                        <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full">
                            Tự động định kỳ thứ Hai
                        </span>
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Quản lý toàn bộ doanh thu chuyển khoản VietQR Admin thu hộ và thực hiện giải ngân về STK của các tiệm.
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Chốt kỳ đối soát mới
                </button>
            </div>

            {/* Financial KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tiền VietQR Sàn Đang Giữ</span>
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">TK</div>
                    </div>
                    <div className="text-2xl font-black text-slate-900">{formatMoney(stats?.holdingBalance)}</div>
                    <p className="text-xs text-slate-400 mt-1">Từ các đơn hoàn thành chưa vào đợt</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Cần Giải Ngân Đợt Này</span>
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">WAIT</div>
                    </div>
                    <div className="text-2xl font-black text-amber-700">{formatMoney(stats?.pendingPayoutAmount)}</div>
                    <p className="text-xs text-amber-600/80 mt-1">{stats?.pendingBatchesCount || 0} đợt đang chờ thanh toán</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đã Giải Ngân Thành Công</span>
                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <svg className="w-4 h-4 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                    <div className="text-2xl font-black text-emerald-600">{formatMoney(stats?.completedPayoutAmount)}</div>
                    <p className="text-xs text-slate-400 mt-1">Tổng tiền đã chuyển về các tiệm</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hoa Hồng Sàn Đã Thu</span>
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">VND</div>
                    </div>
                    <div className="text-2xl font-black text-indigo-600">{formatMoney(stats?.totalPlatformFee)}</div>
                    <p className="text-xs text-slate-400 mt-1">Lợi nhuận chiết khấu sàn giữ lại</p>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 overflow-x-auto">
                    {[
                        { id: 'ALL', label: 'Tất cả' },
                        { id: 'PENDING', label: 'Chờ giải ngân' },
                        { id: 'COMPLETED', label: 'Đã hoàn tất' },
                        { id: 'REJECTED', label: 'Đã hủy' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterStatus(tab.id)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                filterStatus === tab.id
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="relative w-full sm:w-72">
                    <input
                        type="text"
                        placeholder="Tìm tiệm, chủ tiệm, STK..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* Payouts Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[950px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <th className="p-4 pl-6">Mã / Kỳ đối soát</th>
                                <th className="p-4">Tiệm giặt</th>
                                <th className="p-4">Tài khoản nhận tiền</th>
                                <th className="p-4 text-center">Số đơn</th>
                                <th className="p-4 text-right">Doanh thu</th>
                                <th className="p-4 text-right">Phí sàn</th>
                                <th className="p-4 text-right">Thực nhận</th>
                                <th className="p-4 text-center">Trạng thái</th>
                                <th className="p-4 pr-6 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="p-12 text-center text-slate-400">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                            <span>Đang tải danh sách giải ngân...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredPayouts.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="p-12 text-center text-slate-400">
                                        Chưa có đợt giải ngân nào phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                filteredPayouts.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="p-4 pl-6">
                                            <span className="font-bold text-slate-900 block">#PO-{p.id}</span>
                                            <span className="text-[11px] text-slate-400 block">{p.periodStart} → {p.periodEnd}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-bold text-indigo-700 block">{p.shopName}</span>
                                            <span className="text-[11px] text-slate-500 block">Chủ tiệm: {p.ownerName}</span>
                                        </td>
                                        <td className="p-4">
                                            {p.bankAccountNumber ? (
                                                <div className="text-[11px]">
                                                    <span className="font-bold text-slate-900 block">{p.bankName} - {p.bankAccountNumber}</span>
                                                    <span className="text-slate-500 block uppercase">{p.bankAccountName}</span>
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-semibold border border-amber-200">
                                                    Chưa cài đặt STK
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button 
                                                onClick={() => handleViewOrders(p)}
                                                className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-all"
                                            >
                                                <span>{p.totalOrders} đơn</span>
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                                            </button>
                                        </td>
                                        <td className="p-4 text-right font-medium text-slate-700">
                                            {formatMoney(p.grossAmount)}
                                        </td>
                                        <td className="p-4 text-right text-rose-600 font-medium">
                                            -{formatMoney(p.platformFeeAmount)}
                                            <span className="text-[10px] text-slate-400 block">({p.platformFeeRate}%)</span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="font-bold text-sm text-emerald-600 block">
                                                {formatMoney(p.netPayoutAmount)}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            {p.status === 'PENDING' && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                                                    Chờ giải ngân
                                                </span>
                                            )}
                                            {p.status === 'COMPLETED' && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                                                    Đã giải ngân
                                                </span>
                                            )}
                                            {p.status === 'REJECTED' && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full">
                                                    Đã hủy
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 pr-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {p.status === 'PENDING' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleOpenConfirmModal(p)}
                                                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm transition-all flex items-center gap-1"
                                                        >
                                                            <span>Giải ngân</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectPayout(p.id)}
                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                            title="Hủy đợt giải ngân"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </>
                                                )}
                                                {p.status === 'COMPLETED' && p.proofImageUrl && (
                                                    <button
                                                        onClick={() => setPreviewImage(p.proofImageUrl)}
                                                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition-all flex items-center gap-1"
                                                    >
                                                        <span>Xem bill</span>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL 1: CHỐT KỲ ĐỐI SOÁT THỦ CÔNG */}
            {isCreateModalOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
                        <button
                            onClick={() => setIsCreateModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 text-lg cursor-pointer"
                        >
                            ✕
                        </button>
                        <h4 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                            <span>Chốt Kỳ Đối Soát Mới</span>
                        </h4>
                        <p className="text-xs text-slate-500 mb-5">
                            Gom toàn bộ các đơn hàng VietQR đã hoàn tất để chuẩn bị giải ngân cho các tiệm giặt.
                        </p>

                        <form onSubmit={handleCreateBatch} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Chốt các đơn hoàn thành tính đến ngày:
                                </label>
                                <input
                                    type="date"
                                    value={createForm.periodEnd}
                                    onChange={e => setCreateForm({ ...createForm, periodEnd: e.target.value })}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Tỷ lệ chiết khấu sàn (% hoa hồng):
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        max="50"
                                        value={createForm.platformFeeRate}
                                        onChange={e => setCreateForm({ ...createForm, platformFeeRate: e.target.value })}
                                        className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-8"
                                        required
                                    />
                                    <span className="absolute right-3 top-2.5 text-slate-400 text-sm font-bold">%</span>
                                </div>
                                <span className="text-[11px] text-slate-400 mt-1 block">
                                    Mặc định 5%. Số tiền thực chi cho tiệm = Doanh thu VietQR - Chiết khấu sàn.
                                </span>
                            </div>

                            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-1">
                                <p className="font-bold">Lưu ý đối soát:</p>
                                <p>• Hệ thống chỉ gom đơn đã hoàn thành (`COMPLETED`) và không có khiếu nại đang mở.</p>
                                <p>• Tiệm không có đơn hợp lệ trong kỳ sẽ được bỏ qua tự động.</p>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                                >
                                    Đóng
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                                >
                                    {isCreating && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                    Xác nhận chốt đợt
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL 2: THỰC HIỆN GIẢI NGÂN (QUÉT MÃ VIETQR 1 CHẠM & TẢI BILL) */}
            {selectedPayout && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setSelectedPayout(null)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 text-lg"
                        >
                            ✕
                        </button>

                        <h4 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                            <span>Giải Ngân Cho Tiệm: {selectedPayout.shopName}</span>
                        </h4>
                        <p className="text-xs text-slate-500 mb-4">
                            Đợt đối soát #{selectedPayout.id} ({selectedPayout.periodStart} → {selectedPayout.periodEnd})
                        </p>

                        {/* Thông tin số tiền & Tài khoản */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                                <div>
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Số tiền cần chuyển khoản</span>
                                    <span className="text-2xl font-black text-indigo-700">{formatMoney(selectedPayout.netPayoutAmount)}</span>
                                </div>
                                <div className="text-right text-xs text-slate-500">
                                    <span className="block">Doanh thu: {formatMoney(selectedPayout.grossAmount)}</span>
                                    <span className="block text-rose-600">Phí sàn: -{formatMoney(selectedPayout.platformFeeAmount)}</span>
                                </div>
                            </div>

                            <div className="pt-3 flex flex-col gap-1 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Ngân hàng thụ hưởng:</span>
                                    <span className="font-bold text-slate-900">{selectedPayout.bankName || 'Chưa cập nhật'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Số tài khoản:</span>
                                    <span className="font-bold text-indigo-600 tracking-wider font-mono text-sm">{selectedPayout.bankAccountNumber || 'Chưa cập nhật'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Tên chủ tài khoản:</span>
                                    <span className="font-bold text-slate-900 uppercase">{selectedPayout.bankAccountName || 'Chưa cập nhật'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Mã VietQR 1 chạm */}
                        {selectedPayout.bankAccountNumber ? (
                            <div className="border border-indigo-100 bg-indigo-50/40 rounded-2xl p-4 flex flex-col items-center mb-4">
                                <span className="text-xs font-bold text-indigo-900 mb-2">
                                    Mở ứng dụng ngân hàng quét mã QR để chuyển tiền:
                                </span>
                                <div className="p-2 bg-white rounded-xl shadow-sm border border-indigo-100">
                                    <img
                                        src={`https://img.vietqr.io/image/${getVietQrCode(selectedPayout.bankName)}-${selectedPayout.bankAccountNumber}-compact2.png?amount=${selectedPayout.netPayoutAmount}&addInfo=${encodeURIComponent('GIAI NGAN KY ' + selectedPayout.id + ' ' + selectedPayout.shopName)}&accountName=${encodeURIComponent(selectedPayout.bankAccountName || '')}`}
                                        alt="VietQR Chuyển khoản giải ngân"
                                        className="w-48 h-48 object-contain cursor-pointer hover:opacity-95 transition-opacity"
                                        onClick={() => setPreviewImage(`https://img.vietqr.io/image/${getVietQrCode(selectedPayout.bankName)}-${selectedPayout.bankAccountNumber}-compact2.png?amount=${selectedPayout.netPayoutAmount}&addInfo=${encodeURIComponent('GIAI NGAN KY ' + selectedPayout.id + ' ' + selectedPayout.shopName)}&accountName=${encodeURIComponent(selectedPayout.bankAccountName || '')}`)}
                                        title="Bấm để phóng to mã QR"
                                    />
                                </div>
                                <span className="text-[10px] text-slate-400 mt-2">
                                    Mã QR đã điền sẵn đúng số tiền và nội dung chuyển khoản.
                                </span>
                            </div>
                        ) : (
                            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 mb-4">
                                Chủ tiệm chưa cấu hình số tài khoản ngân hàng. Vui lòng liên hệ chủ tiệm cập nhật trước khi chuyển khoản.
                            </div>
                        )}

                        {/* Tải ảnh biên lai & Ghi chú */}
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Ảnh chụp biên lai chuyển tiền (Minh chứng):
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            setSelectedProofFile({
                                                file,
                                                previewUrl: URL.createObjectURL(file)
                                            });
                                        }
                                    }}
                                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                                />
                                {selectedProofFile && (
                                    <div className="mt-2 relative inline-block">
                                        <img
                                            src={selectedProofFile.previewUrl}
                                            alt="Preview bill"
                                            className="w-20 h-20 object-cover rounded-lg border border-slate-200 cursor-pointer"
                                            onClick={() => setPreviewImage(selectedProofFile.previewUrl)}
                                        />
                                        <button
                                            onClick={() => setSelectedProofFile(null)}
                                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Ghi chú thêm (Tùy chọn):
                                </label>
                                <input
                                    type="text"
                                    placeholder="VD: Đã chuyển khoản qua MBBank lúc 14:30..."
                                    value={confirmForm.note}
                                    onChange={e => setConfirmForm({ ...confirmForm, note: e.target.value })}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-5 mt-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setSelectedPayout(null)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmPayout}
                                disabled={isConfirming}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
                            >
                                {isConfirming && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                Xác nhận đã giải ngân
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL 3: XEM CHI TIẾT DANH SÁCH ĐƠN HÀNG TRONG ĐỢT */}
            {ordersPayout && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 relative max-h-[90vh] flex flex-col">
                        <button
                            onClick={() => setOrdersPayout(null)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 text-lg"
                        >
                            ✕
                        </button>

                        <h4 className="text-lg font-bold text-slate-900 mb-1">
                            Bảng Kê Đơn Hàng #{ordersPayout.id} - {ordersPayout.shopName}
                        </h4>
                        <p className="text-xs text-slate-500 mb-4">
                            Kỳ đối soát: {ordersPayout.periodStart} → {ordersPayout.periodEnd} • Tổng cộng {ordersPayout.totalOrders} đơn hàng
                        </p>

                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
                            {loadingOrders ? (
                                <div className="py-12 text-center text-slate-400">
                                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                    <span>Đang tải danh sách đơn hàng...</span>
                                </div>
                            ) : payoutOrdersList.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 text-xs">
                                    Không có đơn hàng nào trong đợt này.
                                </div>
                            ) : (
                                payoutOrdersList.map(order => (
                                    <div key={order.id} className="py-3 flex items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-900 text-xs">#ORD-{String(order.id).padStart(4, '0')}</span>
                                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                                                    {order.paymentMethod}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                Khách: {order.receiverName} • Ngày: {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-bold text-slate-900 text-xs block">
                                                {formatMoney(order.finalTotalPrice)}
                                            </span>
                                            <span className="text-[10px] text-emerald-600 font-medium">Hoàn tất</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-600">Tổng doanh thu kỳ:</span>
                            <span className="font-black text-indigo-700 text-base">{formatMoney(ordersPayout.grossAmount)}</span>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* PREVIEW IMAGE MODAL */}
            {previewImage && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-w-xl max-h-[90vh]">
                        <img src={previewImage} alt="Preview" className="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl" />
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute -top-3 -right-3 w-8 h-8 bg-white text-slate-900 rounded-full font-bold shadow-lg flex items-center justify-center cursor-pointer"
                        >
                            ✕
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default AdminPayoutTab;
