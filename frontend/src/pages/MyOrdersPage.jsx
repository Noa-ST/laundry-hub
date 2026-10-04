import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

const getStatusBadge = (status) => {
    switch(status) {
        case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-200';
        case 'CONFIRMED': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
        case 'WASHING': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
        case 'READY': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
        case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case 'CANCELLED': return 'bg-rose-50 text-rose-700 border-rose-200';
        default: return 'bg-slate-100 text-slate-700 border-slate-200';
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

const MinimalProgressStepper = ({ status, inboundMethod, outboundMethod }) => {
    const steps = [
        { key: 'PENDING', label: 'Đặt lịch' },
        { key: 'CONFIRMED', label: inboundMethod === 'STORE_PICKUP' ? 'Lấy đồ' : 'Nhận đồ' },
        { key: 'WASHING', label: 'Giặt sấy' },
        { key: 'READY', label: outboundMethod === 'DELIVERY_TO_HOME' ? 'Đang giao' : 'Sẵn sàng' },
        { key: 'COMPLETED', label: 'Hoàn thành' }
    ];

    let currentIdx = -1;
    if (status === 'PENDING') currentIdx = 0;
    else if (status === 'CONFIRMED') currentIdx = 1;
    else if (status === 'WASHING' || status === 'RECEIVED' || status === 'PROCESSING') currentIdx = 2;
    else if (status === 'READY' || status === 'DELIVERING') currentIdx = 3;
    else if (status === 'COMPLETED') currentIdx = 4;
    else if (status === 'CANCELLED') currentIdx = -1;

    if (status === 'CANCELLED') {
        return (
            <div className="py-4 px-5 border-t border-slate-100 bg-rose-50/30 text-rose-700 text-sm font-medium">
                Đơn hàng đã bị hủy.
            </div>
        );
    }

    return (
        <div className="py-5 px-6 border-t border-slate-100 bg-white">
            <div className="flex items-center justify-between relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-100 -z-10"></div>
                {steps.map((step, idx) => {
                    const isCompleted = idx < currentIdx;
                    const isActive = idx === currentIdx;
                    return (
                        <div key={step.key} className="flex flex-col items-center relative z-10 bg-white px-2">
                            <div className={`w-3 h-3 rounded-full border-2 mb-2 transition-colors ${isCompleted ? 'bg-indigo-600 border-indigo-600' : isActive ? 'bg-white border-indigo-600' : 'bg-white border-slate-300'}`}></div>
                            <span className={`text-[10px] font-semibold uppercase tracking-wider ${isActive ? 'text-indigo-700' : isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>{step.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
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
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto pt-6">
                <h1 className="text-2xl font-extrabold text-slate-900 mb-6 tracking-tight">Đơn hàng của tôi</h1>
                
                {loading ? (
                    <div className="text-center py-12 text-slate-500 font-medium">Đang tải dữ liệu...</div>
                ) : orders.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
                        <h2 className="text-lg font-bold text-slate-900 mb-2">Chưa có đơn hàng nào</h2>
                        <p className="text-slate-500 text-sm max-w-sm mx-auto">Bạn chưa đặt dịch vụ giặt sấy nào. Khám phá các tiệm lân cận để bắt đầu đặt lịch nhé.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {orders.map(order => (
                            <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-5 flex flex-col md:flex-row justify-between md:items-center bg-white">
                                    <div>
                                        <div className="flex items-center space-x-2 mb-1">
                                            <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded uppercase">#{order.id}</span>
                                            <span className="text-xs text-slate-500 font-medium">{new Date(order.createdAt).toLocaleString('vi-VN')}</span>
                                        </div>
                                        <h3 className="font-bold text-slate-900 text-lg tracking-tight">{order.shopName}</h3>
                                    </div>
                                    <span className={`mt-3 md:mt-0 text-[11px] font-black uppercase px-2.5 py-1 rounded-full border w-max ${getStatusBadge(order.status)}`}>
                                        {getStatusText(order.status)}
                                    </span>
                                </div>

                                <MinimalProgressStepper status={order.status} inboundMethod={order.inboundMethod} outboundMethod={order.outboundMethod} />

                                <div className="p-5 grid md:grid-cols-12 gap-6 bg-slate-50 border-t border-slate-200">
                                    <div className="md:col-span-7">
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Giao nhận & Chi tiết</h4>
                                        <div className="text-sm space-y-1.5 text-slate-700">
                                            <p className="flex justify-between border-b border-slate-100 pb-1.5"><span className="text-slate-500">Đưa đồ:</span> <span className="font-medium text-slate-900">{order.inboundMethod === 'STORE_PICKUP' ? 'Tiệm đến lấy' : 'Khách tự mang ra'}</span></p>
                                            <p className="flex justify-between border-b border-slate-100 pb-1.5"><span className="text-slate-500">Nhận đồ:</span> <span className="font-medium text-slate-900">{order.outboundMethod === 'DELIVERY_TO_HOME' ? 'Giao tận nhà' : 'Khách ra tiệm lấy'}</span></p>
                                            <p className="flex justify-between pb-1.5"><span className="text-slate-500">Hẹn lúc:</span> <span className="font-medium text-slate-900">{new Date(order.bookingTime).toLocaleString('vi-VN')}</span></p>
                                            
                                            {(order.inboundMethod === 'STORE_PICKUP' || order.outboundMethod === 'DELIVERY_TO_HOME') && (
                                                <div className="bg-white p-3 rounded-lg border border-slate-200 mt-3 shadow-sm">
                                                    <p className="font-bold text-slate-900 text-xs mb-1">{order.receiverName} <span className="font-normal text-slate-500 mx-1">•</span> {order.receiverPhone}</p>
                                                    <p className="text-slate-600 text-xs line-clamp-2">{order.deliveryAddress}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="md:col-span-5 flex flex-col justify-between">
                                        <div>
                                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Thanh toán</h4>
                                            <div className="text-sm space-y-1.5 text-slate-600 mb-3">
                                                <div className="flex justify-between"><span>Tiền dịch vụ:</span> <span className="font-medium text-slate-900">{formatMoney(order.serviceFee)}</span></div>
                                                <div className="flex justify-between"><span>Phí vận chuyển:</span> <span className="font-medium text-slate-900">{formatMoney(order.shippingFee)}</span></div>
                                            </div>
                                            <div className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center mb-4 shadow-sm">
                                                <span className="font-bold text-slate-900 uppercase text-xs">Tổng tiền</span>
                                                <span className="font-black text-slate-900 text-lg tracking-tight">{formatMoney(order.finalTotalPrice)}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                                            <span className="text-xs font-semibold px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700">{order.paymentMethod === 'VIETQR' ? 'Chuyển khoản VietQR' : 'Tiền mặt (COD)'}</span>
                                            {order.paymentMethod === 'VIETQR' && ['PENDING', 'CONFIRMED', 'WASHING', 'READY'].includes(order.status) && (
                                                <button onClick={() => setQrOrder(order)} className="text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors">Xem QR</button>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-8 text-center shadow-2xl relative border border-slate-200">
                        <button onClick={() => setQrOrder(null)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                        <h3 className="font-extrabold text-xl mb-1 text-slate-900 tracking-tight">Thanh toán VietQR</h3>
                        <p className="text-sm text-slate-500 mb-6">Quét mã để thanh toán an toàn cho đơn hàng #{qrOrder.id}</p>
                        <div className="p-2 bg-slate-50 rounded-2xl border border-slate-200 inline-block mb-6 shadow-sm">
                            <img src={`https://img.vietqr.io/image/970436-123456789-print.png?amount=${qrOrder.finalTotalPrice}&addInfo=Thanh toan don hang ${qrOrder.id}&accountName=LAUNDRY HUB`} alt="VietQR" className="rounded-xl w-48 h-48 object-cover mix-blend-multiply" />
                        </div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Số tiền cần thanh toán</p>
                        <p className="font-black text-slate-900 text-3xl tracking-tight">{formatMoney(qrOrder.finalTotalPrice)}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyOrdersPage;