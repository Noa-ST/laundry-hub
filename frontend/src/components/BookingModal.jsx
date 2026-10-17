import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import AddressBookModal from './AddressBookModal';
import toast from 'react-hot-toast';

const formatMoney = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    return R * c;
};

const BookingModal = ({ shop, location, isOpen, onClose, onSuccess }) => {
    const { currentUser } = useAuth();
    
    // Wizard step state: 1: Dịch vụ, 2: Giao nhận & Thời gian, 3: Thanh toán & Xác nhận
    const [currentStep, setCurrentStep] = useState(1);
    const [serviceSearch, setServiceSearch] = useState('');

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

    // Sổ địa chỉ & dữ liệu địa chỉ tự động
    const [addresses, setAddresses] = useState([]);
    const [pickupAddress, setPickupAddress] = useState('');
    const [pickupLat, setPickupLat] = useState(null);
    const [pickupLng, setPickupLng] = useState(null);
    const [pickupAddrObj, setPickupAddrObj] = useState(null);

    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [userLat, setUserLat] = useState(location?.lat || null);
    const [userLng, setUserLng] = useState(location?.lng || null);
    const [deliveryAddrObj, setDeliveryAddrObj] = useState(null);

    const [sameAddress, setSameAddress] = useState(true);
    const [addressModalTarget, setAddressModalTarget] = useState('DELIVERY'); // 'PICKUP' | 'DELIVERY'
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
    
    const [voucherCode, setVoucherCode] = useState('');
    const [activeVouchers, setActiveVouchers] = useState([]);
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset step & search khi mở modal
    useEffect(() => {
        if (isOpen) {
            setCurrentStep(1);
            setServiceSearch('');
        }
    }, [isOpen]);

    // Fetch Vouchers của Shop
    useEffect(() => {
        if (shop && shop.id) {
            const customerId = currentUser?.userId || currentUser?.id;
            const url = customerId 
                ? `/vouchers/shop/${shop.id}?customerId=${customerId}`
                : `/vouchers/shop/${shop.id}`;
            axiosClient.get(url)
                .then(res => {
                    if (res && res.data) {
                        setActiveVouchers(res.data);
                    }
                })
                .catch(err => console.error("Error fetching vouchers", err));
        }
    }, [shop, currentUser]);

    // Tự động lấy Sổ địa chỉ và thiết lập địa chỉ mặc định khi mở modal
    useEffect(() => {
        if (currentUser && isOpen) {
            setReceiverName(currentUser.fullName || '');
            setReceiverPhone(currentUser.phone || '');

            axiosClient.get('/addresses')
                .then(res => {
                    if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
                        setAddresses(res.data);
                        const defaultAddr = res.data.find(a => a.isDefault) || res.data[0];
                        
                        if (defaultAddr) {
                            setPickupAddress(prev => prev || defaultAddr.address);
                            setPickupLat(prev => prev ?? defaultAddr.latitude);
                            setPickupLng(prev => prev ?? defaultAddr.longitude);
                            setPickupAddrObj(prev => prev || defaultAddr);

                            setDeliveryAddress(prev => prev || defaultAddr.address);
                            setUserLat(prev => prev ?? defaultAddr.latitude);
                            setUserLng(prev => prev ?? defaultAddr.longitude);
                            setDeliveryAddrObj(prev => prev || defaultAddr);
                        }
                    }
                })
                .catch(err => console.error("Error loading address book:", err));
        }
    }, [currentUser, isOpen]);

    // Đồng bộ nếu người dùng tick "Dùng chung địa chỉ"
    useEffect(() => {
        if (sameAddress && inboundType === 'SHOP_PICK_UP' && outboundType === 'SHOP_DELIVERY') {
            if (pickupAddress) {
                setDeliveryAddress(pickupAddress);
                setUserLat(pickupLat);
                setUserLng(pickupLng);
                setDeliveryAddrObj(pickupAddrObj);
            }
        }
    }, [sameAddress, pickupAddress, pickupLat, pickupLng, pickupAddrObj, inboundType, outboundType]);

    // Tính khoảng cách cho từng chiều giao nhận
    const maxDist = shop?.maxDeliveryDistance || 10;

    const pickupDistance = pickupLat && pickupLng && shop?.latitude && shop?.longitude
        ? calculateDistance(pickupLat, pickupLng, shop.latitude, shop.longitude)
        : (shop?.distanceKm || 0);

    const deliveryDistance = userLat && userLng && shop?.latitude && shop?.longitude
        ? calculateDistance(userLat, userLng, shop.latitude, shop.longitude)
        : (shop?.distanceKm || 0);

    const isPickupFar = inboundType === 'SHOP_PICK_UP' && pickupDistance > maxDist;
    const isDeliveryFar = outboundType === 'SHOP_DELIVERY' && deliveryDistance > maxDist;
    const isAnyFar = isPickupFar || isDeliveryFar;

    const calcLegFee = (distKm) => {
        if (distKm > maxDist) return 0;
        let baseFee = shop?.baseShippingFee || 15000;
        let extraFeePerKm = shop?.extraShippingFeePerKm || 5000;
        let extraFee = distKm > 2 ? Math.ceil(distKm - 2) * extraFeePerKm : 0;
        return baseFee + extraFee;
    };

    const pickupFee = inboundType === 'SHOP_PICK_UP' ? calcLegFee(pickupDistance) : 0;
    const deliveryFee = outboundType === 'SHOP_DELIVERY' ? calcLegFee(deliveryDistance) : 0;
    const shippingFee = pickupFee + deliveryFee;

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

    const serviceFee = (shop?.services || []).reduce((total, s) => {
        if (s.price === 0) return total;
        return total + (s.price * (quantities[s.id] || 0));
    }, 0);
    
    const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0) + Object.keys(contactServices).length;
    
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
    
    const needsPickup = inboundType === 'SHOP_PICK_UP';
    const needsDelivery = outboundType === 'SHOP_DELIVERY';
    const hasShipping = needsPickup || needsDelivery;

    const isPickupMissing = needsPickup && !pickupAddress;
    const isDeliveryMissing = needsDelivery && !deliveryAddress;
    const isContactMissing = hasShipping && (!receiverName || !receiverPhone || isPickupMissing || isDeliveryMissing);

    // Validation checks per step
    const isStep1Valid = totalItems > 0;
    const isStep2Valid = !isContactMissing && !isAnyFar;

    const handleNextStep = () => {
        if (currentStep === 1) {
            if (!isStep1Valid) {
                toast.error("Vui lòng chọn ít nhất 1 dịch vụ để tiếp tục.");
                return;
            }
            setCurrentStep(2);
        } else if (currentStep === 2) {
            if (isPickupMissing) {
                toast.error("Vui lòng chọn hoặc nhập Địa chỉ nhận đồ.");
                return;
            }
            if (isDeliveryMissing) {
                toast.error("Vui lòng chọn hoặc nhập Địa chỉ trả đồ.");
                return;
            }
            if (hasShipping && !receiverPhone) {
                toast.error("Vui lòng nhập Số điện thoại liên hệ.");
                return;
            }
            if (isAnyFar) {
                toast.error(`Địa chỉ giao nhận vượt quá bán kính phục vụ của tiệm (${maxDist}km).`);
                return;
            }
            setCurrentStep(3);
        }
    };

    const handlePrevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleJumpToStep = (targetStep) => {
        if (targetStep === 1) {
            setCurrentStep(1);
        } else if (targetStep === 2) {
            if (isStep1Valid) setCurrentStep(2);
            else toast.error("Vui lòng chọn ít nhất 1 dịch vụ trước.");
        } else if (targetStep === 3) {
            if (!isStep1Valid) {
                toast.error("Vui lòng chọn dịch vụ trước.");
            } else if (!isStep2Valid) {
                toast.error("Vui lòng hoàn thiện thông tin giao nhận trước.");
            } else {
                setCurrentStep(3);
            }
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (totalItems === 0 || isContactMissing || isAnyFar || isSubmitting) return;

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
                note, 
                items,
                inboundType, 
                outboundType, 
                paymentMethod,
                receiverName: hasShipping ? receiverName : null,
                receiverPhone: hasShipping ? receiverPhone : null,
                // Chiều nhận đồ
                pickupAddress: needsPickup ? pickupAddress : null,
                pickupLat: needsPickup ? pickupLat : null,
                pickupLng: needsPickup ? pickupLng : null,
                // Chiều trả đồ
                deliveryAddress: needsDelivery ? deliveryAddress : (needsPickup ? pickupAddress : null),
                userLat: needsDelivery ? userLat : (needsPickup ? pickupLat : (location?.lat || null)),
                userLng: needsDelivery ? userLng : (needsPickup ? pickupLng : (location?.lng || null)),
                voucherCode: voucherCode || null
            });
            if (response.success) {
                onSuccess();
            } else {
                toast.error(response.message || "Có lỗi xảy ra khi tạo đơn");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi kết nối hoặc hệ thống!");
        } finally { 
            setIsSubmitting(false); 
        }
    };

    const handleOpenAddressModal = (target) => {
        setAddressModalTarget(target);
        setIsAddressModalOpen(true);
    };

    const handleSelectAddress = (addr) => {
        if (addressModalTarget === 'PICKUP') {
            setPickupAddress(addr.address);
            setPickupLat(addr.latitude);
            setPickupLng(addr.longitude);
            setPickupAddrObj(addr);
            if (sameAddress && outboundType === 'SHOP_DELIVERY') {
                setDeliveryAddress(addr.address);
                setUserLat(addr.latitude);
                setUserLng(addr.longitude);
                setDeliveryAddrObj(addr);
            }
        } else {
            setDeliveryAddress(addr.address);
            setUserLat(addr.latitude);
            setUserLng(addr.longitude);
            setDeliveryAddrObj(addr);
            if (addr.address !== pickupAddress) {
                setSameAddress(false);
            }
        }
        setIsAddressModalOpen(false);
    };

    // Filter services list based on search term
    const filteredServices = useMemo(() => {
        if (!shop?.services) return [];
        if (!serviceSearch.trim()) return shop.services;
        const query = serviceSearch.toLowerCase().trim();
        return shop.services.filter(s => s.name?.toLowerCase().includes(query));
    }, [shop?.services, serviceSearch]);

    if (!isOpen || !shop) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden">
                
                {/* 1. Header: Shop Name & Distance */}
                <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-white z-20 shrink-0">
                    <div className="flex flex-col min-w-0">
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">{shop.name}</h2>
                        <span className="text-xs font-semibold text-slate-700 flex items-center">
                            <svg className="w-3.5 h-3.5 mr-1 text-slate-500 stroke-1.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Cách bạn {(deliveryDistance || pickupDistance || 0).toFixed(1)} km
                        </span>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-slate-500 hover:text-slate-800 transition-colors p-2 rounded-full hover:bg-slate-100 shrink-0"
                        title="Đóng modal"
                    >
                        <svg className="w-5 h-5 stroke-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                {/* 2. Step Progress Bar Indicator */}
                <div className="px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
                    <div className="flex items-center justify-between relative">
                        {/* Connecting Line */}
                        <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-0.5 bg-slate-300 -z-0">
                            <div 
                                className="h-full bg-teal-500 transition-all duration-300 ease-out" 
                                style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}
                            />
                        </div>

                        {/* Step 1 Tab */}
                        <button
                            type="button"
                            onClick={() => handleJumpToStep(1)}
                            className="relative z-10 flex items-center gap-2 group focus:outline-none"
                        >
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm ${
                                currentStep === 1 
                                    ? 'bg-teal-600 text-white ring-4 ring-teal-100 scale-105' 
                                    : (isStep1Valid 
                                        ? 'bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700' 
                                        : 'bg-white border-2 border-slate-400 text-slate-700')
                            }`}>
                                {currentStep > 1 && isStep1Valid ? (
                                    <svg className="w-4 h-4 stroke-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : '1'}
                            </span>
                            <div className="hidden sm:flex flex-col text-left">
                                <span className={`text-xs font-bold leading-tight ${currentStep === 1 ? 'text-teal-800' : 'text-slate-800'}`}>
                                    Dịch vụ
                                </span>
                                <span className="text-[10px] text-slate-600 font-medium">
                                    {totalItems > 0 ? `${totalItems} món đã chọn` : 'Chọn đồ giặt'}
                                </span>
                            </div>
                        </button>

                        {/* Step 2 Tab */}
                        <button
                            type="button"
                            onClick={() => handleJumpToStep(2)}
                            className={`relative z-10 flex items-center gap-2 group focus:outline-none ${!isStep1Valid ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm ${
                                currentStep === 2 
                                    ? 'bg-teal-600 text-white ring-4 ring-teal-100 scale-105' 
                                    : (currentStep > 2 && isStep2Valid 
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                                        : 'bg-white border-2 border-slate-400 text-slate-700')
                            }`}>
                                {currentStep > 2 && isStep2Valid ? (
                                    <svg className="w-4 h-4 stroke-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : '2'}
                            </span>
                            <div className="hidden sm:flex flex-col text-left">
                                <span className={`text-xs font-bold leading-tight ${currentStep === 2 ? 'text-teal-800' : 'text-slate-800'}`}>
                                    Giao nhận
                                </span>
                                <span className="text-[10px] text-slate-600 font-medium">
                                    Địa chỉ & Giờ hẹn
                                </span>
                            </div>
                        </button>

                        {/* Step 3 Tab */}
                        <button
                            type="button"
                            onClick={() => handleJumpToStep(3)}
                            className={`relative z-10 flex items-center gap-2 group focus:outline-none ${(!isStep1Valid || !isStep2Valid) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm ${
                                currentStep === 3 
                                    ? 'bg-teal-600 text-white ring-4 ring-teal-100 scale-105' 
                                    : 'bg-white border-2 border-slate-400 text-slate-700'
                            }`}>
                                3
                            </span>
                            <div className="hidden sm:flex flex-col text-left">
                                <span className={`text-xs font-bold leading-tight ${currentStep === 3 ? 'text-teal-800' : 'text-slate-800'}`}>
                                    Thanh toán
                                </span>
                                <span className="text-[10px] text-slate-600 font-medium">
                                    Mã giảm & Xác nhận
                                </span>
                            </div>
                        </button>
                    </div>
                </div>
                
                {/* 3. Wizard Step Body */}
                <div className="overflow-y-auto flex-1 min-h-0 p-4 sm:p-6 bg-slate-50/50 custom-scrollbar">
                    
                    {/* ================= STEP 1: CHỌN DỊCH VỤ ================= */}
                    {currentStep === 1 && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200/70">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                                        <span>Danh sách dịch vụ của tiệm</span>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-semibold">
                                            {shop.services?.length || 0} dịch vụ
                                        </span>
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Chọn số lượng quần áo/đồ giặt bạn cần xử lý
                                    </p>
                                </div>

                                {/* Fast Search for Long Service Lists */}
                                {shop.services && shop.services.length > 3 && (
                                    <div className="relative w-full sm:w-56 shrink-0">
                                        <input
                                            type="text"
                                            placeholder="Tìm dịch vụ..."
                                            value={serviceSearch}
                                            onChange={e => setServiceSearch(e.target.value)}
                                            className="w-full text-xs py-2 pl-8 pr-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all shadow-2xs"
                                        />
                                        <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        {serviceSearch && (
                                            <button 
                                                onClick={() => setServiceSearch('')}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Service Cards List */}
                            <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-sm">
                                {filteredServices.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400">
                                        <p className="text-sm">Không tìm thấy dịch vụ nào phù hợp với "{serviceSearch}"</p>
                                        <button 
                                            type="button" 
                                            onClick={() => setServiceSearch('')} 
                                            className="text-xs text-teal-600 hover:underline mt-2 font-semibold"
                                        >
                                            Xóa tìm kiếm
                                        </button>
                                    </div>
                                ) : (
                                    filteredServices.map(s => {
                                        const isContact = s.price === 0;
                                        const qty = quantities[s.id] || 0;
                                        const isChecked = isContact && !!contactServices[s.id];
                                        const isSelected = qty > 0 || isChecked;

                                        return (
                                            <div 
                                                key={s.id} 
                                                className={`flex items-center justify-between p-3.5 sm:p-4 transition-colors ${
                                                    isSelected ? 'bg-teal-50/30' : 'hover:bg-slate-50/80'
                                                }`}
                                            >
                                                <div className="flex flex-col flex-1 pr-3">
                                                    <span className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                                                        {s.name}
                                                    </span>
                                                    {isContact ? (
                                                        <div className="mt-1 flex items-center gap-1.5">
                                                            <span className="text-[11px] text-teal-700 font-bold tracking-tight bg-teal-50 px-2 py-0.5 rounded-md inline-block border border-teal-100">
                                                                BÁO GIÁ SAU
                                                            </span>
                                                            <span className="text-[11px] text-slate-400 font-medium">
                                                                (Tiệm kiểm tra đồ & báo giá chính xác)
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="mt-0.5 flex items-baseline gap-1">
                                                            <span className="text-sm font-bold text-slate-800">
                                                                {formatMoney(s.price)}
                                                            </span>
                                                            <span className="text-xs text-slate-400 font-medium">
                                                                / {s.unit}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="shrink-0">
                                                    {isContact ? (
                                                        <label className="flex items-center cursor-pointer gap-2 select-none group bg-slate-50 hover:bg-teal-50/60 p-2 rounded-xl border border-slate-200 transition-colors">
                                                            <span className="text-xs font-semibold text-slate-700 group-hover:text-teal-800">
                                                                {isChecked ? 'Đã chọn' : 'Chọn món'}
                                                            </span>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={isChecked}
                                                                onChange={() => handleToggleContact(s.id)}
                                                                className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-600 cursor-pointer"
                                                            />
                                                        </label>
                                                    ) : (
                                                        <div className="flex items-center space-x-1.5 bg-white rounded-xl p-1 border border-slate-200/80 shadow-2xs">
                                                            <button 
                                                                type="button" 
                                                                onClick={() => handleQtyChange(s.id, -1)} 
                                                                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-slate-600 rounded-lg hover:bg-slate-100 transition-colors font-bold text-base sm:text-lg select-none disabled:opacity-30"
                                                                disabled={qty === 0}
                                                            >
                                                                -
                                                            </button>
                                                            <span className="w-7 sm:w-8 text-center font-bold text-slate-900 text-sm sm:text-base">
                                                                {qty}
                                                            </span>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => handleQtyChange(s.id, 1)} 
                                                                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-slate-600 rounded-lg hover:bg-slate-100 transition-colors font-bold text-base sm:text-lg select-none"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Step 1 Quick Info Bar */}
                            <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between text-xs sm:text-sm">
                                <span className="text-slate-600 font-medium">
                                    Đã chọn: <strong className="text-teal-700 font-bold">{totalItems} món</strong>
                                    {Object.keys(contactServices).length > 0 && (
                                        <span className="text-slate-400 text-xs ml-1 font-normal">
                                            (gồm {Object.keys(contactServices).length} món báo giá sau)
                                        </span>
                                    )}
                                </span>
                                <span className="font-bold text-slate-900">
                                    Tạm tính: <span className="text-teal-700 font-black">{formatMoney(serviceFee)}</span>
                                </span>
                            </div>
                        </div>
                    )}

                    {/* ================= STEP 2: GIAO NHẬN & THỜI GIAN ================= */}
                    {currentStep === 2 && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Alert if out of radius */}
                            {isAnyFar && (
                                <div className="p-3.5 bg-rose-50 text-rose-800 rounded-2xl border border-rose-200 text-xs sm:text-sm flex items-start space-x-2">
                                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600 stroke-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                    </svg>
                                    <span className="font-medium">
                                        Tiệm chỉ nhận giao nhận trong bán kính <strong>{maxDist}km</strong>. Vui lòng chọn địa chỉ gần hơn hoặc chọn phương án tự mang đồ tới tiệm.
                                    </span>
                                </div>
                            )}

                            {/* Inbound & Outbound Type Selection Cards */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider pl-1">
                                        Chiều gửi đồ (Inbound)
                                    </p>
                                    <label className={`flex flex-col p-3.5 border-2 rounded-2xl cursor-pointer transition-all ${
                                        inboundType === 'CUSTOMER_DROP_OFF' ? 'bg-teal-50/40 border-teal-600 shadow-sm' : 'bg-white border-slate-200 hover:border-teal-300'
                                    }`}>
                                        <div className="flex items-center space-x-3">
                                            <input 
                                                type="radio" 
                                                name="inboundChoice"
                                                checked={inboundType === 'CUSTOMER_DROP_OFF'} 
                                                onChange={() => setInboundType('CUSTOMER_DROP_OFF')} 
                                                className="w-4 h-4 text-teal-600 focus:ring-teal-600" 
                                            />
                                            <span className="font-bold text-slate-900 text-sm">Tôi tự mang tới tiệm</span>
                                        </div>
                                        <span className="ml-7 text-xs font-medium text-emerald-600 mt-0.5">Miễn phí</span>
                                    </label>
                                    <label className={`flex flex-col p-3.5 border-2 rounded-2xl transition-all cursor-pointer ${
                                        inboundType === 'SHOP_PICK_UP' ? 'bg-teal-50/40 border-teal-600 shadow-sm' : 'bg-white border-slate-200 hover:border-teal-300'
                                    }`}>
                                        <div className="flex items-center space-x-3">
                                            <input 
                                                type="radio" 
                                                name="inboundChoice"
                                                checked={inboundType === 'SHOP_PICK_UP'} 
                                                onChange={() => setInboundType('SHOP_PICK_UP')} 
                                                className="w-4 h-4 text-teal-600 focus:ring-teal-600" 
                                            />
                                            <span className="font-bold text-slate-900 text-sm">Shop đến lấy tận nơi</span>
                                        </div>
                                        <span className="ml-7 text-xs font-bold text-teal-700 mt-0.5">
                                            Phí: {formatMoney(calcLegFee(pickupDistance))}
                                        </span>
                                    </label>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider pl-1">
                                        Chiều nhận lại (Outbound)
                                    </p>
                                    <label className={`flex flex-col p-3.5 border-2 rounded-2xl cursor-pointer transition-all ${
                                        outboundType === 'CUSTOMER_PICK_UP' ? 'bg-teal-50/40 border-teal-600 shadow-sm' : 'bg-white border-slate-200 hover:border-teal-300'
                                    }`}>
                                        <div className="flex items-center space-x-3">
                                            <input 
                                                type="radio" 
                                                name="outboundChoice"
                                                checked={outboundType === 'CUSTOMER_PICK_UP'} 
                                                onChange={() => setOutboundType('CUSTOMER_PICK_UP')} 
                                                className="w-4 h-4 text-teal-600 focus:ring-teal-600" 
                                            />
                                            <span className="font-bold text-slate-900 text-sm">Tôi tự đến tiệm lấy</span>
                                        </div>
                                        <span className="ml-7 text-xs font-medium text-emerald-600 mt-0.5">Miễn phí</span>
                                    </label>
                                    <label className={`flex flex-col p-3.5 border-2 rounded-2xl transition-all cursor-pointer ${
                                        outboundType === 'SHOP_DELIVERY' ? 'bg-teal-50/40 border-teal-600 shadow-sm' : 'bg-white border-slate-200 hover:border-teal-300'
                                    }`}>
                                        <div className="flex items-center space-x-3">
                                            <input 
                                                type="radio" 
                                                name="outboundChoice"
                                                checked={outboundType === 'SHOP_DELIVERY'} 
                                                onChange={() => setOutboundType('SHOP_DELIVERY')} 
                                                className="w-4 h-4 text-teal-600 focus:ring-teal-600" 
                                            />
                                            <span className="font-bold text-slate-900 text-sm">Shop giao tận nhà</span>
                                        </div>
                                        <span className="ml-7 text-xs font-bold text-teal-700 mt-0.5">
                                            Phí: {formatMoney(calcLegFee(deliveryDistance))}
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Contact Details & Addresses Section (when shipping is active) */}
                            {hasShipping && (
                                <div className="space-y-4 pt-1">
                                    {/* Contact Person Details */}
                                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                                        <h4 className="font-bold text-slate-800 mb-3 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                            <span>👤 Thông tin người liên hệ</span>
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Họ tên *</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="VD: Nguyễn Văn A" 
                                                    value={receiverName} 
                                                    onChange={e => setReceiverName(e.target.value)} 
                                                    className="w-full border-slate-200 rounded-xl text-sm p-2.5 bg-slate-50 border outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-900 transition-all font-medium" 
                                                    required 
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Số điện thoại *</label>
                                                <input 
                                                    type="tel" 
                                                    placeholder="VD: 0912345678" 
                                                    value={receiverPhone} 
                                                    onChange={e => setReceiverPhone(e.target.value)} 
                                                    className="w-full border-slate-200 rounded-xl text-sm p-2.5 bg-slate-50 border outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-900 transition-all font-medium" 
                                                    required 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pickup Address Card */}
                                    {needsPickup && (
                                        <div className="bg-white p-4 rounded-2xl border-2 border-teal-500/40 bg-teal-50/10 shadow-2xs space-y-3">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
                                                    <h4 className="font-bold text-slate-900 text-sm">
                                                        Địa chỉ nhận đồ <span className="font-normal text-slate-500 text-xs">(Tiệm đến lấy đồ)</span>
                                                    </h4>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleOpenAddressModal('PICKUP')} 
                                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs rounded-lg border border-teal-200 transition-colors shadow-2xs"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                                                    </svg>
                                                    [Sổ địa chỉ]
                                                </button>
                                            </div>

                                            {pickupAddrObj && (
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                                                        {pickupAddrObj.label || 'Sổ địa chỉ'}
                                                    </span>
                                                    {pickupAddrObj.isDefault && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                                                            Mặc định
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-slate-500">
                                                        • Cách tiệm {pickupDistance.toFixed(1)} km
                                                    </span>
                                                </div>
                                            )}

                                            <input 
                                                type="text" 
                                                placeholder="Số nhà, tên đường, phường xã..." 
                                                value={pickupAddress} 
                                                onChange={e => setPickupAddress(e.target.value)} 
                                                className="w-full border-slate-200 rounded-xl text-sm p-3 bg-white border outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-900 transition-all font-medium" 
                                                required 
                                            />
                                        </div>
                                    )}

                                    {/* Delivery Address Card */}
                                    {needsDelivery && (
                                        <div className="bg-white p-4 rounded-2xl border-2 border-indigo-500/40 bg-indigo-50/10 shadow-2xs space-y-3">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                                                    <h4 className="font-bold text-slate-900 text-sm">
                                                        Địa chỉ trả đồ <span className="font-normal text-slate-500 text-xs">(Tiệm giao sau khi giặt xong)</span>
                                                    </h4>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleOpenAddressModal('DELIVERY')} 
                                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg border border-indigo-200 transition-colors shadow-2xs"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                                                    </svg>
                                                    [Sổ địa chỉ]
                                                </button>
                                            </div>

                                            {needsPickup && (
                                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none pb-1">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={sameAddress} 
                                                        onChange={e => {
                                                            const checked = e.target.checked;
                                                            setSameAddress(checked);
                                                            if (checked) {
                                                                setDeliveryAddress(pickupAddress);
                                                                setUserLat(pickupLat);
                                                                setUserLng(pickupLng);
                                                                setDeliveryAddrObj(pickupAddrObj);
                                                            }
                                                        }} 
                                                        className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                                                    />
                                                    <span>Dùng chung với địa chỉ nhận đồ</span>
                                                </label>
                                            )}

                                            {(!sameAddress || !needsPickup) && deliveryAddrObj && (
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                                                        {deliveryAddrObj.label || 'Sổ địa chỉ'}
                                                    </span>
                                                    {deliveryAddrObj.isDefault && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                                                            Mặc định
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-slate-500">
                                                        • Cách tiệm {deliveryDistance.toFixed(1)} km
                                                    </span>
                                                </div>
                                            )}

                                            {(!sameAddress || !needsPickup) && (
                                                <input 
                                                    type="text" 
                                                    placeholder="Số nhà, tên đường, phường xã..." 
                                                    value={deliveryAddress} 
                                                    onChange={e => setDeliveryAddress(e.target.value)} 
                                                    className="w-full border-slate-200 rounded-xl text-sm p-3 bg-white border outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 transition-all font-medium" 
                                                    required 
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Appointment Time Selection */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                    <span>📅 Thời gian hẹn gửi/nhận</span>
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Ngày hẹn</label>
                                        <input 
                                            type="date" 
                                            value={bookingDate} 
                                            onChange={e => setBookingDate(e.target.value)} 
                                            required 
                                            min={new Date().toISOString().split('T')[0]} 
                                            className="w-full border-slate-200 rounded-xl text-sm p-2.5 bg-slate-50 border shadow-2xs outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-900 transition-all font-medium" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Khung giờ</label>
                                        <select 
                                            value={timeSlot} 
                                            onChange={e => setTimeSlot(e.target.value)} 
                                            className="w-full border-slate-200 rounded-xl text-sm p-2.5 bg-slate-50 border shadow-2xs outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-900 transition-all font-medium"
                                        >
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
                            </div>

                            {/* Additional Notes */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                                <label className="block font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">
                                    📝 Ghi chú cho tiệm (Tùy chọn)
                                </label>
                                <textarea 
                                    value={note} 
                                    onChange={e => setNote(e.target.value)} 
                                    rows="2" 
                                    placeholder="VD: Quần áo dễ lem màu, cần giặt nước lạnh riêng; gọi trước khi tới 15 phút..." 
                                    className="w-full border-slate-200 rounded-xl text-sm p-2.5 bg-slate-50 border outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 resize-none text-slate-900 transition-all font-medium"
                                />
                            </div>
                        </div>
                    )}

                    {/* ================= STEP 3: THANH TOÁN & XÁC NHẬN ================= */}
                    {currentStep === 3 && (
                        <div className="space-y-5 animate-fade-in">
                            {/* Payment Method Selector */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                    <span>💳 Phương thức thanh toán</span>
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <label 
                                        className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                                            paymentMethod === 'COD' 
                                                ? 'bg-teal-50/30 border-teal-600 shadow-sm' 
                                                : 'bg-white border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <input 
                                            type="radio" 
                                            name="bookingPaymentMethod" 
                                            checked={paymentMethod === 'COD'} 
                                            onChange={() => setPaymentMethod('COD')}
                                            className="mt-1 text-teal-600 focus:ring-teal-600"
                                        />
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-slate-900 text-sm">Tiền mặt (COD)</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Trả tiền trực tiếp cho shipper hoặc tại quầy khi nhận đồ sạch.
                                            </p>
                                        </div>
                                    </label>

                                    <label 
                                        className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                                            paymentMethod === 'VIETQR' 
                                                ? 'bg-teal-50/30 border-teal-600 shadow-sm' 
                                                : 'bg-white border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <input 
                                            type="radio" 
                                            name="bookingPaymentMethod" 
                                            checked={paymentMethod === 'VIETQR'} 
                                            onChange={() => setPaymentMethod('VIETQR')}
                                            className="mt-1 text-teal-600 focus:ring-teal-600"
                                        />
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-slate-900 text-sm">Chuyển khoản VietQR</span>
                                                <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded font-bold">
                                                    Khuyên dùng
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Quét mã QR tiện lợi qua mọi app Ngân hàng / Mobile Banking.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Voucher & Discounts */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
                                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center justify-between">
                                    <span>🎟️ Mã Giảm Giá (Tùy chọn)</span>
                                    {voucherCode && (
                                        <button 
                                            type="button" 
                                            onClick={() => setVoucherCode('')} 
                                            className="text-[11px] text-rose-500 hover:underline normal-case font-medium"
                                        >
                                            Bỏ áp dụng
                                        </button>
                                    )}
                                </h4>
                                
                                {activeVouchers.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                        {activeVouchers.map(v => {
                                            const isCompensation = v.targetUserId != null || v.code.startsWith('REFUND-') || v.code.startsWith('ADMIN-REFUND-');
                                            const isSelected = voucherCode === v.code;
                                            return (
                                                <button
                                                    type="button"
                                                    key={v.id}
                                                    onClick={() => setVoucherCode(v.code)}
                                                    className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all ${
                                                        isSelected
                                                            ? (isCompensation 
                                                                ? 'bg-amber-100 border-amber-500 text-amber-900 font-bold ring-2 ring-amber-400/30' 
                                                                : 'bg-teal-50 border-teal-500 text-teal-700 font-semibold ring-2 ring-teal-400/30')
                                                            : (isCompensation
                                                                ? 'bg-amber-50 border-amber-300 text-amber-800 font-medium hover:bg-amber-100'
                                                                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50')
                                                    }`}
                                                >
                                                    {isCompensation ? `🎁 ${v.code} (Đền bù ${formatMoney(v.discountValue)})` : v.code}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={voucherCode}
                                        onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                                        placeholder="Nhập mã voucher..."
                                        className="flex-1 border-slate-200 rounded-xl text-sm p-2.5 bg-slate-50 border focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none uppercase text-slate-900 transition-all font-semibold"
                                    />
                                </div>

                                {voucherCode && (
                                    discountAmount > 0 ? (
                                        <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                            Mã hợp lệ! Đã giảm {formatMoney(discountAmount)}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-amber-600 font-medium">
                                            Mã không hợp lệ hoặc đơn hàng chưa đạt giá trị tối thiểu.
                                        </p>
                                    )
                                )}
                            </div>

                            {/* Order Review & Items Breakdown */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center justify-between">
                                    <span>📋 Tóm tắt đơn hàng</span>
                                    <button 
                                        type="button" 
                                        onClick={() => setCurrentStep(1)} 
                                        className="text-[11px] text-teal-600 hover:underline normal-case font-semibold"
                                    >
                                        Sửa dịch vụ
                                    </button>
                                </h4>

                                {/* Itemized List */}
                                <div className="divide-y divide-slate-100 text-xs sm:text-sm">
                                    {(shop.services || []).filter(s => quantities[s.id] > 0).map(s => (
                                        <div key={s.id} className="py-1.5 flex justify-between items-center text-slate-700">
                                            <span>{s.name} <strong className="text-slate-900">x {quantities[s.id]}</strong></span>
                                            <span className="font-semibold text-slate-900">
                                                {formatMoney(s.price * quantities[s.id])}
                                            </span>
                                        </div>
                                    ))}
                                    {(shop.services || []).filter(s => contactServices[s.id]).map(s => (
                                        <div key={s.id} className="py-1.5 flex justify-between items-center text-teal-800">
                                            <span>{s.name}</span>
                                            <span className="font-bold text-[11px] bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                                                BÁO GIÁ SAU
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Logistics Review Box */}
                                <div className="p-3 bg-slate-50/80 rounded-xl text-xs space-y-1.5 text-slate-700 border border-slate-200">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600 font-medium">Giao nhận:</span>
                                        <span className="font-semibold text-slate-900 text-right">
                                            {inboundType === 'SHOP_PICK_UP' ? 'Tiệm đến lấy' : 'Tự mang đến'} • {outboundType === 'SHOP_DELIVERY' ? 'Tiệm giao về' : 'Tự đến lấy'}
                                        </span>
                                    </div>
                                    {hasShipping && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-600 font-medium">Liên hệ:</span>
                                            <span className="font-semibold text-slate-900 text-right">{receiverName} - {receiverPhone}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-slate-600 font-medium">Lịch hẹn:</span>
                                        <span className="font-semibold text-slate-900">{bookingDate} ({timeSlot.slice(0, 5)})</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600 font-medium">Thanh toán:</span>
                                        <span className="font-bold text-slate-900">
                                            {paymentMethod === 'VIETQR' ? '🏦 Chuyển khoản VietQR' : '💵 Tiền mặt (COD)'}
                                        </span>
                                    </div>
                                    {note && (
                                        <div className="pt-1 border-t border-slate-200 text-slate-600 italic">
                                            "{note}"
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 4. Sticky Footer with Receipt & Step Action Buttons */}
                <div className="p-4 sm:p-5 border-t border-slate-200 bg-white/95 backdrop-blur-sm z-20 shrink-0">
                    {/* Subtotal & Details Preview on Steps 1 & 2 */}
                    {currentStep !== 3 && (
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 text-xs sm:text-sm">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-700">Tạm tính ({totalItems} món):</span>
                                <span className="font-black text-slate-900 text-sm sm:text-base">
                                    {formatMoney(finalTotalPrice)}
                                </span>
                            </div>
                            {shippingFee > 0 && (
                                <span className="text-[11px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded font-bold border border-teal-200">
                                    + Phí ship {formatMoney(shippingFee)}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Step 3 Full Pricing Breakdown */}
                    {currentStep === 3 && (
                        <div className="space-y-1.5 mb-3.5 text-xs sm:text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-700 font-semibold">Tiền dịch vụ:</span>
                                <span className="font-bold text-slate-900">{formatMoney(serviceFee)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-700 font-semibold">Phí giao nhận:</span>
                                <span className="font-bold text-slate-900">
                                    {shippingFee > 0 ? (
                                        <span>
                                            {formatMoney(shippingFee)}
                                            {needsPickup && needsDelivery && (
                                                <span className="text-[11px] font-medium text-slate-500 ml-1">
                                                    (Lấy: {formatMoney(pickupFee)} + Giao: {formatMoney(deliveryFee)})
                                                </span>
                                            )}
                                        </span>
                                    ) : 'Miễn phí'}
                                </span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-emerald-700 font-bold">
                                    <span>Giảm giá voucher:</span>
                                    <span>-{formatMoney(discountAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
                                <span className="font-bold text-slate-900 text-xs uppercase">Tổng thanh toán tạm tính:</span>
                                <span className="text-xl sm:text-2xl font-black text-teal-700">
                                    {formatMoney(finalTotalPrice)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Action Navigation Buttons */}
                    <div className="flex items-center gap-2.5">
                        {/* Back / Cancel button */}
                        {currentStep === 1 ? (
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-3 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-sm transition-colors"
                            >
                                Hủy bỏ
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handlePrevStep}
                                className="px-4 py-3 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-sm transition-colors flex items-center gap-1.5 shrink-0"
                            >
                                <svg className="w-4 h-4 stroke-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                                <span>Quay lại</span>
                            </button>
                        )}

                        {/* Next / Submit button */}
                        {currentStep === 1 && (
                            <button
                                type="button"
                                onClick={handleNextStep}
                                disabled={!isStep1Valid}
                                className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-2xl shadow-sm transition-all text-sm sm:text-base flex items-center justify-center gap-2"
                            >
                                <span>Tiếp tục: Giao nhận</span>
                                <svg className="w-4 h-4 stroke-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        )}

                        {currentStep === 2 && (
                            <button
                                type="button"
                                onClick={handleNextStep}
                                disabled={!isStep2Valid}
                                className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-2xl shadow-sm transition-all text-sm sm:text-base flex items-center justify-center gap-2"
                            >
                                <span>Tiếp tục: Thanh toán</span>
                                <svg className="w-4 h-4 stroke-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        )}

                        {currentStep === 3 && (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={!isStep1Valid || !isStep2Valid || isSubmitting}
                                className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-2xl shadow-md transition-all text-sm sm:text-base flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Đang tạo đơn hàng...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5 stroke-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Xác nhận đặt đơn</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
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