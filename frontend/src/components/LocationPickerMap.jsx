import React, { useState, useEffect, useRef, useCallback } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Quy Nhơn Default Center
const DEFAULT_CENTER = {
    latitude: 13.7716,
    longitude: 109.2227,
    zoom: 13
};

const LocationPickerMap = ({ 
    initialAddress = '', 
    initialLat = 0, 
    initialLng = 0, 
    onChange 
}) => {
    const [viewState, setViewState] = useState({
        ...DEFAULT_CENTER
    });
    
    const [marker, setMarker] = useState(null);
    const [searchQuery, setSearchQuery] = useState(initialAddress);
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const searchTimeout = useRef(null);

    // Initialize map with provided coordinates
    useEffect(() => {
        if (initialLat !== 0 && initialLng !== 0) {
            setViewState(prev => ({
                ...prev,
                latitude: initialLat,
                longitude: initialLng,
                zoom: 14
            }));
            setMarker({ latitude: initialLat, longitude: initialLng });
        }
        if (initialAddress) {
            setSearchQuery(initialAddress);
        }
    }, [initialLat, initialLng, initialAddress]);

    // Handle Geocoding (Search Address -> Lat Lng)
    const handleSearch = useCallback(async (query) => {
        if (!query.trim() || !MAPBOX_TOKEN) {
            setSuggestions([]);
            return;
        }

        try {
            setIsSearching(true);
            const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=vn&types=poi,address,place`;
            const response = await fetch(endpoint);
            const data = await response.json();
            
            if (data.features) {
                setSuggestions(data.features);
            }
        } catch (error) {
            console.error("Geocoding Error:", error);
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Handle Input Change with Debounce
    const handleInputChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        
        // Always propagate the raw text to parent immediately so form state stays in sync
        if (onChange) {
            onChange({ address: value, latitude: marker?.latitude || 0, longitude: marker?.longitude || 0 });
        }

        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            handleSearch(value);
        }, 500);
    };

    // When user selects an autocomplete suggestion
    const handleSelectSuggestion = (feature) => {
        const [lng, lat] = feature.center;
        const addressName = feature.place_name;

        setSearchQuery(addressName);
        setSuggestions([]);
        setIsFocused(false);

        // Update Map & Marker
        setViewState(prev => ({ ...prev, latitude: lat, longitude: lng, zoom: 15 }));
        setMarker({ latitude: lat, longitude: lng });

        // Notify parent
        if (onChange) {
            onChange({ address: addressName, latitude: lat, longitude: lng });
        }
    };

    // Reverse Geocoding (Lat Lng -> Address)
    const reverseGeocode = async (lat, lng) => {
        if (!MAPBOX_TOKEN) return;
        try {
            const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address,poi`;
            const response = await fetch(endpoint);
            const data = await response.json();
            
            if (data.features && data.features.length > 0) {
                const addressName = data.features[0].place_name;
                setSearchQuery(addressName);
                if (onChange) {
                    onChange({ address: addressName, latitude: lat, longitude: lng });
                }
            } else {
                if (onChange) {
                    onChange({ address: searchQuery, latitude: lat, longitude: lng });
                }
            }
        } catch (error) {
            console.error("Reverse Geocoding Error:", error);
            if (onChange) {
                onChange({ address: searchQuery, latitude: lat, longitude: lng });
            }
        }
    };

    // When user drags the pin on the map
    const onMarkerDragEnd = useCallback((event) => {
        const { lngLat } = event;
        const newLat = lngLat.lat;
        const newLng = lngLat.lng;
        
        setMarker({ latitude: newLat, longitude: newLng });
        
        // Reverse geocode to get the new address text
        reverseGeocode(newLat, newLng);
    }, [searchQuery, onChange]);

    // When user clicks somewhere on the map
    const onMapClick = useCallback((event) => {
        const { lngLat } = event;
        const newLat = lngLat.lat;
        const newLng = lngLat.lng;
        
        setMarker({ latitude: newLat, longitude: newLng });
        reverseGeocode(newLat, newLng);
    }, [searchQuery, onChange]);

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

            {/* Search Box */}
            <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Địa chỉ cụ thể *</label>
                <div className="relative">
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={handleInputChange}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setTimeout(() => setIsFocused(false), 200)} 
                        placeholder="Nhập tên đường, số nhà, thành phố..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                    <svg className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    
                    {isSearching && (
                        <div className="absolute right-3 top-3.5">
                            <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        </div>
                    )}
                </div>

                {/* Autocomplete Dropdown */}
                {isFocused && suggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto custom-scrollbar">
                        {suggestions.map((suggestion) => (
                            <div 
                                key={suggestion.id}
                                onClick={() => handleSelectSuggestion(suggestion)}
                                className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                            >
                                <p className="text-sm font-semibold text-slate-800">{suggestion.text}</p>
                                <p className="text-xs text-slate-500 truncate">{suggestion.place_name}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Map Area */}
            <div className="w-full h-[300px] rounded-xl overflow-hidden border border-slate-200 relative group bg-slate-100">
                {MAPBOX_TOKEN ? (
                    <Map
                        {...viewState}
                        onMove={evt => setViewState(evt.viewState)}
                        onClick={onMapClick}
                        mapStyle="mapbox://styles/mapbox/streets-v12"
                        mapboxAccessToken={MAPBOX_TOKEN}
                    >
                        <NavigationControl position="bottom-right" />
                        
                        {marker && marker.latitude !== 0 && (
                            <Marker 
                                longitude={marker.longitude} 
                                latitude={marker.latitude} 
                                anchor="bottom"
                                draggable
                                onDragEnd={onMarkerDragEnd}
                            >
                                <div className="text-rose-500 relative -top-2 cursor-pointer hover:scale-110 transition-transform">
                                    <svg className="w-8 h-8 drop-shadow-md" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                                    </svg>
                                </div>
                            </Marker>
                        )}
                    </Map>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        <p className="text-sm font-medium">Bản đồ đang tắt</p>
                    </div>
                )}
                
                {MAPBOX_TOKEN && (
                    <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200/50 shadow-sm z-10 pointer-events-none">
                        <p className="text-[10px] font-semibold text-slate-600">📍 Kéo thả ghim để chọn vị trí chính xác</p>
                    </div>
                )}
            </div>

            {/* Coordinates Display */}
            <div className="flex gap-4">
                <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Vĩ độ (Latitude)</label>
                    <div className="bg-slate-100 text-slate-700 text-sm py-2 px-3 rounded-lg border border-slate-200 font-mono">
                        {marker?.latitude?.toFixed(6) || "0.000000"}
                    </div>
                </div>
                <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Kinh độ (Longitude)</label>
                    <div className="bg-slate-100 text-slate-700 text-sm py-2 px-3 rounded-lg border border-slate-200 font-mono">
                        {marker?.longitude?.toFixed(6) || "0.000000"}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LocationPickerMap;
