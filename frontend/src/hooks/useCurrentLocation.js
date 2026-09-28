import { useState, useEffect } from 'react';

const FALLBACK_LOCATION = { lat: 10.7769, lng: 106.7009 }; // Trung tâm Quận 1, TPHCM

export const useCurrentLocation = () => {
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!navigator.geolocation) {
            setError('Geolocation không được trình duyệt hỗ trợ');
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
                setError('Không thể lấy vị trí. Dùng tọa độ mặc định (TP.HCM).');
                setLocation(FALLBACK_LOCATION);
                setLoading(false);
            },
            { timeout: 10000 }
        );
    }, []);

    return { location, error, loading };
};
