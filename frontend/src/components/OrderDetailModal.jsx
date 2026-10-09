import React, { useState, useEffect, useRef } from 'react';
import axiosClient from '../api/axiosClient';

const OrderDetailModal = ({ isOpen, onClose, order, formatMoney, renderActions, onUpdateSuccess }) => {
    const [itemQuantities, setItemQuantities] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const saveTimeoutRef = useRef(null);

    useEffect(() => {
        if (order) {
            const initial = {};
            order.items.forEach(i => initial[i.id] = i.quantity);
            setItemQuantities(initial);
        }
    }, [order]);

    if (!isOpen || !order) return null;

    const canEditQuantity = ['PENDING', 'CONFIRMED', 'PICKING_UP', 'RECEIVED'].includes(order.status);

    const handleQuantityChange = (itemId, val) => {
        const num = parseFloat(val);
        const newQuantities = {
            ...itemQuantities,
            [itemId]: isNaN(num) || num < 0 ? 0 : num
        };
        setItemQuantities(newQuantities);

        // Auto save on change with debounce
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            await autoSaveQuantities(newQuantities);
        }, 500);
    };

    const autoSaveQuantities = async (quantities) => {
        setIsSaving(true);
        try {
            const payload = {
                items: Object.keys(quantities).map(id => ({
                    itemId: parseInt(id),
                    quantity: parseFloat(quantities[id])
                }))
            };
            const res = await axiosClient.patch(`/owner/orders/${order.id}/items`, payload);
            if (res.success && onUpdateSuccess) {
                onUpdateSuccess();
            }
        } catch (error) {
            console.error("Auto save failed:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const getStatusText = (status) => {
        const statusMap = {
            'PENDING': 'Chờ Xác Nhận',
            'CONFIRMED': 'Đã Xác Nhận',
            'PICKING_UP': 'Đang Đi Lấy',
            'RECEIVED': 'Đã Nhận Đồ',
            'PROCESSING': 'Đang Giặt',
            'READY': 'Chờ Giao/Lấy',
            'DELIVERING': 'Đang Giao',
            'COMPLETED': 'Hoàn Thành',
            'CANCELLED': 'Đã Hủy'
        };
        return statusMap[status] || status;
    };

    // Auto calculate derived values based on local state (for instant feedback)
    const localServiceFee = order.items.reduce((sum, item) => {
        const currentQty = itemQuantities[item.id] !== undefined ? itemQuantities[item.id] : item.quantity;
        return sum + (item.priceAtBooking * currentQty);
    }, 0);
    const localTotalPrice = localServiceFee + order.shippingFee;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fade-in" onClick={onClose}></div>
            
            <div className="relative max-w-2xl w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
                
                {/* Header Modal */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                                #ORD-{order.id.toString().padStart(4, '0')}
                            </h2>
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 uppercase tracking-wide border border-indigo-100">
                                {getStatusText(order.status)}
                            </span>
                        </div>
                        <p className="text-xs font-medium text-slate-500 mt-1">
                            {new Date(order.bookingTime).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors">
                        <svg className="w-5 h-5 stroke-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Body Modal */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
                    
                    {/* Hai Thẻ Thông tin (Grid 2 cột) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
                        {/* Thẻ 1: Khách hàng */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100/80">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Khách hàng</h3>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">{order.receiverName || 'Khách vãng lai'}</p>
                                    <p className="text-slate-600 text-xs mt-0.5">{order.receiverPhone || '---'}</p>
                                </div>
                                {order.receiverPhone && (
                                    <a href={`tel:${order.receiverPhone}`} className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                                        Gọi điện
                                    </a>
                                )}
                            </div>
                            {(order.inboundType === 'SHOP_PICK_UP' || order.outboundType === 'SHOP_DELIVERY') && (
                                <div className="mt-3 pt-3 border-t border-slate-200/60">
                                    <p className="text-xs text-slate-600 leading-relaxed"><span className="font-semibold text-slate-800">Địa chỉ:</span> {order.deliveryAddress}</p>
                                </div>
                            )}
                        </div>

                        {/* Thẻ 2: Vận chuyển & Thanh toán */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100/80">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Vận chuyển & Thanh toán</h3>
                            
                            <div className="space-y-2 mb-3">
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-1.5 text-slate-600">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                                        Nhận đồ:
                                    </div>
                                    <span className="font-semibold text-slate-900">{order.inboundType === 'SHOP_PICK_UP' ? 'Tiệm đến lấy' : 'Khách mang tới'}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-1.5 text-slate-600">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
                                        Giao đồ:
                                    </div>
                                    <span className="font-semibold text-slate-900">{order.outboundType === 'SHOP_DELIVERY' ? 'Tiệm đi giao' : 'Khách tự lấy'}</span>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-200/60 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-600">Phương thức TT:</span>
                                    <span className="font-bold text-slate-900">{order.paymentMethod === 'VIETQR' ? 'Chuyển khoản VietQR' : 'Tiền mặt (COD)'}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-600">Trạng thái:</span>
                                    <span className={`font-bold px-2 py-0.5 rounded ${order.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {order.paymentStatus === 'PAID' ? 'Đã Thanh Toán' : 'Chưa Thanh Toán'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bảng Chi tiết Dịch vụ */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chi Tiết Dịch Vụ</h3>
                            {isSaving && <span className="text-[10px] text-slate-400 italic">Đang lưu...</span>}
                        </div>
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold uppercase tracking-wider">Tên dịch vụ</th>
                                        <th className="px-4 py-3 font-semibold text-right uppercase tracking-wider">Đơn giá</th>
                                        <th className="px-4 py-3 font-semibold text-right uppercase tracking-wider">Số lượng / Kg</th>
                                        <th className="px-4 py-3 font-semibold text-right uppercase tracking-wider">Thành tiền</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {order.items && order.items.map(item => {
                                        const currentQty = itemQuantities[item.id] !== undefined ? itemQuantities[item.id] : item.quantity;
                                        const lineTotal = item.priceAtBooking * currentQty;
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-3.5 font-medium text-slate-900">{item.serviceName}</td>
                                                <td className="px-4 py-3.5 text-right text-slate-600">{formatMoney(item.priceAtBooking)}</td>
                                                <td className="px-4 py-3.5 text-right">
                                                    {canEditQuantity ? (
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <input 
                                                                type="number" 
                                                                step="0.1" 
                                                                min="0"
                                                                value={itemQuantities[item.id] === undefined ? '' : itemQuantities[item.id]} 
                                                                onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                                className="w-16 text-right border border-slate-200 rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-shadow bg-slate-50 focus:bg-white"
                                                            />
                                                            <span className="text-slate-500 font-medium">{item.unit}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="font-semibold text-slate-700">{item.quantity} <span className="font-normal text-slate-500">{item.unit}</span></span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 text-right font-bold text-slate-900">{formatMoney(lineTotal)}</td>
                                            </tr>
                                        );
                                    })}
                                    {(!order.items || order.items.length === 0) && (
                                        <tr>
                                            <td colSpan="4" className="px-4 py-8 text-center text-slate-400 italic">Không có dịch vụ nào</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Notes */}
                        {order.note && (
                            <div className="mt-4 p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-xs text-amber-800">
                                <span className="font-bold">Ghi chú của khách:</span> {order.note}
                            </div>
                        )}
                        {order.cancelReason && (
                            <div className="mt-4 p-3 bg-rose-50/50 border border-rose-100 rounded-xl text-xs text-rose-800">
                                <span className="font-bold">Lý do hủy:</span> {order.cancelReason}
                            </div>
                        )}
                    </div>
                </div>

                {/* Thanh Tóm tắt Tài chính & Nút Điều hướng (Sticky Footer) */}
                <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex flex-col gap-1 text-sm shrink-0">
                        <div className="flex items-center gap-2 text-slate-600 text-xs font-medium">
                            <span>Tiền dịch vụ: {formatMoney(localServiceFee)}</span>
                            <span>+</span>
                            <span>Phí giao nhận: {formatMoney(order.shippingFee)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 text-sm">Tổng cộng:</span>
                            <span className="text-lg font-black text-slate-900 tracking-tight">{formatMoney(localTotalPrice)}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                        <button onClick={onClose} className="flex-1 sm:flex-none px-5 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-all shadow-sm">
                            Đóng phụ
                        </button>
                        <div className="flex-1 sm:flex-none flex items-center justify-center">
                            {renderActions(order, false, true)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderDetailModal;
