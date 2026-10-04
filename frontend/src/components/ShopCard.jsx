import React, { useState } from 'react';
import BookingModal from './BookingModal';
import { useAuth } from '../context/AuthContext';

const ShopCard = ({ shop, location }) => {
    const { isAuthenticated } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleSuccess = () => {
        setIsModalOpen(false);
        alert("🎉 Đặt lịch thành công!");
        window.location.hash = 'orders';
    };

    const handleBookingClick = () => {
        if (!isAuthenticated) {
            window.dispatchEvent(new Event('auth:required'));
        } else {
            setIsModalOpen(true);
        }
    };

    return (
        <>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col">
                <div className="p-5 flex-1">
                    <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-bold text-gray-900 leading-tight">{shop.name}</h3>
                        <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap border border-indigo-100">
                            {shop.distanceKm} km
                        </span>
                    </div>
                    
                    <p className="text-gray-500 text-sm flex items-start mb-4 h-10 overflow-hidden">
                        <svg className="w-4 h-4 mr-1 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                        <span className="line-clamp-2">{shop.address}</span>
                    </p>

                    <div className="space-y-2 mt-4 border-t border-gray-100 pt-4">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bảng giá dịch vụ</p>
                        {shop.services && shop.services.length > 0 ? (
                            shop.services.slice(0, 3).map(service => (
                                <div key={service.id} className="flex justify-between items-center text-sm">
                                    <span className="text-gray-700 truncate pr-2">{service.name}</span>
                                    <span className="font-medium text-gray-900 whitespace-nowrap">
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(service.price)}<span className="text-gray-400 font-normal">/{service.unit}</span>
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-400 italic">Chưa có dịch vụ</p>
                        )}
                        {shop.services && shop.services.length > 3 && (
                            <p className="text-xs text-indigo-500 font-medium pt-1">+ {shop.services.length - 3} dịch vụ khác</p>
                        )}
                    </div>
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <button 
                        onClick={handleBookingClick}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
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
        </>
    );
};

export default ShopCard;