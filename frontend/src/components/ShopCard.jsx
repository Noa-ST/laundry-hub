import React, { useState } from 'react';
import BookingModal from './BookingModal';
import ShopReviewsModal from './ShopReviewsModal';
import { useAuth } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';

const formatMoney = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

const ShopCard = ({ shop, location }) => {
    const { isAuthenticated } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isReviewsOpen, setIsReviewsOpen] = useState(false);
    const [activeVouchers, setActiveVouchers] = useState([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);

    const images = shop.coverImage ? [shop.coverImage, ...(shop.galleryImages || [])] : [];

    const handlePrevImage = (e) => {
        e.stopPropagation();
        setCurrentImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
    };

    const handleNextImage = (e) => {
        e.stopPropagation();
        setCurrentImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
    };

    const handleOpenGallery = () => {
        if (images.length > 0) setIsGalleryOpen(true);
    };

    React.useEffect(() => {
        if (shop && shop.id) {
            axiosClient.get(`/vouchers/shop/${shop.id}`)
                .then(res => {
                    if (res && res.data) {
                        setActiveVouchers(res.data);
                    }
                })
                .catch(err => console.error("Lỗi lấy voucher", err));
        }
    }, [shop]);

    const handleSuccess = () => {
        setIsModalOpen(false);
        // Show minimal toast instead of alert if possible, or keep alert. Let's use standard alert for now
        // wait, prompt says "Hiển thị Toast thông báo tinh gọn."
        // We might not have a toast system, but let's just stick to alert or if there is a toast, use it.
        toast.success("🎉 Đặt lịch thành công!");
        window.location.hash = 'orders';
    };

    const handleBookingClick = () => {
        if (!isAuthenticated) {
            window.dispatchEvent(new Event('auth:required'));
        } else {
            setIsModalOpen(true);
        }
    };

    const minPrice = shop.services?.length > 0 
        ? Math.min(...shop.services.filter(s => s.price > 0).map(s => s.price)) 
        : 0;

    return (
        <>
            <div className="h-full bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col group">
                <div className="relative w-full h-32 shrink-0 bg-slate-100 overflow-hidden group-hover:opacity-90 transition-opacity cursor-pointer" onClick={handleOpenGallery}>
                    {images.length > 0 ? (
                        <>
                            <img src={images[currentImageIndex]} alt={shop.name} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                            {images.length > 1 && (
                                <>
                                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10">
                                        {images.map((_, idx) => (
                                            <div key={idx} className={`w-1.5 h-1.5 rounded-full shadow-sm transition-all ${idx === currentImageIndex ? 'bg-white scale-125' : 'bg-white/50'}`}></div>
                                        ))}
                                    </div>
                                    <button onClick={handlePrevImage} className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/70 hover:bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-slate-800 shadow-sm z-10">
                                        <svg className="w-3.5 h-3.5 pr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <button onClick={handleNextImage} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/70 hover:bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-slate-800 shadow-sm z-10">
                                        <svg className="w-3.5 h-3.5 pl-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                </>
                            )}
                        </>
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <svg className="w-10 h-10 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                    )}
                    
                    {/* Floating gallery count badge */}
                    {images.length > 1 && (
                        <div className="absolute top-2 right-2 bg-slate-900/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1.5 z-10 shadow-sm">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {currentImageIndex + 1}/{images.length}
                        </div>
                    )}
                </div>
                
                <div className="p-5 flex-1 flex flex-col">
                    
                    {/* Header: Name & Distance */}
                    <div className="flex justify-between items-start mb-2 gap-2">
                        <h3 className="font-bold text-slate-900 text-lg line-clamp-1 group-hover:text-teal-700 transition-colors">
                            {shop.name}
                        </h3>
                        <span className="shrink-0 border border-slate-200 bg-slate-50 text-slate-600 text-[11px] px-2.5 py-0.5 rounded-full font-medium">
                            {shop.distanceKm} km
                        </span>
                    </div>
                    
                    {/* Address */}
                    <div className="flex items-start text-sm text-slate-500 mb-3 line-clamp-1">
                        <svg className="w-4 h-4 mr-1.5 shrink-0 text-slate-400 stroke-1.5 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{shop.address || "Chưa cập nhật địa chỉ"}</span>
                    </div>

                    {/* Status row */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs text-slate-600 mb-4">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                            <span className="font-medium text-emerald-700">Đang mở cửa</span>
                        </div>
                        <div className="w-1 h-1 bg-slate-300 rounded-full shrink-0"></div>
                        <button 
                            onClick={() => setIsReviewsOpen(true)}
                            className="flex items-center hover:bg-slate-100 px-1.5 py-0.5 rounded transition-colors whitespace-nowrap"
                        >
                            <svg className="w-3.5 h-3.5 text-amber-400 mr-1 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                            </svg>
                            <span className="font-medium text-slate-700">{shop.rating > 0 ? shop.rating : 'Mới'}</span>
                            <span className="text-slate-400 ml-1">({shop.reviewCount || 0})</span>
                        </button>
                        <div className="w-1 h-1 bg-slate-300 rounded-full shrink-0"></div>
                        <span className="whitespace-nowrap">{shop.operatingHours || '07:00 - 21:00'}</span>
                        <div className="w-1 h-1 bg-slate-300 rounded-full shrink-0"></div>
                        <span className="font-medium whitespace-nowrap">{shop.totalWashers || 0} máy</span>
                    </div>

                    {/* Bottom Content Wrapper (Prices & Vouchers) */}
                    <div className="mt-auto flex flex-col gap-3">
                        {/* Price Preview */}
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5">
                            {shop.services && shop.services.length > 0 ? (
                                <>
                                    {shop.services.slice(0, 2).map(service => (
                                        <div key={service.id} className="flex justify-between items-center text-[13px]">
                                            <span className="text-slate-600 truncate pr-2">{service.name}</span>
                                            <span className="font-semibold text-slate-900 shrink-0">
                                                {service.price > 0 ? formatMoney(service.price) : 'Liên hệ'}
                                                <span className="text-slate-400 font-normal">/{service.unit}</span>
                                            </span>
                                        </div>
                                    ))}
                                    {minPrice > 0 && (
                                        <p className="text-[11px] text-slate-500 font-medium pt-1 mt-1 border-t border-slate-200/50">
                                            Giá chỉ từ <span className="text-slate-700 font-bold">{formatMoney(minPrice)}</span>
                                        </p>
                                    )}
                                </>
                            ) : (
                                <p className="text-[13px] text-slate-400 italic text-center py-2">Đang cập nhật bảng giá</p>
                            )}
                        </div>

                        {/* Vouchers Section */}
                        <div className="min-h-[52px] flex flex-col justify-end">
                            {activeVouchers.length > 0 && (
                                <div>
                                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Ưu đãi của Tiệm</h4>
                                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                        {activeVouchers.map(v => (
                                            <div key={v.id} className="flex-shrink-0 bg-red-50 border border-red-100 rounded-lg px-2 py-1 flex items-center gap-1.5" title={v.discountType === 'PERCENTAGE' ? `Giảm ${v.discountValue}%` : `Giảm ${formatMoney(v.discountValue)}`}>
                                                <svg className="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm0 4.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM10 5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm0 4.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
                                                </svg>
                                                <span className="text-[10px] font-bold text-red-700">{v.code}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer CTA */}
                <div className="p-4 pt-0">
                    <button 
                        onClick={handleBookingClick}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-xl shadow-sm text-sm transition-all focus:ring-2 focus:ring-teal-500/20"
                    >
                        Đặt lịch ngay
                    </button>
                </div>
            </div>

            <BookingModal 
                shop={shop} 
                location={location}
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSuccess={handleSuccess} 
            />
            <ShopReviewsModal 
                isOpen={isReviewsOpen} 
                onClose={() => setIsReviewsOpen(false)} 
                shop={shop} 
            />

            {/* Gallery Fullscreen Modal */}
            {isGalleryOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={() => setIsGalleryOpen(false)}>
                    <button onClick={() => setIsGalleryOpen(false)} className="absolute top-4 right-4 text-white hover:text-rose-400 z-20 bg-white/10 hover:bg-white/20 p-2.5 rounded-full backdrop-blur-md transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    
                    {images.length > 1 && (
                        <button onClick={(e) => { e.stopPropagation(); handlePrevImage(e); }} className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 p-3 sm:p-4 rounded-full backdrop-blur-md transition-colors z-20">
                            <svg className="w-6 h-6 sm:w-8 sm:h-8 pr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                        </button>
                    )}
                    
                    <div className="w-full h-full max-w-7xl px-4 sm:px-24 flex justify-center items-center" onClick={e => e.stopPropagation()}>
                        <img src={images[currentImageIndex]} alt="Gallery Fullscreen" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl select-none" />
                    </div>

                    {images.length > 1 && (
                        <button onClick={(e) => { e.stopPropagation(); handleNextImage(e); }} className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 p-3 sm:p-4 rounded-full backdrop-blur-md transition-colors z-20">
                            <svg className="w-6 h-6 sm:w-8 sm:h-8 pl-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                        </button>
                    )}
                    
                    {images.length > 1 && (
                        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-20">
                            {images.map((_, idx) => (
                                <button key={idx} onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }} className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/70'}`}></button>
                            ))}
                        </div>
                    )}
                    
                    <div className="absolute top-6 left-6 text-white font-semibold text-sm bg-black/40 px-3 py-1.5 rounded-lg z-20 backdrop-blur-sm">
                        {currentImageIndex + 1} / {images.length}
                    </div>
                </div>
            )}
        </>
    );
};

export default ShopCard;
