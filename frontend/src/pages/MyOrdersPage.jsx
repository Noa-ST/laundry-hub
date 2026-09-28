import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

const getStatusBadge = (status) => {
    switch(status) {
        case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'CONFIRMED': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'WASHING': return 'bg-purple-100 text-purple-800 border-purple-200';
        case 'READY': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
        case 'COMPLETED': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
};

const getStatusText = (status) => {
    switch(status) {
        case 'PENDING': return 'Chờ xác nhận';
        case 'CONFIRMED': return 'Đã xác nhận';
        case 'WASHING': return 'Đang giặt';
        case 'READY': return 'Chờ giao/Nhận';
        case 'COMPLETED': return 'Hoàn thành';
        case 'CANCELLED': return 'Đã hủy';
        default: return status;
    }
};

const MyOrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [qrOrder, setQrOrder] = useState(null);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await axiosClient.get('/orders/me');
                if (response.success) setOrders(response.data);
            } catch (err) { console.error(err); } 
            finally { setLoading(false); }
        };
        fetchOrders();
    }, []);

    const formatMoney = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto pt-6">
                <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Đơn hàng của tôi</h1>
                
                {loading ? (
                    <div className="text-center py-10 text-gray-500">Đang tải...</div>
                ) : orders.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border p-10 text-center"><p>Bạn chưa có đơn đặt lịch nào.</p></div>
                ) : (
                    <div className="space-y-6">
                        {orders.map(order => (
                            <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-5 border-b border-gray-50 flex flex-col md:flex-row justify-between md:items-center">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Mã: #{order.id} • {new Date(order.createdAt).toLocaleString('vi-VN')}</p>
                                        <h3 className="font-bold text-gray-900 text-lg">{order.shopName}</h3>
                                    </div>
                                    <span className={`mt-2 md:mt-0 text-xs font-bold px-3 py-1.5 rounded-full border w-max ${getStatusBadge(order.status)}`}>
                                        {getStatusText(order.status)}
                                    </span>
                                </div>

                                <div className="p-5 grid md:grid-cols-2 gap-6 bg-white">
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Giao nhận & Logistic</h4>
                                        <div className="text-sm space-y-2 text-gray-600">
                                            <p><span className="font-medium text-gray-800">Đưa đồ:</span> {order.inboundMethod === 'STORE_PICKUP' ? 'Tiệm đến lấy' : 'Khách tự mang ra'}</p>
                                            <p><span className="font-medium text-gray-800">Nhận đồ:</span> {order.outboundMethod === 'DELIVERY_TO_HOME' ? 'Giao tận nhà' : 'Khách ra tiệm lấy'}</p>
                                            <p><span className="font-medium text-gray-800">Hẹn lúc:</span> {new Date(order.bookingTime).toLocaleString('vi-VN')}</p>
                                            {(order.inboundMethod === 'STORE_PICKUP' || order.outboundMethod === 'DELIVERY_TO_HOME') && (
                                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mt-2">
                                                    <p className="font-semibold text-blue-900">{order.receiverName} - {order.receiverPhone}</p>
                                                    <p className="text-blue-800 line-clamp-2 mt-1">{order.deliveryAddress}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Thanh toán</h4>
                                        <div className="text-sm space-y-2 text-gray-600 mb-3">
                                            <div className="flex justify-between"><span>Tiền dịch vụ:</span> <span className="font-medium">{formatMoney(order.serviceFee)}</span></div>
                                            <div className="flex justify-between"><span>Phí Ship:</span> <span className="font-medium">{formatMoney(order.shippingFee)}</span></div>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center mb-3">
                                            <span className="font-bold text-gray-800 uppercase text-xs">Tổng tiền</span>
                                            <span className="font-extrabold text-indigo-700 text-lg">{formatMoney(order.finalTotalPrice)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-100 text-gray-700">{order.paymentMethod === 'VIETQR' ? 'Chuyển khoản VietQR' : 'Tiền mặt (COD)'}</span>
                                            {order.paymentMethod === 'VIETQR' && ['PENDING', 'CONFIRMED', 'WASHING', 'READY'].includes(order.status) && (
                                                <button onClick={() => setQrOrder(order)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">Xem mã QR</button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {qrOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-sm p-8 text-center shadow-2xl relative border border-gray-100">
                        <button onClick={() => setQrOrder(null)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">✖</button>
                        <h3 className="font-extrabold text-xl mb-1 text-gray-900">Quét mã VietQR</h3>
                        <p className="text-sm text-gray-500 mb-6">Thanh toán an toàn cho đơn hàng #{qrOrder.id}</p>
                        <div className="p-2 bg-indigo-50 rounded-2xl border border-indigo-100 inline-block mb-4">
                            <img src={`https://img.vietqr.io/image/970436-123456789-print.png?amount=${qrOrder.finalTotalPrice}&addInfo=Thanh toan don hang ${qrOrder.id}&accountName=LAUNDRY HUB`} alt="VietQR" className="rounded-xl shadow-sm w-48 h-48 object-cover mix-blend-multiply" />
                        </div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold mb-1">Số tiền cần thanh toán</p>
                        <p className="font-black text-indigo-600 text-3xl tracking-tight">{formatMoney(qrOrder.finalTotalPrice)}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyOrdersPage;
