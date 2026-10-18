import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';

const VIETNAMESE_BANKS = [
    { code: 'MB', name: 'MBBank (Quân Đội)' },
    { code: 'VCB', name: 'Vietcombank' },
    { code: 'TCB', name: 'Techcombank' },
    { code: 'VPB', name: 'VPBank' },
    { code: 'ACB', name: 'ACB (Á Châu)' },
    { code: 'BIDV', name: 'BIDV' },
    { code: 'VBA', name: 'Agribank' },
    { code: 'TPB', name: 'TPBank' },
    { code: 'STB', name: 'Sacombank' },
    { code: 'HDB', name: 'HDBank' },
    { code: 'OCB', name: 'OCB (Phương Đông)' },
    { code: 'VIB', name: 'VIB' },
    { code: 'SHB', name: 'SHB' }
];

const formatMoney = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

const OwnerPayoutTab = () => {
    const [summary, setSummary] = useState(null);
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal Cập nhật Ngân hàng
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);
    const [bankForm, setBankForm] = useState({
        bankName: 'MBBank (Quân Đội)',
        bankAccountNumber: '',
        bankAccountName: ''
    });
    const [isSavingBank, setIsSavingBank] = useState(false);

    // Modal Xem chi tiết đơn
    const [selectedPayout, setSelectedPayout] = useState(null);
    const [ordersList, setOrdersList] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    // Modal Xem ảnh bill
    const [previewImage, setPreviewImage] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [sumRes, listRes] = await Promise.all([
                axiosClient.get('/owner/payouts/summary'),
                axiosClient.get('/owner/payouts')
            ]);
            if (sumRes?.data) {
                setSummary(sumRes.data);
                setBankForm({
                    bankName: sumRes.data.bankName || 'MBBank (Quân Đội)',
                    bankAccountNumber: sumRes.data.bankAccountNumber || '',
                    bankAccountName: sumRes.data.bankAccountName || ''
                });
            }
            if (listRes?.data) {
                setPayouts(Array.isArray(listRes.data) ? listRes.data : []);
            }
        } catch (error) {
            console.error('Error loading payout data:', error);
            toast.error('Không thể tải dữ liệu giải ngân');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveBank = async (e) => {
        e.preventDefault();
        if (!bankForm.bankAccountNumber.trim() || !bankForm.bankAccountName.trim()) {
            toast.error('Vui lòng điền đầy đủ số tài khoản và tên chủ tài khoản');
            return;
        }

        try {
            setIsSavingBank(true);
            const res = await axiosClient.put('/owner/payouts/bank-info', {
                bankName: bankForm.bankName,
                bankAccountNumber: bankForm.bankAccountNumber.trim(),
                bankAccountName: bankForm.bankAccountName.trim().toUpperCase()
            });
            if (res?.success || res?.status === 200 || res?.message) {
                toast.success('Cập nhật tài khoản ngân hàng thành công!');
                setIsBankModalOpen(false);
                await fetchData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi cập nhật tài khoản');
        } finally {
            setIsSavingBank(false);
        }
    };

    const handleOpenBankModal = () => {
        if (summary) {
            setBankForm({
                bankName: summary.bankName || 'MBBank (Quân Đội)',
                bankAccountNumber: summary.bankAccountNumber || '',
                bankAccountName: summary.bankAccountName || ''
            });
        }
        setIsBankModalOpen(true);
    };

    const handleViewOrders = async (payout) => {
        setSelectedPayout(payout);
        setLoadingOrders(true);
        try {
            const res = await axiosClient.get(`/owner/payouts/${payout.id}/orders`);
            if (res.success) {
                setOrdersList(Array.isArray(res.data) ? res.data : []);
            }
        } catch (error) {
            toast.error('Không thể tải danh sách đơn hàng');
        } finally {
            setLoadingOrders(false);
        }
    };

    const isBankConfigured = Boolean(
        summary?.isBankConfigured ||
        summary?.bankConfigured ||
        (summary?.bankAccountNumber && summary.bankAccountNumber.trim() !== '')
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header & Bank Information Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Bank Account Card */}
                <div className="lg:col-span-1 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                                Tài khoản nhận tiền giải ngân
                            </span>
                            <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-700 rounded">TKNH</span>
                        </div>

                        {isBankConfigured ? (
                            <div className="space-y-3">
                                <div>
                                    <span className="text-xs text-slate-400 block">Ngân hàng</span>
                                    <span className="text-base font-bold text-white block">{summary.bankName}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 block">Số tài khoản</span>
                                    <span className="text-xl font-black font-mono tracking-wider text-indigo-200 block">
                                        {summary.bankAccountNumber}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 block">Chủ tài khoản</span>
                                    <span className="text-xs font-bold uppercase text-white block">
                                        {summary.bankAccountName}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="py-4 text-center">
                                <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xl mx-auto mb-2">
                                    
                                </div>
                                <p className="text-xs font-bold text-amber-200 mb-1">Chưa cài đặt tài khoản</p>
                                <p className="text-[11px] text-slate-300 mb-3">
                                    Vui lòng liên kết tài khoản ngân hàng để Admin giải ngân đúng hạn.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleOpenBankModal}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer hover:scale-105 active:scale-95"
                                >
                                    + Thiết lập ngay
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="relative z-10 mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                            {isBankConfigured ? 'Đã liên kết' : 'Chưa có STK'}
                        </span>
                        <button
                            type="button"
                            onClick={handleOpenBankModal}
                            className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-all border border-white/20 cursor-pointer hover:scale-105 active:scale-95"
                        >
                            {isBankConfigured ? 'Thay đổi STK' : 'Thiết lập ngay'}
                        </button>
                    </div>
                </div>

                {/* Financial Summary & Schedule Notice */}
                <div className="lg:col-span-2 flex flex-col justify-between gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                Chờ giải ngân kỳ tới
                            </span>
                            <span className="text-2xl font-black text-indigo-600 block">
                                {formatMoney(summary?.pendingBalance)}
                            </span>
                            <span className="text-[11px] text-slate-400 mt-1 block">
                                Doanh thu VietQR các đơn đã xong
                            </span>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-sm">
                            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block mb-1">
                                Đang xử lý giải ngân
                            </span>
                            <span className="text-2xl font-black text-amber-700 block">
                                {formatMoney(summary?.inProcessingBalance)}
                            </span>
                            <span className="text-[11px] text-amber-600/80 mt-1 block">
                                Đợt hiện tại Admin đang chuyển
                            </span>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                Đã nhận thành công
                            </span>
                            <span className="text-2xl font-black text-emerald-600 block">
                                {formatMoney(summary?.totalSettledBalance)}
                            </span>
                            <span className="text-[11px] text-slate-400 mt-1 block">
                                Tổng tiền đã về tài khoản
                            </span>
                        </div>
                    </div>

                    {/* Schedule Banner */}
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg shrink-0">
                            
                        </div>
                        <div>
                            <h5 className="text-xs font-bold text-indigo-950">
                                Lịch giải ngân định kỳ của Sàn
                            </h5>
                            <p className="text-xs text-indigo-800/80 mt-0.5">
                                Hệ thống tự động chốt và giải ngân doanh thu chuyển khoản VietQR vào <strong>Thứ Hai hàng tuần</strong>.
                                {summary?.nextScheduledPayoutDate && (
                                    <span> Đợt tiếp theo dự kiến: <strong>{new Date(summary.nextScheduledPayoutDate).toLocaleDateString('vi-VN')}</strong>.</span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payout History Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h4 className="font-bold text-slate-900 text-sm">Lịch Sử Các Đợt Giải Ngân</h4>
                        <p className="text-xs text-slate-400 mt-0.5">Theo dõi chi tiết các đợt đối soát tiền chuyển khoản VietQR của tiệm.</p>
                    </div>
                    <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                        {payouts.length} đợt
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[750px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <th className="p-4 pl-6">Mã đợt</th>
                                <th className="p-4">Kỳ đối soát</th>
                                <th className="p-4 text-center">Số lượng đơn</th>
                                <th className="p-4 text-right">Tổng tiền khách trả</th>
                                <th className="p-4 text-right">Phí sàn ({5}%)</th>
                                <th className="p-4 text-right">Thực nhận</th>
                                <th className="p-4 text-center">Trạng thái</th>
                                <th className="p-4 pr-6 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="p-10 text-center text-slate-400">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                            <span>Đang tải lịch sử giải ngân...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : payouts.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="p-10 text-center text-slate-400">
                                        Chưa có đợt giải ngân nào. Khi có đơn hoàn thành bằng VietQR, hệ thống sẽ tự động chốt đợt vào thứ Hai.
                                    </td>
                                </tr>
                            ) : (
                                payouts.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="p-4 pl-6 font-bold text-slate-900">
                                            #PO-{p.id}
                                        </td>
                                        <td className="p-4">
                                            <span className="font-semibold text-slate-800 block">{p.periodStart} → {p.periodEnd}</span>
                                            {p.paidAt && (
                                                <span className="text-[10px] text-slate-400 block">
                                                    Thanh toán: {new Date(p.paidAt).toLocaleString('vi-VN')}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => handleViewOrders(p)}
                                                className="font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-all"
                                            >
                                                {p.totalOrders} đơn
                                            </button>
                                        </td>
                                        <td className="p-4 text-right font-medium text-slate-700">
                                            {formatMoney(p.grossAmount)}
                                        </td>
                                        <td className="p-4 text-right text-rose-600 font-medium">
                                            -{formatMoney(p.platformFeeAmount)}
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="font-bold text-sm text-emerald-600">
                                                {formatMoney(p.netPayoutAmount)}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            {p.status === 'PENDING' && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                                                    Đang xử lý
                                                </span>
                                            )}
                                            {p.status === 'COMPLETED' && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                                                    Đã nhận tiền
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
                                                {p.proofImageUrl && (
                                                    <button
                                                        onClick={() => setPreviewImage(p.proofImageUrl)}
                                                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition-all flex items-center gap-1"
                                                    >
                                                        <span>Biên lai</span>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleViewOrders(p)}
                                                    className="px-2.5 py-1 text-indigo-600 hover:bg-indigo-50 rounded-lg font-bold text-xs transition-all"
                                                >
                                                    Chi tiết
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL 1: CẬP NHẬT TÀI KHOẢN NGÂN HÀNG */}
            {isBankModalOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
                        <button
                            type="button"
                            onClick={() => setIsBankModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 text-lg cursor-pointer"
                        >
                            ✕
                        </button>

                        <h4 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                            <span>Cài Đặt Tài Khoản Ngân Hàng</span>
                        </h4>
                        <p className="text-xs text-slate-500 mb-5">
                            Thông tin này sẽ được dùng để Admin giải ngân doanh thu định kỳ về tài khoản của bạn.
                        </p>

                        <form onSubmit={handleSaveBank} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Ngân hàng thụ hưởng:
                                </label>
                                <select
                                    value={bankForm.bankName}
                                    onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                    required
                                >
                                    {VIETNAMESE_BANKS.map(b => (
                                        <option key={b.code} value={b.name}>{b.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Số tài khoản ngân hàng:
                                </label>
                                <input
                                    type="text"
                                    placeholder="Nhập số tài khoản..."
                                    value={bankForm.bankAccountNumber}
                                    onChange={e => setBankForm({ ...bankForm, bankAccountNumber: e.target.value })}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 tracking-wider"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Tên chủ tài khoản:
                                </label>
                                <input
                                    type="text"
                                    placeholder="VD: NGUYEN VAN A (Viết hoa không dấu)"
                                    value={bankForm.bankAccountName}
                                    onChange={e => setBankForm({ ...bankForm, bankAccountName: e.target.value.toUpperCase() })}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsBankModalOpen(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingBank}
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                                >
                                    {isSavingBank && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                    Lưu tài khoản
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL 2: XEM BẢNG KÊ ĐƠN HÀNG */}
            {selectedPayout && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 relative max-h-[90vh] flex flex-col">
                        <button
                            type="button"
                            onClick={() => setSelectedPayout(null)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 text-lg cursor-pointer"
                        >
                            ✕
                        </button>

                        <h4 className="text-lg font-bold text-slate-900 mb-1">
                            Bảng Kê Đơn Hàng Kỳ #{selectedPayout.id}
                        </h4>
                        <p className="text-xs text-slate-500 mb-4">
                            Thời gian: {selectedPayout.periodStart} → {selectedPayout.periodEnd} • Tổng cộng {selectedPayout.totalOrders} đơn hàng
                        </p>

                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
                            {loadingOrders ? (
                                <div className="py-12 text-center text-slate-400">
                                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                    <span>Đang tải danh sách đơn hàng...</span>
                                </div>
                            ) : ordersList.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 text-xs">
                                    Không có đơn hàng nào trong đợt này.
                                </div>
                            ) : (
                                ordersList.map(order => (
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
                                            <span className="text-[10px] text-emerald-600 font-medium">Đã thanh toán</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-600">Thực nhận sau phí sàn:</span>
                            <span className="font-black text-emerald-600 text-base">{formatMoney(selectedPayout.netPayoutAmount)}</span>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* PREVIEW BIÊN LAI */}
            {previewImage && createPortal(
                <div
                    className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-w-xl max-h-[90vh]">
                        <img src={previewImage} alt="Preview biên lai" className="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl" />
                        <button
                            type="button"
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

export default OwnerPayoutTab;
