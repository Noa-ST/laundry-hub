import React, { useState } from 'react';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';

const ReviewModal = ({ isOpen, onClose, order, onSuccess }) => {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen || !order) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) {
            setError('Vui lòng chọn số sao đánh giá');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            let imageUrls = [];
            if (images.length > 0) {
                const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
                const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
                
                for (const file of images) {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('upload_preset', uploadPreset);
                    
                    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                        method: 'POST',
                        body: formData
                    });
                    const data = await response.json();
                    if (data.secure_url) {
                        imageUrls.push(data.secure_url);
                    }
                }
            }
            
            await axiosClient.post(`/shops/${order.shopId}/reviews`, {
                orderId: order.id,
                rating,
                comment,
                imageUrls
            });
            
            onSuccess();
        } catch (err) {
            setError(err.response?.data?.message || 'Có lỗi xảy ra khi gửi đánh giá');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl transform transition-all">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-900">Đánh giá dịch vụ</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="p-6">
                    <div className="text-center mb-6">
                        <p className="text-sm text-slate-500 mb-2">Bạn đánh giá thế nào về đơn hàng tại</p>
                        <h4 className="font-bold text-slate-900 text-lg">{order.shopName}</h4>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="flex justify-center mb-6 space-x-2">
                            {[...Array(5)].map((_, index) => {
                                const starValue = index + 1;
                                return (
                                    <button
                                        type="button"
                                        key={starValue}
                                        className={`transition-colors focus:outline-none transform hover:scale-110 ${
                                            starValue <= (hover || rating) ? 'text-amber-400' : 'text-slate-200'
                                        }`}
                                        onClick={() => setRating(starValue)}
                                        onMouseEnter={() => setHover(starValue)}
                                        onMouseLeave={() => setHover(rating)}
                                    >
                                        <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    </button>
                                );
                            })}
                        </div>

                        {error && (
                            <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 text-center">
                                {error}
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Nhận xét của bạn (Không bắt buộc)</label>
                            <textarea
                                rows="3"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all outline-none text-sm placeholder:text-slate-400"
                                placeholder="Hãy chia sẻ trải nghiệm của bạn về dịch vụ nhé..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                            ></textarea>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Đính kèm ảnh (Tối đa 3 ảnh)</label>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => {
                                    if (e.target.files.length > 3) {
                                        toast("Chỉ được chọn tối đa 3 ảnh");
                                        e.target.value = '';
                                        return;
                                    }
                                    setImages(Array.from(e.target.files));
                                }}
                                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                            />
                            {images.length > 0 && (
                                <div className="flex gap-2 mt-3">
                                    {images.map((file, idx) => (
                                        <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                                            <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl transition-all shadow-sm focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50"
                        >
                            {loading ? 'Đang gửi...' : 'Gửi đánh giá'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ReviewModal;
