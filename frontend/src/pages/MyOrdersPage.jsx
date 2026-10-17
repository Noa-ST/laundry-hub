import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import PaymentQrModal from '../components/PaymentQrModal';
import ReviewModal from '../components/ReviewModal';
import DisputeModal from '../components/DisputeModal';
import ChatModal from '../components/ChatModal';
import { useWebSocket } from '../context/WebSocketContext';
import toast from 'react-hot-toast';

const getStatusBadge = (status) => {
    switch(status) {
        case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-200';
        case 'CONFIRMED': 
        case 'PICKING_UP':
        case 'RECEIVED':
        case 'PROCESSING':
        case 'WASHING': 
        case 'READY': 
        case 'DELIVERING': return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case 'CANCELLED': return 'bg-rose-50 text-rose-700 border-rose-200';
        default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
};

const getStatusText = (status) => {
    switch(status) {
        case 'PENDING': return 'Chờ xác nhận';
        case 'CONFIRMED': return 'Đã xác nhận';
        case 'PICKING_UP': return 'Đang lấy đồ';
        case 'RECEIVED': return 'Tiệm đã nhận';
        case 'PROCESSING': 
        case 'WASHING': return 'Đang xử lý / Giặt';
        case 'READY': return 'Sẵn sàng / Chờ giao';
        case 'DELIVERING': return 'Đang giao';
        case 'COMPLETED': return 'Hoàn thành';
        case 'CANCELLED': return 'Đã hủy';
        default: return status;
    }
};

const MinimalProgressStepper = ({ status, inboundType, outboundType }) => {
    const isShopPickUp = inboundType === 'SHOP_PICK_UP';
    const isShopDelivery = outboundType === 'SHOP_DELIVERY';
    
    const steps = [
        { key: 'PENDING', label: 'Đặt đơn' },
        { key: 'RECEIVED_STEP', label: isShopPickUp ? 'Lấy đồ' : 'Tiếp nhận' },
        { key: 'PROCESSING_STEP', label: 'Đang giặt' },
        { key: 'READY_STEP', label: isShopDelivery ? 'Giao hàng' : 'Sẵn sàng' },
        { key: 'COMPLETED', label: 'Hoàn tất' }
    ];

    let currentIdx = -1;
    if (status === 'PENDING') currentIdx = 0;
    else if (status === 'CONFIRMED' || status === 'PICKING_UP' || status === 'RECEIVED') currentIdx = 1;
    else if (status === 'PROCESSING' || status === 'WASHING') currentIdx = 2;
    else if (status === 'READY' || status === 'DELIVERING') currentIdx = 3;
    else if (status === 'COMPLETED') currentIdx = 4;
    else if (status === 'CANCELLED') currentIdx = -1;

    if (status === 'CANCELLED') {
        return (
            <div className="py-4 px-5 border-t border-slate-100 bg-rose-50/50 text-rose-700 text-[13px] font-semibold text-center tracking-wide">
                Đơn hàng đã bị hủy.
            </div>
        );
    }

    return (
        <div className="py-5 px-6 border-t border-slate-100 bg-white">
            <div className="flex items-center justify-between relative">
                {/* Connecting Line */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-200 -z-10"></div>
                {/* Active Line (Calculated Width) */}
                <div 
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-teal-600 transition-all duration-500 ease-in-out -z-10"
                    style={{ width: `${currentIdx > 0 ? (currentIdx / (steps.length - 1)) * 100 : 0}%` }}
                ></div>

                {steps.map((step, idx) => {
                    const isCompleted = idx < currentIdx;
                    const isActive = idx === currentIdx;
                    return (
                        <div key={step.key} className="flex flex-col items-center relative z-10 bg-white px-2">
                            {isCompleted ? (
                                <div className="w-4 h-4 rounded-full bg-teal-600 mb-2 flex items-center justify-center">
                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            ) : isActive ? (
                                <div className="w-4 h-4 rounded-full border-[3px] border-teal-600 bg-white mb-2 ring-4 ring-teal-50"></div>
                            ) : (
                                <div className="w-3 h-3 rounded-full bg-slate-200 border-2 border-white mb-2.5"></div>
                            )}
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-teal-700' : isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const MyOrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [qrOrder, setQrOrder] = useState(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [reviewOrder, setReviewOrder] = useState(null);
    const [disputeOrder, setDisputeOrder] = useState(null);
    const [chatOrder, setChatOrder] = useState(null);
    
    const { notification } = useWebSocket();

    const fetchOrders = async (pageNumber = 0, append = false) => {
        try {
            if (append) setLoadingMore(true);
            else setLoading(true);

            const response = await axiosClient.get(`/orders/me?page=${pageNumber}&size=10`);
            if (response.success) {
                if (append) {
                    setOrders(prev => {
                        const existingIds = new Set(prev.map(o => o.id));
                        const newOrders = response.data.content.filter(o => !existingIds.has(o.id));
                        return [...prev, ...newOrders];
                    });
                } else {
                    setOrders(response.data.content);
                }
                setTotalPages(response.data.totalPages);
                setPage(pageNumber);
            }
        } catch (err) { console.error(err); } 
        finally { 
            setLoading(false); 
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchOrders(0, false);
    }, []);
    
    // Auto refresh when receiving notification
    useEffect(() => {
        if (notification && notification.title === "Cập nhật đơn hàng") {
            fetchOrders(0, false);
        }
    }, [notification]);

    const formatMoney = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    const handleCancelOrder = async (orderId) => {
        if (!window.confirm("Bạn có chắc chắn muốn hủy đơn hàng này không?")) return;
        try {
            setIsCancelling(true);
            const res = await axiosClient.put(`/orders/${orderId}/cancel`);
            if (res.success) {
                fetchOrders(0, false);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Không thể hủy đơn hàng lúc này.");
        } finally {
            setIsCancelling(false);
        }
    };

    const handleUpdatePaymentMethod = async (orderId, method) => {
        try {
            const res = await axiosClient.put(`/orders/${orderId}/payment-method`, { method });
            if (res.success) {
                fetchOrders(0, false);
            }
        } catch (error) {
            console.error(error);
            toast.error("Có lỗi xảy ra khi đổi phương thức thanh toán");
        }
    };

    const handleReorder = () => {
        window.location.hash = 'discovery';
    };

    const handleReviewSuccess = () => {
        setReviewOrder(null);
        fetchOrders(0, false);
    };

    return (
        <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto pt-6 pb-20">
                <h1 className="text-2xl font-extrabold text-slate-900 mb-6 tracking-tight">Lịch sử đơn hàng</h1>
                
                {loading ? (
                    <div className="text-center py-12 text-slate-500 font-medium">Đang tải dữ liệu...</div>
                ) : orders.length === 0 ? (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center mt-4">
                        <svg className="w-16 h-16 text-slate-300 stroke-1.5 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <h2 className="text-lg font-bold text-slate-900 mb-2">Chưa có đơn hàng nào</h2>
                        <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">Bạn chưa đặt dịch vụ giặt sấy nào. Khám phá các tiệm lân cận để bắt đầu đặt lịch nhé.</p>
                        <button onClick={handleReorder} className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-6 rounded-xl shadow-sm transition-all text-sm">
                            Khám phá ngay
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {orders.map(order => (
                            <div key={order.id} className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden hover:shadow-md transition-shadow">
                                {/* Header */}
                                <div className="p-5 bg-white flex flex-col md:flex-row justify-between md:items-start gap-4">
                                    <div>
                                        <div className="flex items-center space-x-2 mb-1.5">
                                            <span className="text-[13px] font-semibold text-slate-900 font-mono">#ORD-{order.id.toString().padStart(4, '0')}</span>
                                            <span className="text-slate-300">•</span>
                                            <span className="text-[13px] text-slate-500 font-medium">{new Date(order.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                        </div>
                                        <h3 className="font-bold text-slate-900 text-lg tracking-tight">{order.shopName}</h3>
                                    </div>
                                    <span className={`shrink-0 text-xs font-bold uppercase px-3 py-1.5 rounded-lg border ${getStatusBadge(order.status)}`}>
                                        {getStatusText(order.status)}
                                    </span>
                                </div>

                                {/* Stepper */}
                                <MinimalProgressStepper status={order.status} inboundType={order.inboundType} outboundType={order.outboundType} />

                                {/* Body 2 Columns */}
                                <div className="p-5 grid md:grid-cols-2 gap-6 bg-slate-50/50 border-t border-slate-100">
                                    
                                    {/* Cột Trái: Dịch vụ & Giao nhận */}
                                    <div className="space-y-5">
                                        {/* Danh sách món */}
                                        <div>
                                            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Dịch vụ đã đặt</h4>
                                            <div className="space-y-2">
                                                {order.items && order.items.length > 0 ? (
                                                    order.items.map(item => (
                                                        <div key={item.id} className="flex justify-between text-[13px]">
                                                            <span className="text-slate-700 font-medium">{item.serviceName} <span className="text-slate-400 ml-1">x {item.quantity} {item.unit}</span></span>
                                                            {item.priceAtBooking === 0 ? (
                                                                <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded border border-teal-100 font-bold tracking-tight">Báo giá tại quầy</span>
                                                            ) : (
                                                                <span className="text-slate-900 font-semibold">{formatMoney(item.priceAtBooking * item.quantity)}</span>
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-sm text-slate-400 italic">Không có dịch vụ</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Giao nhận */}
                                        <div>
                                            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Giao nhận & Thời gian</h4>
                                            <div className="bg-slate-100/70 p-3.5 rounded-xl border border-slate-200/60">
                                                <div className="flex justify-between items-start mb-2 border-b border-slate-200 pb-2">
                                                    <span className="text-xs text-slate-600 font-medium">Hẹn lấy đồ:</span>
                                                    <span className="text-[13px] font-bold text-slate-900">{new Date(order.bookingTime).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                                                </div>
                                                <div className="flex justify-between items-start mb-2 border-b border-slate-200 pb-2">
                                                    <span className="text-xs text-slate-600 font-medium">Đưa đồ:</span>
                                                    <span className="text-xs font-bold text-slate-900">{order.inboundType === 'SHOP_PICK_UP' ? 'Tiệm đến lấy' : 'Khách mang tới'}</span>
                                                </div>
                                                <div className="flex justify-between items-start mb-2 border-b border-slate-200 pb-2">
                                                    <span className="text-xs text-slate-600 font-medium">Nhận đồ:</span>
                                                    <span className="text-xs font-bold text-slate-900">{order.outboundType === 'SHOP_DELIVERY' ? 'Giao tận nhà' : 'Khách ra tiệm lấy'}</span>
                                                </div>
                                                {(order.inboundType === 'SHOP_PICK_UP' || order.outboundType === 'SHOP_DELIVERY') && (
                                                    <div className="pt-1 space-y-1">
                                                        <p className="font-bold text-slate-900 text-xs">{order.receiverName} <span className="font-normal text-slate-400 mx-1">•</span> {order.receiverPhone}</p>
                                                        {order.inboundType === 'SHOP_PICK_UP' && (
                                                            <p className="text-slate-600 text-[11px] line-clamp-2 leading-relaxed">
                                                                <span className="font-semibold text-slate-700">📍 Lấy đồ:</span> {order.pickupAddress || order.deliveryAddress}
                                                            </p>
                                                        )}
                                                        {order.outboundType === 'SHOP_DELIVERY' && (
                                                            <p className="text-slate-600 text-[11px] line-clamp-2 leading-relaxed">
                                                                <span className="font-semibold text-slate-700">📦 Trả đồ:</span> {order.deliveryAddress}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cột Phải: Thanh toán */}
                                    <div className="flex flex-col">
                                        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Chi phí & Thanh toán</h4>
                                        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex-1">
                                            <div className="space-y-2.5 mb-4 text-[13px]">
                                                <div className="flex justify-between text-slate-600">
                                                    <span>Tiền dịch vụ:</span> 
                                                    <span className="font-semibold text-slate-900">{formatMoney(order.serviceFee)}</span>
                                                </div>
                                                <div className="flex justify-between text-slate-600">
                                                    <span>Phí vận chuyển:</span> 
                                                    <span className="font-semibold text-slate-900">{order.shippingFee > 0 ? formatMoney(order.shippingFee) : 'Miễn phí'}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex justify-between items-center pt-3 border-t border-slate-100 mb-4">
                                                <span className="font-bold text-slate-900 uppercase text-[11px] tracking-wide">Tổng thanh toán</span>
                                                <span className="font-black text-slate-900 text-xl tracking-tight">{formatMoney(order.finalTotalPrice)}</span>
                                            </div>

                                            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                                {['READY', 'DELIVERING'].includes(order.status) && order.paymentStatus !== 'PAID' ? (
                                                    <select 
                                                        value={order.paymentMethod || 'COD'} 
                                                        onChange={(e) => handleUpdatePaymentMethod(order.id, e.target.value)}
                                                        className="text-[11px] font-bold uppercase text-slate-700 bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:border-teal-500 cursor-pointer"
                                                    >
                                                        <option value="COD">Tiền mặt (COD)</option>
                                                        <option value="VIETQR">Chuyển khoản VietQR</option>
                                                    </select>
                                                ) : (
                                                    <span className="text-[11px] font-bold uppercase text-slate-600">
                                                        {order.paymentMethod === 'VIETQR' ? 'Chuyển khoản' : 'Tiền mặt (COD)'}
                                                    </span>
                                                )}
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${order.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                                    {order.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Actions */}
                                <div className="px-5 py-4 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                                    <div className="text-xs text-slate-500 font-medium">
                                        <span className="hidden sm:inline">Liên hệ tiệm: </span>
                                        <a href="#" className="font-bold text-slate-700 hover:text-teal-600 transition-colors">Hotline</a>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                        <button 
                                            onClick={() => setChatOrder(order)}
                                            className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                            </svg>
                                            Chat
                                        </button>
                                        {order.status === 'PENDING' && (
                                            <button 
                                                onClick={() => handleCancelOrder(order.id)}
                                                disabled={isCancelling}
                                                className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-3.5 py-2 rounded-lg border border-rose-200 transition-all disabled:opacity-50"
                                            >
                                                Hủy đơn hàng
                                            </button>
                                        )}
                                        {['READY', 'DELIVERING'].includes(order.status) && order.paymentMethod === 'VIETQR' && order.paymentStatus !== 'PAID' && (
                                            <button 
                                                onClick={() => setQrOrder(order)}
                                                className="text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-lg shadow-sm transition-all"
                                            >
                                                Mã QR Thanh toán
                                            </button>
                                        )}
                                        {(order.status === 'COMPLETED' || order.status === 'CANCELLED') && (
                                            <button 
                                                onClick={handleReorder}
                                                className="text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-4 py-2 rounded-lg transition-all"
                                            >
                                                Đặt đơn mới
                                            </button>
                                        )}
                                        {order.status === 'COMPLETED' && !order.isReviewed && (
                                            <button 
                                                onClick={() => setReviewOrder(order)}
                                                className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-4 py-2 rounded-lg transition-all"
                                            >
                                                Đánh giá
                                            </button>
                                        )}
                                        {order.status === 'COMPLETED' && (
                                            order.hasDispute ? (
                                                <button 
                                                    onClick={() => setDisputeOrder(order)}
                                                    className="text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                                                >
                                                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                                                    Xem khiếu nại
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => setDisputeOrder(order)}
                                                    className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 px-3.5 py-2 rounded-lg transition-all flex items-center gap-1"
                                                    title="Báo cáo thiếu đồ, rách/hỏng hoặc vấn đề giặt ủi"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                    </svg>
                                                    Báo lỗi / Khiếu nại
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {page < totalPages - 1 && (
                            <div className="flex justify-center mt-6">
                                <button
                                    onClick={() => fetchOrders(page + 1, true)}
                                    disabled={loadingMore}
                                    className="bg-white border border-slate-200 text-slate-700 font-semibold py-2 px-6 rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50"
                                >
                                    {loadingMore ? 'Đang tải...' : 'Xem thêm đơn hàng'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <PaymentQrModal 
                isOpen={!!qrOrder} 
                onClose={() => setQrOrder(null)} 
                orderId={qrOrder?.id}
                orderCode={qrOrder?.id?.toString().padStart(4, '0')}
                amount={qrOrder?.finalTotalPrice}
            />

            <ReviewModal 
                isOpen={!!reviewOrder}
                onClose={() => setReviewOrder(null)}
                order={reviewOrder}
                onSuccess={handleReviewSuccess}
            />

            <DisputeModal 
                isOpen={!!disputeOrder}
                onClose={() => setDisputeOrder(null)}
                order={disputeOrder}
                onSuccess={() => fetchOrders(page)}
            />

            {chatOrder && (
                <ChatModal 
                    isOpen={!!chatOrder}
                    onClose={() => setChatOrder(null)}
                    orderId={chatOrder.id}
                    orderCode={chatOrder.id.toString().padStart(4, '0')}
                    shopName={chatOrder.shopName}
                    customerName={chatOrder.customerName}
                />
            )}
        </div>
    );
};

export default MyOrdersPage;