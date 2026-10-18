import React, { useState, useEffect, useMemo } from 'react';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';

const formatMoney = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

const PosOrderModal = ({ isOpen, onClose, onSuccess }) => {
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [items, setItems] = useState([]);
    const [notes, setNotes] = useState('');
    const [voucherCode, setVoucherCode] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('COD');
    const [isPaid, setIsPaid] = useState(true);
    
    const [services, setServices] = useState([]);
    const [activeVouchers, setActiveVouchers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showServiceList, setShowServiceList] = useState(false);
    const [isCustomerFound, setIsCustomerFound] = useState(false);
    const [isSearchingPhone, setIsSearchingPhone] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchServices();
            fetchVouchers();
            // Reset form
            setCustomerPhone('');
            setCustomerName('');
            setItems([]);
            setNotes('');
            setVoucherCode('');
            setPaymentMethod('COD');
            setIsPaid(true);
            setShowServiceList(false);
            setIsCustomerFound(false);
        }
    }, [isOpen]);

    const fetchVouchers = async () => {
        try {
            const meRes = await axiosClient.get('/auth/me');
            if (meRes.data && meRes.data.shopId) {
                const res = await axiosClient.get(`/vouchers/shop/${meRes.data.shopId}`);
                if (res && res.data) {
                    setActiveVouchers(res.data);
                }
            }
        } catch (err) {
            console.error("Error fetching vouchers", err);
        }
    };

    const handleSearchPhone = async () => {
        if (!customerPhone || customerPhone.length < 9) {
            toast.error("Vui lòng nhập SĐT hợp lệ để tìm kiếm");
            return;
        }
        try {
            setIsSearchingPhone(true);
            const res = await axiosClient.get(`/owner/orders/customer/search?phone=${customerPhone}`);
            if (res && res.data) {
                setCustomerName(res.data.fullName);
                setIsCustomerFound(true);
            } else {
                setCustomerName('');
                setIsCustomerFound(false);
                toast.error("Số điện thoại chưa đăng ký tài khoản. Khách hàng mới.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Lỗi khi tìm kiếm khách hàng");
        } finally {
            setIsSearchingPhone(false);
        }
    };

    const fetchServices = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get('/owner/services');
            if (Array.isArray(res)) {
                setServices(res.filter(s => s.isActive));
            } else if (res && res.data && Array.isArray(res.data)) {
                setServices(res.data.filter(s => s.isActive));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddService = (service) => {
        setItems(prev => [
            ...prev,
            {
                id: Date.now() + Math.random(),
                serviceId: service.id,
                serviceName: service.name,
                unit: service.unitName,
                priceType: service.priceType,
                minCharge: service.minCharge || 0,
                quantity: 1,
                unitPrice: service.priceType === 'FIXED' ? (service.price || 0) : ''
            }
        ]);
        setShowServiceList(false);
    };

    const handleUpdateItem = (id, field, value) => {
        setItems(prev => prev.map(item => 
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const handleRemoveItem = (id) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const calculateItemTotal = (item) => {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unitPrice) || 0;
        let total = qty * price;
        if (item.minCharge > 0 && total < item.minCharge) {
            total = item.minCharge;
        }
        return total;
    };

    const totalAmountPreDiscount = useMemo(() => {
        return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    }, [items]);

    const discountAmount = useMemo(() => {
        if (!voucherCode) return 0;
        const matched = activeVouchers.find(v => v.code === voucherCode);
        if (matched) {
            if (totalAmountPreDiscount < (matched.minOrderValue || 0)) return 0;
            if (matched.discountType === 'FIXED_AMOUNT') {
                return matched.discountValue;
            } else {
                let disc = totalAmountPreDiscount * (matched.discountValue / 100);
                if (matched.maxDiscountAmount && disc > matched.maxDiscountAmount) {
                    disc = matched.maxDiscountAmount;
                }
                return disc;
            }
        }
        return 0;
    }, [voucherCode, activeVouchers, totalAmountPreDiscount]);

    const totalAmount = Math.max(0, totalAmountPreDiscount - discountAmount);

    const totalQuantity = useMemo(() => {
        return items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
    }, [items]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!customerPhone || !customerName) {
            toast.error("Vui lòng nhập đủ SĐT và Tên khách hàng");
            return;
        }
        if (items.length === 0) {
            toast.error("Vui lòng thêm ít nhất 1 dịch vụ");
            return;
        }
        
        for (let i=0; i<items.length; i++) {
            if (!items[i].unitPrice || parseFloat(items[i].unitPrice) <= 0) {
                toast.error(`Vui lòng nhập đơn giá hợp lệ cho món: ${items[i].serviceName}`);
                return;
            }
            if (!items[i].quantity || parseFloat(items[i].quantity) <= 0) {
                toast.error(`Vui lòng nhập số lượng hợp lệ cho món: ${items[i].serviceName}`);
                return;
            }
        }

        try {
            setSubmitting(true);
            const payload = {
                customerPhone,
                customerName,
                notes,
                items: items.map(i => ({
                    serviceId: i.serviceId,
                    quantity: parseFloat(i.quantity),
                    unitPrice: parseFloat(i.unitPrice)
                })),
                voucherCode: voucherCode || null,
                paymentMethod,
                isPaid
            };

            const res = await axiosClient.post('/owner/orders/pos', payload);
            if (res.success) {
                toast.success("Tạo đơn thành công!");
                onSuccess();
            } else {
                toast.error(res.message || "Tạo đơn thất bại");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Lỗi kết nối khi tạo đơn");
        } finally {
            setSubmitting(false);
        }
    };

    const formatPhone = (val) => {
        return val.replace(/\D/g, '').substring(0, 11);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            Tạo đơn tại quầy (POS)
                            <span className="bg-slate-100 text-slate-800 border border-slate-200 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Tại quầy</span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">{new Date().toLocaleString('vi-VN')}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                    
                    {/* Phần 1: Khách hàng */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs">1</span>
                            Thông tin Khách hàng
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Số điện thoại *</label>
                                <div className="flex gap-2">
                                    <input type="tel" placeholder="Nhập SĐT..." value={customerPhone} onChange={e => {setCustomerPhone(formatPhone(e.target.value)); setIsCustomerFound(false);}} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:bg-white focus:ring-1 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all" />
                                    <button type="button" onClick={handleSearchPhone} disabled={isSearchingPhone} className="bg-slate-900 text-white hover:bg-slate-800 px-3.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center justify-center min-w-[70px] shadow-xs">
                                        {isSearchingPhone ? '...' : 'Tìm'}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex justify-between items-center">
                                    Tên khách hàng *
                                    {isCustomerFound && <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">Đã có tài khoản</span>}
                                </label>
                                <input type="text" placeholder="Nhập tên..." value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:bg-white focus:ring-1 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all" />
                            </div>
                        </div>
                    </div>

                    {/* Phần 2: Dịch vụ & Món */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs">2</span>
                                Dịch vụ & Số lượng
                            </h3>
                            <div className="relative">
                                <button onClick={() => setShowServiceList(!showServiceList)} className="text-xs font-bold bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                    Thêm món
                                </button>
                                {showServiceList && (
                                    <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 shadow-xl rounded-xl p-2 z-10 max-h-60 overflow-y-auto">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase px-2 mb-2">Chọn nhanh dịch vụ</div>
                                        {services.length === 0 ? (
                                            <div className="text-xs text-slate-500 px-2 py-3 text-center">Chưa có dịch vụ nào</div>
                                        ) : (
                                            services.map(s => (
                                                <button key={s.id} onClick={() => handleAddService(s)} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-sm text-slate-700 transition-colors flex justify-between items-center">
                                                    <span className="truncate pr-2 font-medium">{s.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">{s.unitName}</span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {items.length === 0 ? (
                            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-500 text-sm">
                                Chưa có món nào. Vui lòng bấm <span className="font-semibold text-slate-700">"Thêm món"</span>.
                            </div>
                        ) : (
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-xs text-slate-500 font-semibold border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3">Tên món & ĐV</th>
                                            <th className="px-4 py-3 w-32">Số lượng</th>
                                            <th className="px-4 py-3 w-36">Đơn giá</th>
                                            <th className="px-4 py-3 text-right">Thành tiền</th>
                                            <th className="px-4 py-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {items.map((item, index) => (
                                            <tr key={item.id} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold text-slate-900">{item.serviceName}</div>
                                                    <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5 inline-block bg-slate-100 px-1.5 py-0.5 rounded">{item.unit}</div>
                                                    {item.minCharge > 0 && <div className="text-[10px] text-orange-600 mt-1">Sàn: {formatMoney(item.minCharge)}</div>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white w-24">
                                                        <input 
                                                            type="number" 
                                                            step="any"
                                                            value={item.quantity} 
                                                            onChange={e => handleUpdateItem(item.id, 'quantity', e.target.value)}
                                                            className="w-full text-center py-1.5 text-sm font-semibold outline-none"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input 
                                                        type="number" 
                                                        placeholder={item.priceType === 'CONTACT' ? "Nhập giá chốt" : ""}
                                                        value={item.unitPrice}
                                                        onChange={e => handleUpdateItem(item.id, 'unitPrice', e.target.value)}
                                                        className={`w-full border rounded-lg py-1.5 px-2 text-sm outline-none transition-all ${item.priceType === 'CONTACT' && !item.unitPrice ? 'border-amber-300 bg-amber-50 focus:border-amber-500 focus:ring-1 focus:ring-amber-500' : 'border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900'}`}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-slate-900">
                                                    {formatMoney(calculateItemTotal(item))}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button onClick={() => handleRemoveItem(item.id)} className="text-slate-400 hover:text-rose-500 transition-colors p-1">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Phần 3: Ghi chú */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs">3</span>
                            Ghi chú đơn hàng
                        </h3>
                        <div>
                            <textarea 
                                rows="3" 
                                placeholder="Ví dụ: Dặn giặt kỹ, giao trước 17h..." 
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all resize-none"
                            ></textarea>
                        </div>
                    </div>

                    {/* Phần 4: Mã giảm giá */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs">4</span>
                            Mã Giảm Giá (Tùy chọn)
                        </h3>
                        {activeVouchers.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-hide">
                                {activeVouchers.map(v => (
                                    <button
                                        type="button"
                                        key={v.id}
                                        onClick={() => setVoucherCode(v.code)}
                                        className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all ${voucherCode === v.code ? 'bg-slate-900 border-slate-900 text-white font-semibold' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        {v.code}
                                    </button>
                                ))}
                            </div>
                        )}
                        <input
                            type="text"
                            value={voucherCode}
                            onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                            placeholder="Nhập mã giảm giá..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-slate-900 focus:border-slate-900 outline-none uppercase text-slate-900 transition-all"
                        />
                        {voucherCode && (
                            discountAmount > 0 ? (
                                <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    Mã hợp lệ, được giảm {formatMoney(discountAmount)}
                                </p>
                            ) : (
                                <p className="text-xs text-red-500 mt-2">
                                    Mã không hợp lệ hoặc đơn hàng chưa đủ điều kiện.
                                </p>
                            )
                        )}
                    </div>

                    {/* Phần 5: Thanh toán tại quầy */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs">5</span>
                            Thanh toán tại quầy
                        </h3>
                        <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-2">Hình thức thanh toán</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label 
                                        className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                                            paymentMethod === 'COD' 
                                                ? 'bg-white border-slate-900 ring-2 ring-slate-900/10 shadow-sm' 
                                                : 'bg-white/60 border-slate-200 hover:bg-white text-slate-600'
                                        }`}
                                    >
                                        <input 
                                            type="radio" 
                                            name="posPaymentMethod" 
                                            checked={paymentMethod === 'COD'} 
                                            onChange={() => setPaymentMethod('COD')}
                                            className="text-slate-900 focus:ring-slate-900"
                                        />
                                        <div className="flex items-center gap-2">
                                            <div>
                                                <span className="text-xs font-bold text-slate-900 block">Tiền mặt</span>
                                                <span className="text-[10px] text-slate-400">Thu trực tiếp tại quầy</span>
                                            </div>
                                        </div>
                                    </label>

                                    <label 
                                        className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                                            paymentMethod === 'VIETQR' 
                                                ? 'bg-white border-slate-900 ring-2 ring-slate-900/10 shadow-sm' 
                                                : 'bg-white/60 border-slate-200 hover:bg-white text-slate-600'
                                        }`}
                                    >
                                        <input 
                                            type="radio" 
                                            name="posPaymentMethod" 
                                            checked={paymentMethod === 'VIETQR'} 
                                            onChange={() => setPaymentMethod('VIETQR')}
                                            className="text-slate-900 focus:ring-slate-900"
                                        />
                                        <div className="flex items-center gap-2">
                                            <div>
                                                <span className="text-xs font-bold text-slate-900 block">Chuyển khoản VietQR</span>
                                                <span className="text-[10px] text-slate-400">Khách quét mã QR</span>
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between">
                                <div>
                                    <label className="text-xs font-bold text-slate-900 flex items-center gap-2 cursor-pointer select-none">
                                        <input 
                                            type="checkbox" 
                                            checked={isPaid} 
                                            onChange={e => setIsPaid(e.target.checked)}
                                            className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900 cursor-pointer"
                                        />
                                        <span>Đã thu tiền ngay</span>
                                    </label>
                                    <p className="text-[11px] text-slate-500 ml-6 mt-0.5">
                                        {isPaid 
                                            ? 'Khách thanh toán luôn lúc gửi đồ (Đã thanh toán)' 
                                            : 'Khách sẽ thanh toán khi lấy lại đồ (Thanh toán sau)'}
                                    </p>
                                </div>
                                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                    {isPaid ? '✓ Đã thu tiền' : '⏳ Thu khi lấy đồ'}
                                </span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between mt-auto">
                    <div>
                        <div className="text-xs font-semibold text-slate-500 mb-0.5">Tổng SL: {totalQuantity}</div>
                        {discountAmount > 0 && <div className="text-xs font-semibold text-green-600 mb-0.5">Giảm giá: -{formatMoney(discountAmount)}</div>}
                        <div className="text-xl font-black text-slate-900">Tổng tiền: <span className="text-slate-900">{formatMoney(totalAmount)}</span></div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} type="button" className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-xl transition-colors">
                            Hủy
                        </button>
                        <button onClick={handleSubmit} disabled={submitting} type="button" className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-2.5 rounded-xl shadow-sm text-sm transition-all disabled:opacity-70 flex items-center gap-2">
                            {submitting ? 'Đang xử lý...' : 'Xác nhận tạo đơn'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PosOrderModal;
