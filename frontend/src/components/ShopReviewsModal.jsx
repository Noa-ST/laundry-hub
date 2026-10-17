import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axiosClient from '../api/axiosClient';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const ShopReviewsModal = ({ shop, isOpen, onClose }) => {
    const [reviews, setReviews] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(null);

    useEffect(() => {
        if (isOpen && shop) {
            fetchReviews(0, false);
        }
    }, [isOpen, shop]);

    const fetchReviews = async (pageNum = 0, append = false) => {
        try {
            if (append) setLoadingMore(true);
            else setLoading(true);
            
            const res = await axiosClient.get(`/shops/${shop.id}/reviews?page=${pageNum}&size=10`);
            if (res.success) {
                if (append) {
                    setReviews(prev => [...prev, ...res.data.content]);
                } else {
                    setReviews(res.data.content);
                }
                setTotalPages(res.data.totalPages);
                setPage(pageNum);
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
        } finally {
            if (append) setLoadingMore(false);
            else setLoading(false);
        }
    };

    if (!isOpen || !shop) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] animate-slide-up" onClick={e => e.stopPropagation()}>
                
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-3xl shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Đánh giá & Nhận xét</h2>
                        <p className="text-sm text-slate-500 mt-1">{shop.name}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-100">
                        <svg className="w-5 h-5 stroke-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <div className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="text-sm text-slate-500 mt-3">Đang tải đánh giá...</p>
                        </div>
                    ) : reviews.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center">
                            <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <p className="text-slate-500 font-medium">Chưa có đánh giá nào cho tiệm này</p>
                            <p className="text-xs text-slate-400 mt-1">Hãy là người đầu tiên trải nghiệm và đánh giá nhé!</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {reviews.map(review => (
                                <div key={review.id} className="p-5 bg-white">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm">
                                                {review.customerName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-800 text-sm">{review.customerName}</h4>
                                                <span className="text-xs text-slate-500">
                                                    {format(new Date(review.createdAt), 'HH:mm dd/MM/yyyy', { locale: vi })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-0.5 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                                            <span className="text-sm font-bold text-amber-600 mr-1">{review.rating}</span>
                                            <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        </div>
                                    </div>
                                    {review.comment && (
                                        <p className="text-sm text-slate-600 mt-3 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            {review.comment}
                                        </p>
                                    )}
                                    {review.imageUrls && review.imageUrls.length > 0 && (
                                        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                                            {review.imageUrls.map((url, idx) => (
                                                <div 
                                                    key={idx} 
                                                    className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 cursor-pointer shrink-0 hover:opacity-80 transition-opacity"
                                                    onClick={() => setSelectedImage(url)}
                                                >
                                                    <img src={url} alt={`Review img ${idx}`} className="w-full h-full object-cover" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {page < totalPages - 1 && (
                                <div className="p-4 bg-white flex justify-center border-t border-slate-100">
                                    <button 
                                        onClick={() => fetchReviews(page + 1, true)}
                                        disabled={loadingMore}
                                        className="px-6 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                                    >
                                        {loadingMore ? 'Đang tải...' : 'Xem thêm đánh giá'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Image Viewer */}
            {selectedImage && (
                <div className="fixed inset-0 z-[10000] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setSelectedImage(null)}>
                    <button className="absolute top-4 right-4 text-white/70 hover:text-white p-2" onClick={() => setSelectedImage(null)}>
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <img src={selectedImage} alt="Full screen" className="max-w-full max-h-[90vh] object-contain rounded-xl" onClick={e => e.stopPropagation()} />
                </div>
            )}
        </div>,
        document.body
    );
};

export default ShopReviewsModal;
