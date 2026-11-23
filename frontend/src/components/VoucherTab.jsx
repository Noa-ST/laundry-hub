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
        const todayStr = new Date().toISOString().slice(0, 10);
        const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        if (voucher) {
            setEditVoucher(voucher);
            setFormData({
                ...voucher,
                startDate: voucher.startDate ? voucher.startDate.slice(0, 10) : todayStr,
                endDate: voucher.endDate ? voucher.endDate.slice(0, 10) : nextMonth,
                maxDiscountAmount: voucher.maxDiscountAmount ?? ''
            });
        } else {
            setEditVoucher(null);
            setFormData({
                code: '',
                discountType: 'PERCENTAGE',
                discountValue: '',
                maxDiscountAmount: '',
                minOrderValue: '',
                startDate: todayStr,
                endDate: nextMonth,
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
            const startDateStr = formData.startDate.includes('T') ? formData.startDate : `${formData.startDate}T00:00:00`;
            const endDateStr = formData.endDate.includes('T') ? formData.endDate : `${formData.endDate}T23:59:59`;

            const payload = {
                ...formData,
                discountValue: parseFloat(formData.discountValue),
                maxDiscountAmount: formData.discountType === 'PERCENTAGE' && formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : null,
                minOrderValue: formData.minOrderValue ? parseFloat(formData.minOrderValue) : null,
                usageLimit: formData.usageLimit ? parseInt(formData.usageLimit, 10) : null,
                usageLimitPerUser: formData.usageLimitPerUser ? parseInt(formData.usageLimitPerUser, 10) : null,
                startDate: startDateStr,
                endDate: endDateStr
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
            toast.success("Đã xóa mã giảm giá");
        } catch (error) {
            toast.error("Lỗi khi xóa: " + (error.response?.data?.message || ""));
        }
    };

    const formatMoney = (val) => new Intl.NumberFormat('vi-VN').format(val || 0) + ' đ';

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                    Quản Lý Mã Giảm Giá (Voucher)
                </h2>
                <button 
                    onClick={() => handleOpenModal()}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-sm hover:shadow-md flex items-center gap-1.5"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Tạo Mã Mới
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-slate-500 text-sm">Đang tải...</div>
            ) : vouchers.length === 0 ? (
                <div className="bg-white rounded-xl p-10 text-center shadow-sm border border-slate-200">
                    <p className="text-slate-500 mb-4">Chưa có mã giảm giá nào được tạo.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vouchers.map(v => (
                        <div key={v.id} className={`bg-white p-5 rounded-xl shadow-sm border relative overflow-hidden transition-all hover:shadow-md ${v.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}>
                            {/* Decor */}
                            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-50 rounded-full border-r border-slate-200"></div>
                            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-50 rounded-full border-l border-slate-200"></div>

                            <div className="flex justify-between items-start mb-3">
                                <span className="px-3 py-1 bg-teal-50 text-teal-800 font-mono font-black tracking-widest text-base rounded-md border border-teal-200 border-dashed">
                                    {v.code}
                                </span>
                                <div className="flex gap-2">
                                    <button onClick={() => handleOpenModal(v)} className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors" title="Chỉnh sửa">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                    <button onClick={() => handleDelete(v.id)} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors" title="Xóa">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-slate-900 font-bold text-sm mb-1">
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
                                    {v.usageLimitPerUser && <p className="text-[10px] mt-0.5 text-teal-700 font-semibold">Tối đa {v.usageLimitPerUser} lần/khách</p>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
                            <div>
                                <h3 className="font-bold text-slate-900 text-base">
                                    {editVoucher ? 'Cập nhật Mã Giảm Giá' : 'Tạo Mã Giảm Giá'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">Cấu hình khuyến mãi áp dụng cho dịch vụ của tiệm</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Mã Code *</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={formData.code} 
                                    onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} 
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 uppercase font-bold tracking-wider outline-none" 
                                    placeholder="VD: GIAM10K" 
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Loại giảm *</label>
                                    <select 
                                        value={formData.discountType} 
                                        onChange={e => {
                                            const newType = e.target.value;
                                            setFormData({
                                                ...formData, 
                                                discountType: newType,
                                                maxDiscountAmount: newType === 'FIXED_AMOUNT' ? '' : formData.maxDiscountAmount
                                            });
                                        }} 
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none"
                                    >
                                        <option value="PERCENTAGE">Theo phần trăm (%)</option>
                                        <option value="FIXED_AMOUNT">Giảm số tiền cố định (đ)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Mức giảm *</label>
                                    <input 
                                        type="number" 
                                        required 
                                        min="0" 
                                        value={formData.discountValue} 
                                        onChange={e => setFormData({...formData, discountValue: e.target.value})} 
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none" 
                                        placeholder={formData.discountType === 'PERCENTAGE' ? 'VD: 10 (%)' : 'VD: 20000 (đ)'} 
                                    />
                                </div>
                            </div>

                            {/* Dynamic: Only show "Mức giảm tối đa" when discountType is PERCENTAGE */}
                            {formData.discountType === 'PERCENTAGE' ? (
                                <div className="grid grid-cols-2 gap-4 animate-fade-in">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Đơn tối thiểu (đ)</label>
                                        <input 
                                            type="number" 
                                            min="0" 
                                            value={formData.minOrderValue} 
                                            onChange={e => setFormData({...formData, minOrderValue: e.target.value})} 
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none" 
                                            placeholder="VD: 100000" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Mức giảm tối đa (đ)</label>
                                        <input 
                                            type="number" 
                                            min="0" 
                                            value={formData.maxDiscountAmount} 
                                            onChange={e => setFormData({...formData, maxDiscountAmount: e.target.value})} 
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none" 
                                            placeholder="VD: 50000" 
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Đơn tối thiểu (đ)</label>
                                    <input 
                                        type="number" 
                                        min="0" 
                                        value={formData.minOrderValue} 
                                        onChange={e => setFormData({...formData, minOrderValue: e.target.value})} 
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none" 
                                        placeholder="VD: 100000 (Bỏ trống nếu áp dụng cho mọi đơn)" 
                                    />
                                </div>
                            )}

                            {/* Simplified Date Picker (From Date -> To Date) */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Từ ngày *</label>
                                    <input 
                                        type="date" 
                                        required 
                                        value={formData.startDate} 
                                        onChange={e => setFormData({...formData, startDate: e.target.value})} 
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none cursor-pointer" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Đến ngày *</label>
                                    <input 
                                        type="date" 
                                        required 
                                        value={formData.endDate} 
                                        onChange={e => setFormData({...formData, endDate: e.target.value})} 
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none cursor-pointer" 
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Giới hạn tổng lượt dùng</label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        value={formData.usageLimit} 
                                        onChange={e => setFormData({...formData, usageLimit: e.target.value})} 
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none" 
                                        placeholder="Bỏ trống nếu không giới hạn" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Giới hạn mỗi khách hàng</label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        value={formData.usageLimitPerUser} 
                                        onChange={e => setFormData({...formData, usageLimitPerUser: e.target.value})} 
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none" 
                                        placeholder="VD: 1 (Chỉ dùng 1 lần)" 
                                    />
                                </div>
                            </div>
                            
                            <div className="flex items-center pt-1">
                                <label className="relative flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.isActive} 
                                        onChange={e => setFormData({...formData, isActive: e.target.checked})} 
                                        className="sr-only peer" 
                                    />
                                    <div className="relative w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                                    <span className="ml-3 text-sm font-medium text-slate-700">Kích hoạt mã giảm giá</span>
                                </label>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)} 
                                    className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-xs"
                                >
                                    Hủy
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-6 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition-all"
                                >
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
