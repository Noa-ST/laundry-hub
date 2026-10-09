import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import AddressBookModal from './AddressBookModal';
import toast from 'react-hot-toast';

const formatMoney = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
};

const BookingModal = ({ shop, location, isOpen, onClose, onSuccess }) => {
    const { currentUser } = useAuth();
    const [quantities, setQuantities] = useState({});
    const [contactServices, setContactServices] = useState({});
    const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
    const [timeSlot, setTimeSlot] = useState("07:00:00");
    const [note, setNote] = useState("");
    
    const [inboundType, setInboundType] = useState('CUSTOMER_DROP_OFF');
    const [outboundType, setOutboundType] = useState('CUSTOMER_PICK_UP');
    const [paymentMethod, setPaymentMethod] = useState('COD');
    
    const [receiverName, setReceiverName] = useState('');
    const [receiverPhone, setReceiverPhone] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [userLat, setUserLat] = useState(location?.lat || null);
    const [userLng, setUserLng] = useState(location?.lng || null);
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
    
    const [voucherCode, setVoucherCode] = useState('');
    const [activeVouchers, setActiveVouchers] = useState([]);
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (shop && shop.id) {
            axiosClient.get(`/vouchers/shop/${shop.id}`)
                .then(res => {
                    if (res && res.data) {
                        setActiveVouchers(res.data);
                    }
                })
                .catch(err => console.error("Error fetching vouchers", err));
        }
    }, [shop]);

    useEffect(() => {
        if (currentUser && isOpen) {
            setReceiverName(currentUser.fullName || '');
            setReceiverPhone(currentUser.phone || '');
        }
    }, [currentUser, isOpen]);

    const currentDistance = userLat && userLng && shop?.latitude && shop?.longitude
        ? calculateDistance(userLat, userLng, shop.latitude, shop.longitude)
        : (shop?.distanceKm || 0);
        
    const maxDist = shop?.maxDeliveryDistance || 10;
    const isFar = currentDistance > maxDist;

    useEffect(() => {
        if (isFar) {
            setInboundType('CUSTOMER_DROP_OFF');
            setOutboundType('CUSTOMER_PICK_UP');
        }
    }, [isFar]);

    if (!isOpen) return null;

    const handleQtyChange = (serviceId, delta) => {
        setQuantities(prev => {
            const current = prev[serviceId] || 0;
            const next = Math.max(0, current + delta);
            if (next === 0) { const copy = { ...prev }; delete copy[serviceId]; return copy; }
            return { ...prev, [serviceId]: next };
        });
    };

    const handleToggleContact = (serviceId) => {
        setContactServices(prev => {
            const next = { ...prev };
            if (next[serviceId]) delete next[serviceId];
            else next[serviceId] = 1;
            return next;
        });
    };

    const serviceFee = shop.services.reduce((total, s) => {
        if (s.price === 0) return total; // Contact price
        return total + (s.price * (quantities[s.id] || 0));
    }, 0);
    
    const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0) + Object.keys(contactServices).length;
    
    const singleLegFee = () => {
        if (isFar) return 0;
        let baseFee = shop.baseShippingFee || 15000;
        let extraFeePerKm = shop.extraShippingFeePerKm || 5000;
        let extraFee = currentDistance > 2 ? Math.ceil(currentDistance - 2) * extraFeePerKm : 0;
        return baseFee + extraFee;
    };
    
    const calcFee = singleLegFee();
    
    const calculateShippingFee = () => {
        let legs = 0;
        if (inboundType === 'SHOP_PICK_UP') legs++;
        if (outboundType === 'SHOP_DELIVERY') legs++;
        return calcFee * legs;
    };
    
    const shippingFee = calculateShippingFee();
    const calculateDiscount = () => {
        if (!voucherCode) return 0;
        const matched = activeVouchers.find(v => v.code === voucherCode);
        if (matched) {
            if (serviceFee + shippingFee < (matched.minOrderValue || 0)) return 0;
            if (matched.discountType === 'FIXED_AMOUNT') {
                return matched.discountValue;
            } else {
                let disc = (serviceFee + shippingFee) * (matched.discountValue / 100);
                if (matched.maxDiscountAmount && disc > matched.maxDiscountAmount) {
                    disc = matched.maxDiscountAmount;
                }
                return disc;
            }
        }
        return 0;
    };

    const discountAmount = calculateDiscount();
    const finalTotalPrice = Math.max(0, serviceFee + shippingFee - discountAmount);
    const hasShipping = inboundType === 'SHOP_PICK_UP' || outboundType === 'SHOP_DELIVERY';
    const isContactMissing = hasShipping && (!receiverName || !receiverPhone || !deliveryAddress);

    const getSubmitLabel = () => {
        if (totalItems === 0) return "Vui lòng chọn dịch vụ";
        if (isContactMissing) return "Vui lòng điền thông tin giao nhận";
        return isSubmitting ? "Đang xử lý..." : "Xác nhận đặt đơn";
    };

    const isSubmitDisabled = totalItems === 0 || isContactMissing || isSubmitting;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitDisabled) return;

        const items = [];
        Object.entries(quantities).forEach(([serviceId, qty]) => {
            items.push({ serviceId: parseInt(serviceId), quantity: qty });
        });
        Object.entries(contactServices).forEach(([serviceId, qty]) => {
            items.push({ serviceId: parseInt(serviceId), quantity: qty });
        });

        try {
            setIsSubmitting(true);
            const response = await axiosClient.post('/orders', {
                shopId: shop.id,
                bookingTime: `${bookingDate}T${timeSlot}`,
                note, items,
                inboundType, outboundType, paymentMethod,
                receiverName: hasShipping ? receiverName : null,
                receiverPhone: hasShipping ? receiverPhone : null,
                deliveryAddress: hasShipping ? deliveryAddress : null,
                userLat: userLat,
                userLng: userLng,
                voucherCode: voucherCode || null
            });
            if (response.success) onSuccess();
            else toast.error(response.message || "Có lỗi xảy ra");
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi kết nối hoặc hệ thống!");
        } finally { setIsSubmitting(false); }
    };

    const handleSelectAddress = (addr) => {
        setDeliveryAddress(addr.address);
        setUserLat(addr.latitude);
        setUserLng(addr.longitude);
        setIsAddressModalOpen(false);
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-slide-up">
                
                {/* Sticky Header */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white z-20 shrink-0">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-bold text-slate-900 line-clamp-1">{shop.name}</h2>
                        <span className="text-xs font-medium text-slate-500 mt-0.5 flex items-center">
                            <svg className="w-3.5 h-3.5 mr-1 stroke-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Cách bạn {currentDistance.toFixed(1)} km
                        </span>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-100">
                        <svg className="w-5 h-5 stroke-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                {/* Scrollable Body */}
                <div className="overflow-y-auto flex-1 min-h-0 p-6 space-y-8 bg-slate-50/50 custom-scrollbar">
                    
                    {/* Phần 1: Chọn gói dịch vụ */}
                    <section>
                        <h3 className="font-bold text-slate-900 mb-4 text-[13px] uppercase tracking-wide flex items-center">
                            <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mr-2 text-xs">1</span>
                            Chọn gói dịch vụ
                        </h3>
                        <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-sm">
                            {shop.services.map(s => {
                                const isContact = s.price === 0;
                                return (
                                    <div key={s.id} className="flex justify-between items-center p-4 hover:bg-slate-50/80 transition-colors">
                                        <div className="flex flex-col flex-1 pr-4">
                                            <span className="font-bold text-slate-900 text-sm mb-0.5">{s.name}</span>
                                            {isContact ? (
                                                <span className="text-xs text-teal-700 font-bold tracking-tight bg-teal-50 px-2 py-0.5 rounded-md inline-block self-start border border-teal-100 mt-1">BÁO GIÁ SAU</span>
                                            ) : (
                                                <span className="text-sm font-semibold text-slate-700">{formatMoney(s.price)}<span className="text-xs text-slate-400 font-medium ml-1">/ {s.unit}</span></span>
                                            )}
                                        </div>
                                        <div className="shrink-0">
                                            {isContact ? (
                                                <label className="flex items-center cursor-pointer gap-2 select-none group">
                                                    <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">Chọn món này</span>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={!!contactServices[s.id]}
                                                        onChange={() => handleToggleContact(s.id)}
                                                        className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-600 cursor-pointer"
                                                    />
                                                </label>
                                            ) : (
                                                <div className="flex items-center space-x-1.5 bg-white rounded-xl p-1 border border-slate-200/80 shadow-sm">
                                                    <button type="button" onClick={() => handleQtyChange(s.id, -1)} className="w-8 h-8 flex items-center justify-center text-slate-600 rounded-lg hover:bg-slate-100 transition-colors font-bold text-lg select-none">-</button>
                                                    <span className="w-8 text-center font-bold text-slate-900 text-[15px]">{quantities[s.id] || 0}</span>
                                                    <button type="button" onClick={() => handleQtyChange(s.id, 1)} className="w-8 h-8 flex items-center justify-center text-slate-600 rounded-lg hover:bg-slate-100 transition-colors font-bold text-lg select-none">+</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Phần 2: Hình thức Giao - Nhận */}
                    <section>
                        <div className="flex justify-between items-end mb-4">
                            <h3 className="font-bold text-slate-900 text-[13px] uppercase tracking-wide flex items-center">
                                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mr-2 text-xs">2</span>
                                Giao nhận đồ
                            </h3>
                        </div>
                        
                        {isFar && (
                            <div className="mb-4 p-3.5 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 text-sm flex items-start space-x-2">
                                <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600 stroke-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                <span className="font-medium">Tiệm không nhận ship ngoài bán kính {maxDist}km. Vui lòng tự đến giao/nhận đồ.</span>
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Chiều gửi đồ (Inbound)</p>
                                <label className={`flex flex-col p-4 border-2 rounded-2xl cursor-pointer transition-all ${inboundType === 'CUSTOMER_DROP_OFF' ? 'bg-teal-50/30 border-teal-600 shadow-sm' : 'bg-white border-slate-200 hover:border-teal-300'}`}>
                                    <div className="flex items-center space-x-3"><input type="radio" checked={inboundType==='CUSTOMER_DROP_OFF'} onChange={()=>setInboundType('CUSTOMER_DROP_OFF')} className="w-4 h-4 text-teal-600 focus:ring-teal-600" /><span className="font-bold text-slate-900 text-[15px]">Tôi tự mang tới tiệm</span></div>
                                    <span className="ml-7 text-xs font-medium text-slate-500 mt-1">Miễn phí</span>
                                </label>
                                <label className={`flex flex-col p-4 border-2 rounded-2xl transition-all ${isFar ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200' : 'cursor-pointer hover:border-teal-300'} ${inboundType === 'SHOP_PICK_UP' ? 'bg-teal-50/30 border-teal-600 shadow-sm' : 'bg-white border-slate-200'}`}>
                                    <div className="flex items-center space-x-3"><input type="radio" disabled={isFar} checked={inboundType==='SHOP_PICK_UP'} onChange={()=>setInboundType('SHOP_PICK_UP')} className="w-4 h-4 text-teal-600 focus:ring-teal-600" /><span className="font-bold text-slate-900 text-[15px]">Shop đến lấy tận nơi</span></div>
                                    <span className="ml-7 text-xs font-bold text-teal-700 mt-1">Phí: {formatMoney(calcFee)}</span>
                                </label>
                            </div>
                            <div className="space-y-3">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Chiều nhận lại (Outbound)</p>
                                <label className={`flex flex-col p-4 border-2 rounded-2xl cursor-pointer transition-all ${outboundType === 'CUSTOMER_PICK_UP' ? 'bg-teal-50/30 border-teal-600 shadow-sm' : 'bg-white border-slate-200 hover:border-teal-300'}`}>
                                    <div className="flex items-center space-x-3"><input type="radio" checked={outboundType==='CUSTOMER_PICK_UP'} onChange={()=>setOutboundType('CUSTOMER_PICK_UP')} className="w-4 h-4 text-teal-600 focus:ring-teal-600" /><span className="font-bold text-slate-900 text-[15px]">Tôi tự đến tiệm lấy</span></div>
                                    <span className="ml-7 text-xs font-medium text-slate-500 mt-1">Miễn phí</span>
                                </label>
                                <label className={`flex flex-col p-4 border-2 rounded-2xl transition-all ${isFar ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200' : 'cursor-pointer hover:border-teal-300'} ${outboundType === 'SHOP_DELIVERY' ? 'bg-teal-50/30 border-teal-600 shadow-sm' : 'bg-white border-slate-200'}`}>
                                    <div className="flex items-center space-x-3"><input type="radio" disabled={isFar} checked={outboundType==='SHOP_DELIVERY'} onChange={()=>setOutboundType('SHOP_DELIVERY')} className="w-4 h-4 text-teal-600 focus:ring-teal-600" /><span className="font-bold text-slate-900 text-[15px]">Shop giao tận nhà</span></div>
                                    <span className="ml-7 text-xs font-bold text-teal-700 mt-1">Phí: {formatMoney(calcFee)}</span>
                                </label>
                            </div>
                        </div>

                        {hasShipping && (
                            <div className="mt-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                <h4 className="font-bold text-slate-900 mb-3 text-[13px] uppercase">Thông tin liên hệ giao nhận</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Người nhận</label>
                                        <input type="text" placeholder="Họ tên" value={receiverName} onChange={e=>setReceiverName(e.target.value)} className="w-full border-slate-200 rounded-xl text-sm p-3 bg-slate-50 border outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-900 transition-all" required />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Số điện thoại</label>
                                        <input type="tel" placeholder="SĐT liên lạc" value={receiverPhone} onChange={e=>setReceiverPhone(e.target.value)} className="w-full border-slate-200 rounded-xl text-sm p-3 bg-slate-50 border outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-900 transition-all" required />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-end mb-1.5">
                                        <label className="block text-xs font-semibold text-slate-600">Địa chỉ giao nhận</label>
                                        <button type="button" onClick={() => setIsAddressModalOpen(true)} className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                                            Sổ địa chỉ
                                        </button>
                                    </div>
                                    <input type="text" placeholder="Số nhà, tên đường, phường xã..." value={deliveryAddress} onChange={e=>setDeliveryAddress(e.target.value)} className="w-full border-slate-200 rounded-xl text-sm p-3 bg-slate-50 border outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-900 transition-all" required />
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Phần 3: Thời gian hẹn */}
                    <section>
                        <h3 className="font-bold text-slate-900 mb-4 text-[13px] uppercase tracking-wide flex items-center">
                            <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mr-2 text-xs">3</span>
                            Thời gian gửi/nhận
                        </h3>
                        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ngày hẹn</label>
                                <input type="date" value={bookingDate} onChange={e=>setBookingDate(e.target.value)} required min={new Date().toISOString().split('T')[0]} className="w-full border-slate-200 rounded-xl text-sm p-3 bg-white border shadow-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-900 transition-all" />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Khung giờ</label>
                                <select value={timeSlot} onChange={e=>setTimeSlot(e.target.value)} className="w-full border-slate-200 rounded-xl text-sm p-3 bg-white border shadow-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-900 transition-all">
                                    <option value="07:00:00">07:00 - 09:00 (Sáng sớm)</option>
                                    <option value="09:00:00">09:00 - 11:00 (Sáng)</option>
                                    <option value="11:00:00">11:00 - 13:00 (Trưa)</option>
                                    <option value="13:00:00">13:00 - 15:00 (Đầu chiều)</option>
                                    <option value="15:00:00">15:00 - 17:00 (Cuối chiều)</option>
                                    <option value="17:00:00">17:00 - 19:00 (Chiều tối)</option>
                                    <option value="19:00:00">19:00 - 21:00 (Tối)</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* Phần 4: Ghi chú */}
                    <section>
                        <h3 className="font-bold text-slate-900 mb-2 text-[13px] uppercase tracking-wide flex items-center">
                            <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mr-2 text-xs">4</span>
                            Ghi chú thêm (Tùy chọn)
                        </h3>
                        <textarea value={note} onChange={e=>setNote(e.target.value)} rows="2" placeholder="VD: Giao hàng giờ hành chính..." className="w-full border-slate-200 rounded-xl shadow-sm text-sm p-3 bg-white border focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none resize-none text-slate-900 transition-all"></textarea>
                    </section>
                    
                    {/* Phần 5: Mã Giảm Giá */}
                    <section>
                        <h3 className="font-bold text-slate-900 mb-2 text-[13px] uppercase tracking-wide flex items-center">
                            <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mr-2 text-xs">5</span>
                            Mã Giảm Giá (Tùy chọn)
                        </h3>
                        
                        {activeVouchers.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-hide">
                                {activeVouchers.map(v => (
                                    <button
                                        type="button"
                                        key={v.id}
                                        onClick={() => setVoucherCode(v.code)}
                                        className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border ${voucherCode === v.code ? 'bg-teal-50 border-teal-500 text-teal-700 font-semibold' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
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
                            className="w-full border-slate-200 rounded-xl shadow-sm text-sm p-3 bg-white border focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none uppercase text-slate-900 transition-all"
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
                    </section>
                    
                    {/* Padding bottom so it doesn't get hidden behind the sticky footer on small screens */}
                    <div className="h-4"></div>
                </div>

                {/* Sticky Receipt Footer */}
                <div className="p-5 border-t border-slate-100 bg-white/95 backdrop-blur-sm z-20 shrink-0">
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium text-slate-600">Tiền giặt đồ:</span> 
                            <span className="font-bold text-slate-900">{formatMoney(serviceFee)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="font-medium text-slate-600">Phí giao nhận:</span> 
                            <span className="font-bold text-slate-900">{shippingFee > 0 ? formatMoney(shippingFee) : 'Miễn phí'}</span>
                        </div>
                        {Object.keys(contactServices).length > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="font-medium text-slate-600">Dịch vụ báo giá sau:</span> 
                                <span className="font-bold text-teal-600">{Object.keys(contactServices).length} món</span>
                            </div>
                        )}
                        {discountAmount > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="font-medium text-slate-600">Giảm giá:</span> 
                                <span className="font-bold text-green-600">-{formatMoney(discountAmount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-end pt-3 border-t border-slate-100 mt-2">
                            <span className="font-bold text-slate-900 uppercase text-xs">Tổng thanh toán tạm tính</span> 
                            <span className="text-2xl font-black text-slate-900">{formatMoney(finalTotalPrice)}</span>
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleSubmit} 
                        disabled={isSubmitDisabled} 
                        className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-2xl shadow-md transition-all text-base flex items-center justify-center"
                    >
                        {isSubmitting ? (
                            <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div> Đang xử lý...</>
                        ) : getSubmitLabel()}
                    </button>
                </div>
            </div>
            
            <AddressBookModal 
                isOpen={isAddressModalOpen} 
                onClose={() => setIsAddressModalOpen(false)} 
                onSelectAddress={handleSelectAddress}
            />
        </div>,
        document.body
    );
};

export default BookingModal;