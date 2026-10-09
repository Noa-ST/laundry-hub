import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

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

const ChangeView = ({ center }) => {
    const map = useMap();
    if (center) map.setView(center, map.getZoom());
    return null;
};

const formatMoney = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

const ShopMapView = ({ shops, userLocation }) => {
    const center = userLocation ? [userLocation.lat, userLocation.lng] : [13.7667, 109.2149];

    return (
        <div className="w-full h-[600px] rounded-2xl overflow-hidden shadow-sm border border-slate-200/80 relative z-10 mb-8 animate-fade-in">
            <MapContainer center={center} zoom={14} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ChangeView center={center} />
                
                {userLocation && (
                    <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                        <Popup>
                            <div className="font-bold text-center text-slate-800 text-[12px] py-1">Vị trí của bạn</div>
                        </Popup>
                    </Marker>
                )}

                {shops.map(shop => {
                    const minPrice = shop.services?.length > 0 
                        ? Math.min(...shop.services.filter(s => s.price > 0).map(s => s.price)) 
                        : 0;
                        
                    return (
                        <Marker 
                            key={shop.id} 
                            position={[shop.latitude || 0, shop.longitude || 0]} 
                            icon={washerIcon}
                        >
                            <Popup minWidth={240} maxWidth={240}>
                                <div className="p-0 -m-[14px]">
                                    <div className="w-full h-24 bg-slate-100 overflow-hidden">
                                        {shop.coverImage ? (
                                            <img src={shop.coverImage} alt={shop.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                                <svg className="w-8 h-8 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-slate-900 text-[13px] leading-tight line-clamp-1">{shop.name}</h4>
                                        </div>
                                        <div className="text-[11px] text-slate-500 line-clamp-2 mb-2 leading-tight h-[28px]">
                                            {shop.address}
                                        </div>
                                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                                            <span className="text-[11px] font-bold text-emerald-600">
                                                {shop.distanceKm} km
                                            </span>
                                            <span className="text-[10px] font-bold bg-slate-900 text-white px-2 py-1 rounded">
                                                Từ {formatMoney(minPrice)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
};

export default ShopMapView;
