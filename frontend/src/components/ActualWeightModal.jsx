import React, { useState } from 'react';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';

const ActualWeightModal = ({ orderId, isOpen, onClose, onSuccess }) => {
    const [weight, setWeight] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!weight || parseFloat(weight) <= 0) {
            toast.error("Vui lòng nhập cân nặng hợp lệ (> 0)");
            return;
        }
        setIsLoading(true);
        try {
            const res = await axiosClient.patch(`/owner/orders/${orderId}/actual-weight`, {
                actualWeight: parseFloat(weight)
            });
            if (res.success) {
                onSuccess();
            } else {
                toast(res.message);
            }
        } catch (error) {
            toast.error("Lỗi kết nối khi cập nhật cân nặng!");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-xs p-6 shadow-2xl relative border border-gray-100">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-50 rounded-full w-7 h-7 flex items-center justify-center">✕</button>
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                        <span className="text-sm font-bold text-purple-700">KG</span>
                    </div>
                    <h3 className="font-bold text-lg mb-1 text-gray-800 text-center">Nhập Cân Nặng</h3>
                    <p className="text-xs text-gray-500 mb-5 text-center">Đơn hàng #{orderId}</p>
                </div>
                
                <div className="relative mb-5">
                    <input 
                        type="number" 
                        step="0.1" 
                        min="0.1"
                        placeholder="0.0" 
                        value={weight} 
                        onChange={e => setWeight(e.target.value)} 
                        className="w-full border-2 border-gray-200 rounded-xl text-3xl p-3 pl-6 pr-12 bg-white outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all text-center font-black text-purple-700" 
                    />
                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 font-bold">KG</span>
                </div>
                <button 
                    onClick={handleSubmit} 
                    disabled={isLoading} 
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-purple-200 transition-all text-sm"
                >
                    {isLoading ? 'Đang xử lý...' : 'Xác nhận & Bắt đầu Giặt'}
                </button>
            </div>
        </div>
    );
};

export default ActualWeightModal;
