import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';
import BookingModal from './BookingModal';
import ShopReviewsModal from './ShopReviewsModal';
import toast from 'react-hot-toast';

// Fix leaflet default icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom cute washer icon
const washerIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3003/3003984.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
});

// User location icon
const userIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3204/3204071.png',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
});

const SAMPLE_COVERS = [
    'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1521656693074-0ef32e80a5d5?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1489274495757-95c7c837b101?auto=format&fit=crop&w=800&q=80',
];

const getShopCover = (shop) => {
    if (shop?.coverImage && !shop.coverImage.includes('zeymufohbuqrqtolmkcm')) {
        return shop.coverImage;
    }
    const idx = Math.abs((shop?.id || 1) % SAMPLE_COVERS.length);
    return SAMPLE_COVERS[idx];
};

const ChangeView = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center && center[0] && center[1]) {
            map.setView(center, map.getZoom());
        }
    }, [center?.[0], center?.[1]]);
    return null;
};

const formatMoney = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

const ShopMapView = ({ shops = [], userLocation, location }) => {
    const { isAuthenticated } = useAuth();
    const [bookingShop, setBookingShop] = useState(null);
    const [reviewsShop, setReviewsShop] = useState(null);
    const [shopVouchers, setShopVouchers] = useState({});

    const activeLocation = userLocation || location;
    const center = activeLocation 
        ? [activeLocation.lat, activeLocation.lng] 
        : (shops.length > 0 && shops[0].latitude && shops[0].longitude)
            ? [shops[0].latitude, shops[0].longitude]
            : [13.7667, 109.2149];

    const loadVouchers = (shopId) => {
        if (!shopVouchers[shopId]) {
            axiosClient.get(`/vouchers/shop/${shopId}`)
                .then(res => {
                    if (res && res.data) {
                        setShopVouchers(prev => ({ ...prev, [shopId]: res.data }));
                    }
                })
                .catch(err => console.error("Lỗi lấy voucher:", err));
        }
    };

    const handleBookingClick = (shop) => {
        if (!isAuthenticated) {
            window.dispatchEvent(new Event('auth:required'));
        } else {
            setBookingShop(shop);
        }
    };

    const handleBookingSuccess = () => {
        setBookingShop(null);
        toast.success("🎉 Đặt lịch thành công!");
        window.location.hash = 'orders';
    };

    return (
        <div className="w-full h-[650px] rounded-2xl overflow-hidden shadow-sm border border-slate-200/80 relative z-10 mb-8 animate-fade-in">
            <MapContainer center={center} zoom={14} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ChangeView center={center} />
                
                {activeLocation && (
                    <Marker position={[activeLocation.lat, activeLocation.lng]} icon={userIcon}>
                        <Popup>
                            <div className="font-bold text-center text-slate-800 text-[12px] py-1">Vị trí của bạn</div>
                        </Popup>
                    </Marker>
                )}

                {shops.map(shop => {
                    const validPrices = shop.services?.filter(s => s.price > 0).map(s => s.price) || [];
                    const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
                        
                    return (
                        <Marker 
                            key={shop.id} 
                            position={[shop.latitude || 0, shop.longitude || 0]} 
                            icon={washerIcon}
                            eventHandlers={{
                                click: () => loadVouchers(shop.id)
                            }}
                        >
                            <Popup minWidth={290} maxWidth={310} className="custom-shop-popup">
                                <div 
                                    className="flex flex-col bg-white overflow-hidden text-slate-800"
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    {/* Cover Image Header */}
                                    <div className="relative w-full h-32 bg-slate-100 overflow-hidden">
                                        <img 
                                            src={getShopCover(shop)} 
                                            alt={shop.name} 
                                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" 
                                        />
                                        {/* Distance badge */}
                                        <div className="absolute bottom-2.5 left-2.5 bg-slate-900/75 backdrop-blur-sm text-white text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                            <svg className="w-3 h-3 text-teal-300" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                            </svg>
                                            <span>{shop.distanceKm} km</span>
                                        </div>

                                        {/* Quick phone action if exists */}
                                        {shop.phone && (
                                            <a 
                                                href={`tel:${shop.phone}`}
                                                onClick={(e) => e.stopPropagation()}
                                                title={`Gọi ${shop.phone}`}
                                                className="absolute bottom-2.5 right-2.5 bg-white/90 hover:bg-white text-slate-800 p-1.5 rounded-full shadow-sm transition-all text-[11px] flex items-center justify-center hover:scale-105"
                                            >
                                                <svg className="w-3.5 h-3.5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 4V3z"/>
                                                </svg>
                                            </a>
                                        )}
                                    </div>

                                    {/* Details Body */}
                                    <div className="p-3.5 flex flex-col gap-2">
                                        {/* Shop Name */}
                                        <h4 
                                            className="font-bold text-slate-900 text-[14px] leading-snug line-clamp-1" 
                                            title={shop.name}
                                        >
                                            {shop.name}
                                        </h4>

                                        {/* Address */}
                                        <div className="flex items-start text-[11px] text-slate-700 font-medium line-clamp-2 leading-relaxed">
                                            <svg className="w-3.5 h-3.5 mr-1 shrink-0 text-slate-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span>{shop.address || 'Chưa cập nhật địa chỉ'}</span>
                                        </div>

                                        {/* Status row: Open, Rating with modal trigger, Hours, Machines */}
                                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] pt-0.5 border-t border-slate-200">
                                            <div className="flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse"></span>
                                                <span className="font-semibold text-emerald-800">Đang mở cửa</span>
                                            </div>
                                            <span className="text-slate-400 font-bold">•</span>
                                            <button 
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setReviewsShop(shop);
                                                }}
                                                className="flex items-center hover:bg-amber-50 hover:text-amber-800 px-1 py-0.5 rounded transition-colors text-slate-800 cursor-pointer"
                                                title="Bấm để xem đánh giá của khách hàng"
                                            >
                                                <svg className="w-3.5 h-3.5 text-amber-500 mr-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                                </svg>
                                                <span className="font-bold underline decoration-dotted underline-offset-2">
                                                    {shop.rating > 0 ? shop.rating : 'Mới'}
                                                </span>
                                                <span className="text-slate-600 ml-0.5 font-semibold">
                                                    ({shop.reviewCount || 0})
                                                </span>
                                            </button>
                                            <span className="text-slate-400 font-bold">•</span>
                                            <span className="whitespace-nowrap font-semibold text-slate-800">{shop.operatingHours || '07:00 - 21:00'}</span>
                                            <span className="text-slate-400 font-bold">•</span>
                                            <span className="font-bold text-slate-900 whitespace-nowrap">
                                                {shop.totalWashers || 0} máy giặt
                                            </span>
                                        </div>

                                        {/* Price / Services Preview Box */}
                                        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 text-xs space-y-1">
                                            {shop.services && shop.services.length > 0 ? (
                                                <>
                                                    {shop.services.slice(0, 2).map(service => (
                                                        <div key={service.id} className="flex justify-between items-center text-[11px]">
                                                             <span className="text-slate-800 font-medium truncate pr-2">{service.name}</span>
                                                             <span className="font-bold text-slate-900 shrink-0">
                                                                 {service.price > 0 ? formatMoney(service.price) : 'Liên hệ'}
                                                                 <span className="text-slate-600 font-medium ml-0.5">/{service.unit}</span>
                                                             </span>
                                                        </div>
                                                    ))}
                                                    {minPrice > 0 && (
                                                         <div className="text-[10px] text-slate-700 font-semibold pt-1 border-t border-slate-200 flex justify-between items-center">
                                                             <span>Giá chỉ từ</span>
                                                             <span className="text-teal-800 font-black">{formatMoney(minPrice)}</span>
                                                         </div>
                                                    )}
                                                </>
                                            ) : (
                                                <p className="text-[11px] text-slate-600 italic text-center py-1 font-medium">Đang cập nhật bảng giá</p>
                                            )}
                                        </div>

                                        {/* Active Vouchers Preview (if any) */}
                                        {shopVouchers[shop.id]?.length > 0 && (
                                            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
                                                {shopVouchers[shop.id].slice(0, 2).map(v => (
                                                    <div 
                                                        key={v.id} 
                                                        className="shrink-0 bg-red-50 border border-red-100 rounded-md px-1.5 py-0.5 flex items-center gap-1 text-[10px] font-bold text-red-700"
                                                        title={v.discountType === 'PERCENTAGE' ? `Giảm ${v.discountValue}%` : `Giảm ${formatMoney(v.discountValue)}`}
                                                    >
                                                        <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm0 4.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM10 5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm0 4.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
                                                        </svg>
                                                        <span>{v.code}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* CTA Button: Đặt lịch ngay */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleBookingClick(shop);
                                            }}
                                            className="w-full mt-1 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold py-2.5 px-3 rounded-xl text-xs tracking-wide shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span>Đặt lịch ngay</span>
                                        </button>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            {/* Booking Modal */}
            {bookingShop && (
                <BookingModal 
                    shop={bookingShop} 
                    location={activeLocation}
                    isOpen={Boolean(bookingShop)} 
                    onClose={() => setBookingShop(null)} 
                    onSuccess={handleBookingSuccess} 
                />
            )}

            {/* Reviews Modal */}
            {reviewsShop && (
                <ShopReviewsModal 
                    isOpen={Boolean(reviewsShop)} 
                    onClose={() => setReviewsShop(null)} 
                    shop={reviewsShop} 
                />
            )}
        </div>
    );
};

export default ShopMapView;
