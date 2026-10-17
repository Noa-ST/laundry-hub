import React, { useState, useEffect, useRef, useCallback } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Quy Nhơn Default Center (hoặc toạ độ mặc định của hệ thống)
const DEFAULT_CENTER = {
    latitude: 13.7716,
    longitude: 109.2227,
    zoom: 14
};

const LocationPickerMap = ({ 
    initialAddress = '', 
    initialLat = 0, 
    initialLng = 0, 
    onChange,
    onLocationChange
}) => {
    // Khởi tạo toạ độ ban đầu: nếu chưa có toạ độ (0, 0), fallback về DEFAULT_CENTER
    const hasInitialCoords = initialLat && initialLng && initialLat !== 0 && initialLng !== 0;
    const defaultLat = hasInitialCoords ? Number(initialLat) : DEFAULT_CENTER.latitude;
    const defaultLng = hasInitialCoords ? Number(initialLng) : DEFAULT_CENTER.longitude;

    const [viewState, setViewState] = useState({
        latitude: defaultLat,
        longitude: defaultLng,
        zoom: DEFAULT_CENTER.zoom
    });
    
    const [marker, setMarker] = useState({
        latitude: defaultLat,
        longitude: defaultLng
    });

    const [searchQuery, setSearchQuery] = useState(initialAddress || '');
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [locating, setLocating] = useState(false);
    const searchTimeout = useRef(null);

    // Báo toạ độ ban đầu về cho parent nếu ban đầu truyền vào 0/null
    useEffect(() => {
        if (!hasInitialCoords) {
            notifyChange(initialAddress || '', defaultLat, defaultLng);
        }
        // Thử lấy GPS thực tế của trình duyệt nếu chưa có toạ độ cụ thể
        if (!hasInitialCoords && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    setViewState(prev => ({ ...prev, latitude: lat, longitude: lng, zoom: 15 }));
                    setMarker({ latitude: lat, longitude: lng });
                    notifyChange(searchQuery, lat, lng);
                    reverseGeocode(lat, lng);
                },
                () => {
                    // Người dùng từ chối quyền -> giữ DEFAULT_CENTER
                },
                { enableHighAccuracy: true, timeout: 6000 }
            );
        }
    }, []);

    // Cập nhật khi props bên ngoài thay đổi (ví dụ khi chọn sửa địa chỉ khác)
    useEffect(() => {
        if (initialLat && initialLng && initialLat !== 0 && initialLng !== 0) {
            const numLat = Number(initialLat);
            const numLng = Number(initialLng);
            setViewState(prev => ({
                ...prev,
                latitude: numLat,
                longitude: numLng
            }));
            setMarker({ latitude: numLat, longitude: numLng });
        }
        if (initialAddress !== undefined) {
            setSearchQuery(initialAddress);
        }
    }, [initialLat, initialLng, initialAddress]);

    const notifyChange = (address, lat, lng) => {
        if (onChange) {
            onChange({ address, latitude: Number(lat), longitude: Number(lng) });
        }
        if (onLocationChange) {
            onLocationChange(Number(lat), Number(lng), address);
        }
    };

    // Geocoding: Tìm kiếm địa chỉ qua Mapbox API
    const handleSearch = useCallback(async (query, autoSelectFirst = false) => {
        if (!query || !query.trim() || !MAPBOX_TOKEN) {
            setSuggestions([]);
            return;
        }

        try {
            setIsSearching(true);
            const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query.trim())}.json?access_token=${MAPBOX_TOKEN}&country=vn&types=poi,address,place&language=vi`;
            const response = await fetch(endpoint);
            const data = await response.json();
            
            if (data.features && data.features.length > 0) {
                setSuggestions(data.features);

                // Tự động di chuyển bản đồ đến kết quả đầu tiên (Auto-pan Geocoding)
                if (autoSelectFirst) {
                    const first = data.features[0];
                    const [lng, lat] = first.center;
                    setViewState(prev => ({ ...prev, latitude: lat, longitude: lng, zoom: 15 }));
                    setMarker({ latitude: lat, longitude: lng });
                    notifyChange(query, lat, lng);
                }
            } else {
                setSuggestions([]);
            }
        } catch (error) {
            console.error("Geocoding Error:", error);
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Reverse Geocoding: Lấy tên địa chỉ từ toạ độ (Lat, Lng)
    const reverseGeocode = async (lat, lng) => {
        if (!MAPBOX_TOKEN) return;
        try {
            const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address,poi,place&language=vi`;
            const response = await fetch(endpoint);
            const data = await response.json();
            
            if (data.features && data.features.length > 0) {
                const addressName = data.features[0].place_name;
                setSearchQuery(addressName);
                notifyChange(addressName, lat, lng);
            } else {
                notifyChange(searchQuery, lat, lng);
            }
        } catch (error) {
            console.error("Reverse Geocoding Error:", error);
            notifyChange(searchQuery, lat, lng);
        }
    };

    // Khi người dùng gõ vào ô tìm kiếm: Debounce gọi Geocoding và auto-pan
    const handleInputChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        
        // Báo địa chỉ thô về parent để form đồng bộ text
        notifyChange(value, marker.latitude, marker.longitude);

        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            // Khi người dùng dừng gõ và nội dung có nghĩa: tự tìm và auto-pan
            if (value.trim().length >= 3) {
                handleSearch(value, true);
            } else {
                setSuggestions([]);
            }
        }, 600);
    };

    // Khi người dùng ấn Enter ở ô tìm kiếm: geocode ngay và chọn kết quả đầu
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (searchTimeout.current) clearTimeout(searchTimeout.current);
            if (suggestions.length > 0) {
                handleSelectSuggestion(suggestions[0]);
            } else if (searchQuery.trim()) {
                handleSearch(searchQuery, true);
            }
            setIsFocused(false);
        }
    };

    // Khi người dùng click chọn 1 gợi ý từ dropdown
    const handleSelectSuggestion = (feature) => {
        const [lng, lat] = feature.center;
        const addressName = feature.place_name;

        setSearchQuery(addressName);
        setSuggestions([]);
        setIsFocused(false);

        setViewState(prev => ({ ...prev, latitude: lat, longitude: lng, zoom: 15 }));
        setMarker({ latitude: lat, longitude: lng });
        notifyChange(addressName, lat, lng);
    };

    // Kéo thả ghim trên bản đồ (Draggable Marker)
    const onMarkerDragEnd = useCallback((event) => {
        const { lngLat } = event;
        const newLat = Number(lngLat.lat);
        const newLng = Number(lngLat.lng);
        
        // Cập nhật ngay lập tức toạ độ vào marker và parent (2 ô Lat/Lng nhảy số tức thì)
        setMarker({ latitude: newLat, longitude: newLng });
        notifyChange(searchQuery, newLat, newLng);

        // Sau đó tra cứu địa chỉ thực tế từ toạ độ mới (Reverse Geocode)
        reverseGeocode(newLat, newLng);
    }, [searchQuery]);

    // Click vào bất kỳ vị trí nào trên bản đồ để di chuyển ghim tới đó
    const onMapClick = useCallback((event) => {
        const { lngLat } = event;
        const newLat = Number(lngLat.lat);
        const newLng = Number(lngLat.lng);
        
        setMarker({ latitude: newLat, longitude: newLng });
        notifyChange(searchQuery, newLat, newLng);
        reverseGeocode(newLat, newLng);
    }, [searchQuery]);

    // Nút định vị GPS hiện tại
    const handleGetGPS = () => {
        if (!navigator.geolocation) {
            alert("Trình duyệt của bạn không hỗ trợ định vị GPS.");
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocating(false);
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                setViewState(prev => ({ ...prev, latitude: lat, longitude: lng, zoom: 16 }));
                setMarker({ latitude: lat, longitude: lng });
                notifyChange(searchQuery, lat, lng);
                reverseGeocode(lat, lng);
            },
            (err) => {
                setLocating(false);
                console.warn("GPS error:", err);
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    };

    return (
        <div className="flex flex-col space-y-3 relative">
            {!MAPBOX_TOKEN && (
                <div className="bg-rose-50 text-rose-600 text-xs p-3 rounded-lg border border-rose-100 flex items-start gap-2">
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>
                        <strong>Chưa cấu hình Mapbox:</strong> Vui lòng thêm <code className="bg-rose-100 px-1 rounded">VITE_MAPBOX_TOKEN</code> vào file <code className="bg-rose-100 px-1 rounded">.env</code> để sử dụng tính năng tìm kiếm và Bản đồ.
                    </span>
                </div>
            )}

            {/* Search Box & Geocoding Input */}
            <div className="relative z-30">
                <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">Địa chỉ cụ thể *</label>
                    <button
                        type="button"
                        onClick={handleGetGPS}
                        disabled={locating}
                        className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded-md transition-colors"
                    >
                        <svg className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {locating ? 'Đang định vị...' : 'Vị trí hiện tại'}
                    </button>
                </div>

                <div className="relative">
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setTimeout(() => setIsFocused(false), 250)} 
                        placeholder="Nhập tên đường, số nhà, phường xã (nhấn Enter để định vị)..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-slate-800"
                    />
                    <svg className="absolute left-3 top-3 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    
                    {isSearching ? (
                        <div className="absolute right-3 top-3">
                            <svg className="animate-spin h-4 w-4 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        </div>
                    ) : searchQuery ? (
                        <button 
                            type="button" 
                            onClick={() => { setSearchQuery(''); setSuggestions([]); notifyChange('', marker.latitude, marker.longitude); }}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    ) : null}
                </div>

                {/* Autocomplete Dropdown */}
                {isFocused && suggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto custom-scrollbar">
                        {suggestions.map((suggestion) => (
                            <div 
                                key={suggestion.id}
                                onMouseDown={(e) => {
                                    e.preventDefault(); // Giữ focus để không bị blur trước khi click
                                    handleSelectSuggestion(suggestion);
                                }}
                                className="px-3.5 py-2.5 hover:bg-teal-50/60 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                            >
                                <p className="text-xs font-bold text-slate-800">{suggestion.text}</p>
                                <p className="text-[11px] text-slate-500 truncate mt-0.5">{suggestion.place_name}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Map Area */}
            <div className="w-full h-[280px] rounded-xl overflow-hidden border border-slate-200 relative z-0 group bg-slate-100 shadow-inner">
                {MAPBOX_TOKEN ? (
                    <Map
                        {...viewState}
                        onMove={evt => setViewState(evt.viewState)}
                        onClick={onMapClick}
                        mapStyle="mapbox://styles/mapbox/streets-v12"
                        mapboxAccessToken={MAPBOX_TOKEN}
                    >
                        <NavigationControl position="bottom-right" />
                        
                        <Marker 
                            longitude={marker.longitude} 
                            latitude={marker.latitude} 
                            anchor="bottom"
                            draggable
                            onDragEnd={onMarkerDragEnd}
                        >
                            <div className="relative -top-1 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform">
                                <div className="w-9 h-9 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-rose-500/30">
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </Marker>
                    </Map>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        <p className="text-xs font-medium">Bản đồ đang tắt</p>
                    </div>
                )}
                
                {MAPBOX_TOKEN && (
                    <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-slate-200/60 shadow-sm z-10 pointer-events-none">
                        <p className="text-[10px] font-semibold text-slate-700 flex items-center gap-1">
                            <span>📍</span> Kéo thả ghim hoặc click trên bản đồ để chọn tọa độ
                        </p>
                    </div>
                )}
            </div>

            {/* Coordinates Display - Tự động cập nhật thời gian thực */}
            <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Vĩ độ (Latitude)</span>
                    <span className="font-mono text-xs font-bold text-teal-800 block">
                        {Number(marker.latitude).toFixed(6)}
                    </span>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Kinh độ (Longitude)</span>
                    <span className="font-mono text-xs font-bold text-teal-800 block">
                        {Number(marker.longitude).toFixed(6)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default LocationPickerMap;
