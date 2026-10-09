import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';

const InspectOrderModal = ({ isOpen, onClose, order, onSuccess, formatMoney }) => {
    const [items, setItems] = useState([]);
    const [actualWeight, setActualWeight] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    useEffect(() => {
        if (isOpen && order) {
            setItems(order.items.map(item => ({
                orderItemId: item.id,
                serviceName: item.serviceName,
                unit: item.unit,
                actualQuantity: item.quantity,
                unitPrice: item.priceAtBooking
            })));
            setActualWeight(order.actualWeight || '');
            setNotes('');
        }
    }, [isOpen, order]);

    if (!isOpen || !order) return null;

    const handleQuantityChange = (id, value) => {
        const val = parseFloat(value);
        setItems(prev => prev.map(item => 
            item.orderItemId === id ? { ...item, actualQuantity: isNaN(val) ? '' : val } : item
        ));
    };

    const handlePriceChange = (id, value) => {
        const val = parseFloat(value);
        setItems(prev => prev.map(item => 
            item.orderItemId === id ? { ...item, unitPrice: isNaN(val) ? '' : val } : item
        ));
    };

    const calculateNewTotal = () => {
        let serviceFee = 0;
        items.forEach(item => {
            const qty = item.actualQuantity || 0;
            const price = item.unitPrice || 0;
            serviceFee += (qty * price);
        });
        // We do not have the minCharge logic on frontend, but it's an estimate.
        // Actually, let's just display the raw sum for preview.
        return serviceFee + (order.shippingFee || 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        const hasInvalidItem = items.some(item => item.actualQuantity === '' || item.actualQuantity < 0 || item.unitPrice === '' || item.unitPrice < 0);
        if (hasInvalidItem) {
            toast.error('Vui lòng nhập đúng số lượng và đơn giá (không được để trống hoặc âm).');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                actualWeight: actualWeight !== '' ? parseFloat(actualWeight) : null,
                notes: notes,
                items: items.map(i => ({
                    orderItemId: i.orderItemId,
                    actualQuantity: i.actualQuantity,
                    unitPrice: i.unitPrice
                }))
            };

            const res = await axiosClient.put(`/owner/orders/${order.id}/inspect`, payload);
            if (res.success) {
                onSuccess();
            } else {
                toast.error(res.message || "Có lỗi xảy ra khi lưu.");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi kết nối máy chủ.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Kiểm tra & Chốt giá Đơn #{order.id}</h3>
                        <p className="text-xs text-slate-500 mt-1">Cập nhật số lượng/khối lượng thực tế và đơn giá nếu cần.</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-200">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    <form id="inspectForm" onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Items Table */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider font-bold border-b border-slate-200">
                                    <tr>
                                        <th className="p-3">Dịch vụ</th>
                                        <th className="p-3 w-32">S.Lượng/Số kg</th>
                                        <th className="p-3 w-36">Đơn giá</th>
                                        <th className="p-3 text-right">Thành tiền</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.map(item => (
                                        <tr key={item.orderItemId} className="hover:bg-slate-50/50">
                                            <td className="p-3 font-medium text-slate-900">
                                                {item.serviceName}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="number" 
                                                        step="any"
                                                        min="0"
                                                        value={item.actualQuantity}
                                                        onChange={(e) => handleQuantityChange(item.orderItemId, e.target.value)}
                                                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                                    />
                                                    <span className="text-xs text-slate-500">{item.unit}</span>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <input 
                                                    type="number" 
                                                    step="any"
                                                    min="0"
                                                    value={item.unitPrice}
                                                    onChange={(e) => handlePriceChange(item.orderItemId, e.target.value)}
                                                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-right focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                                />
                                            </td>
                                            <td className="p-3 text-right font-semibold text-slate-900">
                                                {formatMoney((item.actualQuantity || 0) * (item.unitPrice || 0))}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Additional Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                                    Ghi chú (Tùy chọn)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows="2"
                                    placeholder="Ví dụ: Áo có vết rách nhỏ..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                                ></textarea>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                                    Tổng khối lượng toàn đơn (Kg)
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    value={actualWeight}
                                    onChange={(e) => setActualWeight(e.target.value)}
                                    placeholder="Tùy chọn ghi chú số kg chung..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                    <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">So sánh giá</span>
                        <div className="flex items-end gap-3">
                            <span className="text-sm text-slate-500 line-through decoration-slate-300">
                                {formatMoney(order.estimatedTotal)}
                            </span>
                            <span className="text-lg font-bold text-indigo-600">
                                {formatMoney(calculateNewTotal())}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                            Đóng
                        </button>
                        <button
                            type="submit"
                            form="inspectForm"
                            disabled={isSubmitting}
                            className="px-6 py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center"
                        >
                            {isSubmitting ? (
                                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div> Đang lưu...</>
                            ) : 'Lưu & Xác nhận giá'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default InspectOrderModal;
