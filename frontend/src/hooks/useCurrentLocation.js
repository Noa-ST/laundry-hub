import { useState, useEffect } from 'react';
import { handleGeolocationError, GEOLOCATION_OPTIONS } from '../utils/geoUtils';

const FALLBACK_LOCATION = { lat: 10.7769, lng: 106.7009 }; // Trung tâm Quận 1, TPHCM

export const useCurrentLocation = () => {
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!navigator.geolocation) {
            const msg = 'Geolocation không được trình duyệt hỗ trợ';
            setError(msg);
            alert(msg);
            setLocation(FALLBACK_LOCATION);
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setLoading(false);
            },
            (err) => {
                handleGeolocationError(err);
                let fallbackMsg = 'Không thể lấy vị trí. Dùng tọa độ mặc định (TP.HCM).';
                if (err.code === 1) {
                    fallbackMsg = 'Quyền định vị bị từ chối. Dùng tọa độ mặc định (TP.HCM).';
                } else if (err.code === 2) {
                    fallbackMsg = 'GPS đang tắt hoặc không khả dụng. Dùng tọa độ mặc định (TP.HCM).';
                } else if (err.code === 3) {
                    fallbackMsg = 'Quá thời gian lấy vị trí (15s). Dùng tọa độ mặc định (TP.HCM).';
                }
                setError(fallbackMsg);
                setLocation(FALLBACK_LOCATION);
                setLoading(false);
            },
            GEOLOCATION_OPTIONS
        );
    }, []);

    return { location, error, loading, setLocation };
};
