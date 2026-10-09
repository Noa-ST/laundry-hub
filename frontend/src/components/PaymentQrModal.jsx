import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';

const PaymentQrModal = ({ isOpen, onClose, orderId, orderCode, amount }) => {
    const [qrData, setQrData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && orderId) {
            generateQrCode();
        }
    }, [isOpen, orderId]);

    const generateQrCode = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.post(`/payments/create-qr/${orderId}`);
            if (res.success) {
                setQrData(res.data);
            }
        } catch (error) {
            console.error('Error generating QR:', error);
            toast.error('Lỗi tạo mã QR thanh toán!');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative flex flex-col items-center">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900">
                    ✕
                </button>
                
                <h3 className="text-lg font-bold text-slate-900 mb-1 text-center">Thanh toán VietQR</h3>
                <p className="text-xs text-slate-500 mb-6 text-center">Mã QR an toàn cho đơn hàng #{orderCode}</p>

                {loading || !qrData ? (
                    <div className="w-48 h-48 flex items-center justify-center bg-slate-50 rounded-xl animate-pulse">
                        <span className="text-sm font-medium text-slate-400">Đang tải mã QR...</span>
                    </div>
                ) : (
                    <div className="p-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <QRCodeSVG value={qrData.qrCode} size={200} level="M" />
                    </div>
                )}

                <div className="mt-6 w-full bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Số tiền thanh toán</p>
                    <p className="text-2xl font-black text-teal-700">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PaymentQrModal;
