import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';

const formatMoney = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

const BookingModal = ({ shop, location, isOpen, onClose, onSuccess }) => {
    const { currentUser } = useAuth();
    const [quantities, setQuantities] = useState({});
    const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
    const [timeSlot, setTimeSlot] = useState("08:00:00");
    const [note, setNote] = useState("");
    
    const [inboundMethod, setInboundMethod] = useState('DROP_OFF');
    const [outboundMethod, setOutboundMethod] = useState('PICKUP_AT_STORE');
    const [paymentMethod, setPaymentMethod] = useState('COD');
    
    const [receiverName, setReceiverName] = useState('');
    const [receiverPhone, setReceiverPhone] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (currentUser && isOpen) {
            setReceiverName(currentUser.fullName || '');
            setReceiverPhone(currentUser.phone || '');
        }
    }, [currentUser, isOpen]);

    useEffect(() => {
        if (shop && shop.distanceKm > 10) {
            setInboundMethod('DROP_OFF');
            setOutboundMethod('PICKUP_AT_STORE');
        }
    }, [shop]);

    if (!isOpen) return null;

    const handleQtyChange = (serviceId, delta) => {
        setQuantities(prev => {
            const current = prev[serviceId] || 0;
            const next = Math.max(0, current + delta);
            if (next === 0) { const copy = { ...prev }; delete copy[serviceId]; return copy; }
            return { ...prev, [serviceId]: next };
        });
    };

    const serviceFee = shop.services.reduce((total, s) => total + (s.price * (quantities[s.id] || 0)), 0);
    const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0);
    
    const singleLegFee = () => {
        const dist = shop.distanceKm || 0;
        if (dist > 10) return 0;
        let baseFee = 15000;
        let extraFee = dist > 2 ? Math.ceil(dist - 2) * 5000 : 0;
        return baseFee + extraFee;
    };
    
    const calcFee = singleLegFee();
    
    const calculateShippingFee = () => {
        let legs = 0;
        if (inboundMethod === 'STORE_PICKUP') legs++;
        if (outboundMethod === 'DELIVERY_TO_HOME') legs++;
        return calcFee * legs;
    };
    
    const shippingFee = calculateShippingFee();
    const finalTotalPrice = serviceFee + shippingFee;
    const hasShipping = inboundMethod === 'STORE_PICKUP' || outboundMethod === 'DELIVERY_TO_HOME';
    const isFar = shop.distanceKm > 10;
    const isContactMissing = hasShipping && (!receiverName || !receiverPhone || !deliveryAddress);

    const getSubmitLabel = () => {
        if (totalItems === 0) return "Vui lòng chọn dịch vụ";
        if (isContactMissing) return "Vui lòng điền thông tin giao nhận";
        return isSubmitting ? "Đang xử lý..." : "Xác nhận Đặt lịch";
    };

    const isSubmitDisabled = totalItems === 0 || isContactMissing || isSubmitting;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitDisabled) return;

        const items = Object.entries(quantities).map(([serviceId, qty]) => ({
            serviceId: parseInt(serviceId), quantity: qty
        }));

        try {
            setIsSubmitting(true);
            const response = await axiosClient.post('/orders', {
                shopId: shop.id,
                bookingTime: `${bookingDate}T${timeSlot}`,
                note, items,
                inboundMethod, outboundMethod, paymentMethod,
                receiverName: hasShipping ? receiverName : null,
                receiverPhone: hasShipping ? receiverPhone : null,
                deliveryAddress: hasShipping ? deliveryAddress : null,
                userLat: location?.lat || null,
                userLng: location?.lng || null
            });
            if (response.success) onSuccess();
            else alert(response.message || "Có lỗi xảy ra");
        } catch (error) {
            alert("Lỗi kết nối hoặc hệ thống!");
        } finally { setIsSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-100 flex flex-col max-h-[88vh] overflow-hidden">
                {/* Header cố định */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white z-10 shadow-sm">
                    <h2 className="text-xl font-bold text-slate-900 truncate pr-4">Đặt lịch: {shop.name}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-full transition-colors flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                {/* Body cuộn nội bộ */}
                <div className="overflow-y-auto flex-1 p-5 space-y-6 bg-slate-50/50 pr-2 custom-scrollbar">
                    
                    {/* Bước 1 */}
                    <section>
                        <h3 className="font-bold text-slate-900 mb-3 text-sm uppercase">1. Dịch vụ & Số lượng</h3>
                        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                            {shop.services.map(s => (
                                <div key={s.id} className="flex justify-between items-center p-3 hover:bg-slate-50 transition-colors">
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-slate-900 text-sm">{s.name}</span>
                                        <span className="text-xs text-indigo-700 font-medium">{formatMoney(s.price)}/{s.unit}</span>
                                    </div>
                                    <div className="flex items-center space-x-1.5 bg-slate-50 rounded-lg p-1 border border-slate-200">
                                        <button type="button" onClick={() => handleQtyChange(s.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white text-slate-600 rounded shadow-sm hover:bg-slate-100 font-bold">-</button>
                                        <span className="w-6 text-center font-bold text-slate-900 text-sm">{quantities[s.id] || 0}</span>
                                        <button type="button" onClick={() => handleQtyChange(s.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white text-slate-600 rounded shadow-sm hover:bg-slate-100 font-bold">+</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Bước 2 */}
                    <section>
                        <h3 className="font-bold text-slate-900 mb-2 text-sm uppercase">2. Ngày & Giờ Hẹn</h3>
                        <div className="flex space-x-3">
                            <input type="date" value={bookingDate} onChange={e=>setBookingDate(e.target.value)} required min={new Date().toISOString().split('T')[0]} className="w-1/2 border-slate-200 rounded-xl text-sm p-2.5 bg-white border shadow-sm focus:border-indigo-700 focus:ring-1 focus:ring-indigo-700 outline-none text-slate-900" />
                            <select value={timeSlot} onChange={e=>setTimeSlot(e.target.value)} className="w-1/2 border-slate-200 rounded-xl text-sm p-2.5 bg-white border shadow-sm focus:border-indigo-700 focus:ring-1 focus:ring-indigo-700 outline-none text-slate-900">
                                <option value="08:00:00">08:00 - 10:00</option>
                                <option value="10:00:00">10:00 - 12:00</option>
                                <option value="14:00:00">14:00 - 16:00</option>
                                <option value="16:00:00">16:00 - 18:00</option>
                            </select>
                        </div>
                    </section>

                    {/* Bước 3 */}
                    <section>
                        <div className="flex justify-between items-end mb-3">
                            <h3 className="font-bold text-slate-900 text-sm uppercase">3. Vận chuyển</h3>
                            <span className="text-xs text-slate-500 font-medium">Khoảng cách: {shop.distanceKm || 0}km</span>
                        </div>
                        
                        {isFar && (
                            <div className="mb-3 p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-sm flex items-start space-x-2">
                                <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                <span>Tiệm không nhận ship ngoài bán kính 10km. Vui lòng tự đến giao/nhận đồ.</span>
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className={`flex flex-col p-3 border rounded-xl cursor-pointer transition-all ${inboundMethod === 'DROP_OFF' ? 'bg-indigo-50/50 border-slate-900' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                    <div className="flex items-center space-x-2"><input type="radio" checked={inboundMethod==='DROP_OFF'} onChange={()=>setInboundMethod('DROP_OFF')} className="text-indigo-700" /><span className="font-semibold text-slate-900 text-sm">Tự mang ra tiệm</span></div>
                                    <span className="ml-6 text-xs text-slate-500">Miễn phí</span>
                                </label>
                                <label className={`flex flex-col p-3 border rounded-xl transition-all ${isFar ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer hover:bg-slate-50'} ${inboundMethod === 'STORE_PICKUP' ? 'bg-indigo-50/50 border-slate-900' : 'bg-white border-slate-200'}`}>
                                    <div className="flex items-center space-x-2"><input type="radio" disabled={isFar} checked={inboundMethod==='STORE_PICKUP'} onChange={()=>setInboundMethod('STORE_PICKUP')} className="text-indigo-700" /><span className="font-semibold text-slate-900 text-sm">Tiệm đến lấy đồ</span></div>
                                    <span className="ml-6 text-xs text-indigo-700 font-medium">+{formatMoney(calcFee)}</span>
                                </label>
                            </div>
                            <div className="space-y-2">
                                <label className={`flex flex-col p-3 border rounded-xl cursor-pointer transition-all ${outboundMethod === 'PICKUP_AT_STORE' ? 'bg-indigo-50/50 border-slate-900' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                    <div className="flex items-center space-x-2"><input type="radio" checked={outboundMethod==='PICKUP_AT_STORE'} onChange={()=>setOutboundMethod('PICKUP_AT_STORE')} className="text-indigo-700" /><span className="font-semibold text-slate-900 text-sm">Tự ra lấy đồ về</span></div>
                                    <span className="ml-6 text-xs text-slate-500">Miễn phí</span>
                                </label>
                                <label className={`flex flex-col p-3 border rounded-xl transition-all ${isFar ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer hover:bg-slate-50'} ${outboundMethod === 'DELIVERY_TO_HOME' ? 'bg-indigo-50/50 border-slate-900' : 'bg-white border-slate-200'}`}>
                                    <div className="flex items-center space-x-2"><input type="radio" disabled={isFar} checked={outboundMethod==='DELIVERY_TO_HOME'} onChange={()=>setOutboundMethod('DELIVERY_TO_HOME')} className="text-indigo-700" /><span className="font-semibold text-slate-900 text-sm">Giao tận nhà</span></div>
                                    <span className="ml-6 text-xs text-indigo-700 font-medium">+{formatMoney(calcFee)}</span>
                                </label>
                            </div>
                        </div>
                    </section>

                    {/* Bước 4 */}
                    {hasShipping && (
                        <section className="bg-indigo-50/50 p-4 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-900 mb-3 text-sm uppercase">4. Thông tin giao nhận</h3>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <input type="text" placeholder="Họ tên" value={receiverName} onChange={e=>setReceiverName(e.target.value)} className="border-slate-200 rounded-lg text-sm p-2.5 bg-white border outline-none focus:ring-1 focus:ring-slate-900 text-slate-900" required />
                                <input type="tel" placeholder="SĐT" value={receiverPhone} onChange={e=>setReceiverPhone(e.target.value)} className="border-slate-200 rounded-lg text-sm p-2.5 bg-white border outline-none focus:ring-1 focus:ring-slate-900 text-slate-900" required />
                            </div>
                            <input type="text" placeholder="Địa chỉ chi tiết (VD: 123 Lê Lợi, Q1...)" value={deliveryAddress} onChange={e=>setDeliveryAddress(e.target.value)} className="w-full border-slate-200 rounded-lg text-sm p-2.5 bg-white border outline-none focus:ring-1 focus:ring-slate-900 text-slate-900" required />
                        </section>
                    )}

                    {/* Bước 5 */}
                    <section>
                        <h3 className="font-bold text-slate-900 mb-3 text-sm uppercase">5. Thanh toán</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <label className={`flex items-center justify-center p-3 border rounded-xl cursor-pointer transition-all text-sm font-bold ${paymentMethod === 'COD' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                <input type="radio" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} className="hidden" />
                                Tiền mặt (COD)
                            </label>
                            <label className={`flex items-center justify-center p-3 border rounded-xl cursor-pointer transition-all text-sm font-bold ${paymentMethod === 'VIETQR' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                <input type="radio" checked={paymentMethod === 'VIETQR'} onChange={() => setPaymentMethod('VIETQR')} className="hidden" />
                                Chuyển khoản VietQR
                            </label>
                        </div>
                    </section>

                    {/* Bước 6 */}
                    <section>
                        <h3 className="font-bold text-slate-900 mb-2 text-sm uppercase">6. Ghi chú</h3>
                        <textarea value={note} onChange={e=>setNote(e.target.value)} rows="2" placeholder="Ghi chú thêm cho tiệm..." className="w-full border-slate-200 rounded-xl shadow-sm text-sm p-3 bg-white border focus:ring-slate-900 outline-none resize-none text-slate-900"></textarea>
                    </section>
                </div>

                {/* Footer cố định */}
                <div className="p-5 border-t border-slate-200 bg-white z-10">
                    <div className="mb-4 bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-sm text-sm space-y-2">
                        <div className="flex justify-between text-slate-600"><span className="font-medium">Tiền dịch vụ:</span> <span className="font-semibold text-slate-900">{formatMoney(serviceFee)}</span></div>
                        <div className="flex justify-between text-slate-600"><span className="font-medium">Phí vận chuyển:</span> <span className="font-semibold text-slate-900">{formatMoney(shippingFee)}</span></div>
                        <div className="flex justify-between items-center pt-3 border-t border-slate-200 mt-2">
                            <span className="font-extrabold text-slate-900 uppercase">Tổng cộng:</span> 
                            <span className="text-xl font-black text-slate-900">{formatMoney(finalTotalPrice)}</span>
                        </div>
                    </div>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isSubmitDisabled} 
                        className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all text-[15px]"
                    >
                        {getSubmitLabel()}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BookingModal;