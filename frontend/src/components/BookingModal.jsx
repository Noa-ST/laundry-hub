import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { useMockUser } from '../context/MockUserContext';

const formatMoney = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

const BookingModal = ({ shop, location, isOpen, onClose, onSuccess }) => {
    const { currentUser } = useMockUser();
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
                {/* Header cố định */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white z-10 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 truncate pr-4">Đặt lịch: {shop.name}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-full transition-colors flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                {/* Body cuộn nội bộ */}
                <div className="overflow-y-auto flex-1 p-5 space-y-6 bg-gray-50/50 pr-2 custom-scrollbar">
                    
                    {/* Bước 1 */}
                    <section>
                        <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase">1. Dịch vụ & Số lượng</h3>
                        <div className="space-y-2">
                            {shop.services.map(s => (
                                <div key={s.id} className="flex justify-between items-center p-2.5 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-indigo-100 transition-colors">
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-gray-800 text-sm">{s.name}</span>
                                        <span className="text-xs text-indigo-600 font-medium">{formatMoney(s.price)}/{s.unit}</span>
                                    </div>
                                    <div className="flex items-center space-x-1.5 bg-gray-50 rounded-lg p-1 border border-gray-200">
                                        <button type="button" onClick={() => handleQtyChange(s.id, -1)} className="w-6 h-6 flex items-center justify-center bg-white text-gray-600 rounded shadow-sm hover:bg-gray-100 font-bold">-</button>
                                        <span className="w-5 text-center font-bold text-gray-800 text-sm">{quantities[s.id] || 0}</span>
                                        <button type="button" onClick={() => handleQtyChange(s.id, 1)} className="w-6 h-6 flex items-center justify-center bg-white text-gray-600 rounded shadow-sm hover:bg-gray-100 font-bold">+</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Bước 2 */}
                    <section>
                        <h3 className="font-bold text-gray-800 mb-2 text-sm uppercase">2. Ngày & Giờ Hẹn</h3>
                        <div className="flex space-x-3">
                            <input type="date" value={bookingDate} onChange={e=>setBookingDate(e.target.value)} required min={new Date().toISOString().split('T')[0]} className="w-1/2 border-gray-300 rounded-xl text-sm p-2.5 bg-white border shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
                            <select value={timeSlot} onChange={e=>setTimeSlot(e.target.value)} className="w-1/2 border-gray-300 rounded-xl text-sm p-2.5 bg-white border shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
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
                            <h3 className="font-bold text-gray-800 text-sm uppercase">3. Vận chuyển</h3>
                            <span className="text-xs text-gray-500 font-medium">Khoảng cách: {shop.distanceKm || 0}km</span>
                        </div>
                        
                        {isFar && (
                            <div className="mb-3 p-3 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-200 text-sm flex items-start space-x-2">
                                <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                <span>Tiệm không nhận ship ngoài bán kính 10km. Vui lòng tự đến giao/nhận đồ.</span>
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className={`flex flex-col p-3 border rounded-xl cursor-pointer transition-all ${inboundMethod === 'DROP_OFF' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                    <div className="flex items-center space-x-2"><input type="radio" checked={inboundMethod==='DROP_OFF'} onChange={()=>setInboundMethod('DROP_OFF')} className="text-indigo-600" /><span className="font-semibold text-gray-900 text-sm">Tự mang ra tiệm</span></div>
                                    <span className="ml-6 text-xs text-gray-500">Miễn phí</span>
                                </label>
                                <label className={`flex flex-col p-3 border rounded-xl transition-all ${isFar ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:bg-gray-50'} ${inboundMethod === 'STORE_PICKUP' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white border-gray-200'}`}>
                                    <div className="flex items-center space-x-2"><input type="radio" disabled={isFar} checked={inboundMethod==='STORE_PICKUP'} onChange={()=>setInboundMethod('STORE_PICKUP')} className="text-indigo-600" /><span className="font-semibold text-gray-900 text-sm">Tiệm đến lấy đồ</span></div>
                                    <span className="ml-6 text-xs text-indigo-600 font-medium">+{formatMoney(calcFee)}</span>
                                </label>
                            </div>
                            <div className="space-y-2">
                                <label className={`flex flex-col p-3 border rounded-xl cursor-pointer transition-all ${outboundMethod === 'PICKUP_AT_STORE' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                    <div className="flex items-center space-x-2"><input type="radio" checked={outboundMethod==='PICKUP_AT_STORE'} onChange={()=>setOutboundMethod('PICKUP_AT_STORE')} className="text-indigo-600" /><span className="font-semibold text-gray-900 text-sm">Tự ra lấy đồ về</span></div>
                                    <span className="ml-6 text-xs text-gray-500">Miễn phí</span>
                                </label>
                                <label className={`flex flex-col p-3 border rounded-xl transition-all ${isFar ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:bg-gray-50'} ${outboundMethod === 'DELIVERY_TO_HOME' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white border-gray-200'}`}>
                                    <div className="flex items-center space-x-2"><input type="radio" disabled={isFar} checked={outboundMethod==='DELIVERY_TO_HOME'} onChange={()=>setOutboundMethod('DELIVERY_TO_HOME')} className="text-indigo-600" /><span className="font-semibold text-gray-900 text-sm">Giao tận nhà</span></div>
                                    <span className="ml-6 text-xs text-indigo-600 font-medium">+{formatMoney(calcFee)}</span>
                                </label>
                            </div>
                        </div>
                    </section>

                    {/* Bước 4 */}
                    {hasShipping && (
                        <section className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 shadow-sm animate-fade-in-down">
                            <h3 className="font-bold text-blue-900 mb-3 text-sm uppercase">4. Thông tin giao nhận</h3>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <input type="text" placeholder="Họ tên" value={receiverName} onChange={e=>setReceiverName(e.target.value)} className="border-blue-200 rounded-lg text-sm p-2.5 bg-white border outline-none focus:ring-1 focus:ring-blue-500" required />
                                <input type="tel" placeholder="SĐT" value={receiverPhone} onChange={e=>setReceiverPhone(e.target.value)} className="border-blue-200 rounded-lg text-sm p-2.5 bg-white border outline-none focus:ring-1 focus:ring-blue-500" required />
                            </div>
                            <input type="text" placeholder="Địa chỉ chi tiết (VD: 123 Lê Lợi, Q1...)" value={deliveryAddress} onChange={e=>setDeliveryAddress(e.target.value)} className="w-full border-blue-200 rounded-lg text-sm p-2.5 bg-white border outline-none focus:ring-1 focus:ring-blue-500" required />
                        </section>
                    )}

                    {/* Bước 5 */}
                    <section>
                        <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase">5. Thanh toán</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <label className={`flex items-center justify-center p-3 border rounded-xl cursor-pointer transition-all text-sm font-bold ${paymentMethod === 'COD' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                <input type="radio" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} className="hidden" />
                                💵 Tiền mặt (COD)
                            </label>
                            <label className={`flex items-center justify-center p-3 border rounded-xl cursor-pointer transition-all text-sm font-bold ${paymentMethod === 'VIETQR' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                <input type="radio" checked={paymentMethod === 'VIETQR'} onChange={() => setPaymentMethod('VIETQR')} className="hidden" />
                                📱 Chuyển khoản VietQR
                            </label>
                        </div>
                    </section>

                    {/* Bước 6 */}
                    <section>
                        <h3 className="font-bold text-gray-800 mb-2 text-sm uppercase">6. Ghi chú</h3>
                        <textarea value={note} onChange={e=>setNote(e.target.value)} rows="2" placeholder="VD: Giặt kỹ cổ áo, Không sấy nóng..." className="w-full border-gray-300 rounded-xl shadow-sm text-sm p-3 bg-white border focus:ring-indigo-500 outline-none resize-none"></textarea>
                    </section>
                </div>

                {/* Footer cố định */}
                <div className="p-5 border-t border-gray-200 bg-slate-50 z-10">
                    <div className="mb-4 bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-sm space-y-2">
                        <div className="flex justify-between text-gray-600"><span className="font-medium">Tiền dịch vụ:</span> <span className="font-semibold">{formatMoney(serviceFee)}</span></div>
                        <div className="flex justify-between text-gray-600"><span className="font-medium">Phí vận chuyển:</span> <span className="font-semibold">{formatMoney(shippingFee)}</span></div>
                        <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-2">
                            <span className="font-extrabold text-gray-900 uppercase">Tổng cộng:</span> 
                            <span className="text-2xl font-black text-indigo-700">{formatMoney(finalTotalPrice)}</span>
                        </div>
                    </div>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isSubmitDisabled} 
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all text-[15px]"
                    >
                        {getSubmitLabel()}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BookingModal;
