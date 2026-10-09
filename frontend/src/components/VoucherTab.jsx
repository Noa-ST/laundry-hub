import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';

const VoucherTab = () => {
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editVoucher, setEditVoucher] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        code: '',
        discountType: 'PERCENTAGE',
        discountValue: '',
        maxDiscountAmount: '',
        minOrderValue: '',
        startDate: '',
        endDate: '',
        usageLimit: '',
        usageLimitPerUser: '',
        isActive: true
    });

    useEffect(() => {
        fetchVouchers();
    }, []);

    const fetchVouchers = async () => {
        try {
            const res = await axiosClient.get('/owner/vouchers');
            if (res.success) {
                setVouchers(res.data);
            }
        } catch (error) {
            console.error("Lỗi khi tải voucher:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (voucher = null) => {
        if (voucher) {
            setEditVoucher(voucher);
            setFormData({
                ...voucher,
                startDate: voucher.startDate.slice(0, 16),
                endDate: voucher.endDate.slice(0, 16)
            });
        } else {
            setEditVoucher(null);
            setFormData({
                code: '',
                discountType: 'PERCENTAGE',
                discountValue: '',
                maxDiscountAmount: '',
                minOrderValue: '',
                startDate: '',
                endDate: '',
                usageLimit: '',
                usageLimitPerUser: '',
                isActive: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                discountValue: parseFloat(formData.discountValue),
                maxDiscountAmount: formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : null,
                minOrderValue: formData.minOrderValue ? parseFloat(formData.minOrderValue) : null,
                usageLimit: formData.usageLimit ? parseInt(formData.usageLimit, 10) : null,
                usageLimitPerUser: formData.usageLimitPerUser ? parseInt(formData.usageLimitPerUser, 10) : null,
                startDate: formData.startDate + ':00', // Append seconds
                endDate: formData.endDate + ':00'
            };

            if (editVoucher) {
                await axiosClient.put(`/owner/vouchers/${editVoucher.id}`, payload);
            } else {
                await axiosClient.post('/owner/vouchers', payload);
            }
            fetchVouchers();
            setIsModalOpen(false);
            toast.success("Lưu mã giảm giá thành công!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Có lỗi xảy ra");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa mã giảm giá này?")) return;
        try {
            await axiosClient.delete(`/owner/vouchers/${id}`);
            fetchVouchers();
        } catch (error) {
            toast.error("Lỗi khi xóa: " + (error.response?.data?.message || ""));
        }
    };

    const formatMoney = (val) => new Intl.NumberFormat('vi-VN').format(val || 0) + ' đ';

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                    Quản Lý Mã Giảm Giá (Voucher)
                </h2>
                <button 
                    onClick={() => handleOpenModal()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all"
                >
                    + Tạo Mã Mới
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10">Đang tải...</div>
            ) : vouchers.length === 0 ? (
                <div className="bg-white rounded-xl p-10 text-center shadow-sm border border-slate-200">
                    <p className="text-slate-500 mb-4">Chưa có mã giảm giá nào được tạo.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vouchers.map(v => (
                        <div key={v.id} className={`bg-white p-5 rounded-xl shadow-sm border relative overflow-hidden ${v.isActive ? 'border-indigo-100' : 'border-slate-200 opacity-60'}`}>
                            {/* Decor */}
                            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-50 rounded-full border-r border-slate-200"></div>
                            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-50 rounded-full border-l border-slate-200"></div>

                            <div className="flex justify-between items-start mb-3">
                                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-black tracking-widest text-lg rounded-md border border-indigo-100 border-dashed">
                                    {v.code}
                                </span>
                                <div className="flex gap-2">
                                    <button onClick={() => handleOpenModal(v)} className="text-slate-400 hover:text-indigo-600">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                    <button onClick={() => handleDelete(v.id)} className="text-slate-400 hover:text-rose-600">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-slate-800 font-bold text-sm mb-1">
                                Giảm {v.discountType === 'PERCENTAGE' ? `${v.discountValue}%` : formatMoney(v.discountValue)}
                            </h3>
                            <p className="text-xs text-slate-500 mb-3">
                                Đơn tối thiểu: {v.minOrderValue ? formatMoney(v.minOrderValue) : '0 đ'} 
                                {v.discountType === 'PERCENTAGE' && v.maxDiscountAmount && ` • Tối đa: ${formatMoney(v.maxDiscountAmount)}`}
                            </p>

                            <div className="flex justify-between items-center text-[11px] text-slate-500 border-t border-slate-100 pt-3">
                                <span>HSD: {new Date(v.endDate).toLocaleDateString('vi-VN')}</span>
                                <div className="text-right">
                                    <p>Đã dùng: {v.usedCount} {v.usageLimit && `/ ${v.usageLimit}`}</p>
                                    {v.usageLimitPerUser && <p className="text-[10px] mt-0.5 text-indigo-500 font-semibold">Tối đa {v.usageLimitPerUser} lần/khách</p>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg">
                                {editVoucher ? 'Cập nhật Mã Giảm Giá' : 'Tạo Mã Giảm Giá'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Mã Code *</label>
                                <input type="text" required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 uppercase font-bold tracking-wider" placeholder="VD: GIAM10K" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Loại giảm *</label>
                                    <select value={formData.discountType} onChange={e => setFormData({...formData, discountType: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                                        <option value="PERCENTAGE">Theo phần trăm (%)</option>
                                        <option value="FIXED_AMOUNT">Tiền mặt (đ)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Mức giảm *</label>
                                    <input type="number" required min="0" value={formData.discountValue} onChange={e => setFormData({...formData, discountValue: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder={formData.discountType === 'PERCENTAGE' ? 'VD: 10 (%)' : 'VD: 20000 (đ)'} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Đơn tối thiểu (đ)</label>
                                    <input type="number" min="0" value={formData.minOrderValue} onChange={e => setFormData({...formData, minOrderValue: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="VD: 100000" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Mức giảm tối đa (đ)</label>
                                    <input type="number" min="0" disabled={formData.discountType === 'FIXED_AMOUNT'} value={formData.maxDiscountAmount} onChange={e => setFormData({...formData, maxDiscountAmount: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100" placeholder="Chỉ áp dụng khi giảm %" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Từ ngày *</label>
                                    <input type="datetime-local" required value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Đến ngày *</label>
                                    <input type="datetime-local" required value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Giới hạn tổng lượt dùng</label>
                                    <input type="number" min="1" value={formData.usageLimit} onChange={e => setFormData({...formData, usageLimit: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Bỏ trống nếu không giới hạn" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Giới hạn mỗi khách hàng</label>
                                    <input type="number" min="1" value={formData.usageLimitPerUser} onChange={e => setFormData({...formData, usageLimitPerUser: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="VD: 1 (Chỉ dùng 1 lần)" />
                                </div>
                            </div>
                            
                            <div className="flex items-center mt-2">
                                <label className="flex items-center cursor-pointer">
                                    <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="sr-only peer" />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                    <span className="ml-3 text-sm font-medium text-slate-700">Kích hoạt</span>
                                </label>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                                    Hủy
                                </button>
                                <button type="submit" className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all">
                                    {editVoucher ? 'Cập nhật' : 'Tạo mới'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoucherTab;
