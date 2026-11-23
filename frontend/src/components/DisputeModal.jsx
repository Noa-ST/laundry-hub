import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';

const REASON_OPTIONS = [
    { value: 'MISSING_ITEM', label: 'Thiếu quần áo / đồ dùng', desc: 'Giao thiếu so với số lượng hoặc danh mục đã gửi' },
    { value: 'DAMAGED_ITEM', label: 'Rách, hỏng, lem màu hoặc co rút', desc: 'Đồ bị hư hỏng, rách vải, phai/lem màu trong quá trình giặt' },
    { value: 'WRONG_ITEM', label: 'Giao nhầm đồ của người khác', desc: 'Nhận phải quần áo không thuộc về mình' },
    { value: 'POOR_QUALITY', label: 'Giặt không sạch / còn mùi hôi', desc: 'Vết bẩn chưa được xử lý hoặc đồ chưa được sấy khô hoàn toàn' },
    { value: 'OTHER', label: 'Lý do khác', desc: 'Các vấn đề phát sinh khác' }
];

const POPULAR_BANKS = [
    'MBBank', 'Vietcombank', 'Techcombank', 'VPBank', 'ACB', 'BIDV', 
    'Agribank', 'TPBank', 'Sacombank', 'HDBank', 'OCB', 'VIB', 'SHB', 'MoMo / ViettelMoney'
];

const STATUS_CONFIG = {
    OPEN: { label: 'Chờ tiệm phản hồi', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    SHOP_REVIEWING: { label: 'Tiệm đang kiểm tra', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    ADMIN_REVIEWING: { label: 'Admin đang xử lý tranh chấp', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    RESOLVED_REFUNDED: { label: 'Đã giải quyết bồi thường', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    REJECTED: { label: 'Tiệm từ chối khiếu nại', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    ADMIN_REJECTED: { label: 'Admin đã bác bỏ khiếu nại', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    CANCELLED: { label: 'Khách hàng đã rút khiếu nại', color: 'bg-slate-100 text-slate-600 border-slate-200' }
};

const DisputeModal = ({ isOpen, onClose, order, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(false);
    const [existingDispute, setExistingDispute] = useState(null);

    // Form state for creating
    const [reason, setReason] = useState('MISSING_ITEM');
    const [requestedAmount, setRequestedAmount] = useState('');
    const [description, setDescription] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]); // Array of { file: File, previewUrl: string }
    const [bankName, setBankName] = useState('MBBank');
    const [bankAccountNumber, setBankAccountNumber] = useState('');
    const [bankAccountName, setBankAccountName] = useState('');
    const [selectedImagePreview, setSelectedImagePreview] = useState(null);

    // Escalation / Cancel actions state
    const [actionLoading, setActionLoading] = useState(false);

    const cleanupPreviews = () => {
        selectedFiles.forEach(item => {
            if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
        });
        setSelectedFiles([]);
    };

    const handleClose = () => {
        cleanupPreviews();
        onClose();
    };

    useEffect(() => {
        if (isOpen && order) {
            if (order.hasDispute) {
                fetchDisputeDetails();
            } else {
                setExistingDispute(null);
                setReason('MISSING_ITEM');
                setDescription('');
                cleanupPreviews();
                setBankAccountNumber('');
                setBankAccountName(order.receiverName || '');
                setRequestedAmount(order.finalTotalPrice || order.estimatedTotal || 0);
            }
        } else {
            cleanupPreviews();
        }
    }, [isOpen, order]);

    const fetchDisputeDetails = async () => {
        try {
            setFetchLoading(true);
            const res = await axiosClient.get(`/customer/disputes/orders/${order.id}`);
            const data = res.data ? res.data : res;
            setExistingDispute(data);
        } catch (err) {
            console.error('Lỗi lấy chi tiết khiếu nại:', err);
            setExistingDispute(null);
            setRequestedAmount(order.finalTotalPrice || order.estimatedTotal || 0);
        } finally {
            setFetchLoading(false);
        }
    };

    if (!isOpen || !order) return null;

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        if (selectedFiles.length + files.length > 5) {
            toast.error('Chỉ được chọn tối đa 5 ảnh bằng chứng');
            return;
        }

        const newItems = files.map(file => ({
            file,
            previewUrl: URL.createObjectURL(file)
        }));

        setSelectedFiles(prev => [...prev, ...newItems]);
        e.target.value = '';
    };

    const handleRemoveImage = (indexToRemove) => {
        const item = selectedFiles[indexToRemove];
        if (item?.previewUrl) {
            URL.revokeObjectURL(item.previewUrl);
        }
        setSelectedFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    const handleSubmitCreate = async (e) => {
        e.preventDefault();
        if (!description.trim()) {
            toast.error('Vui lòng nhập mô tả sự cố cụ thể');
            return;
        }

        const amount = parseFloat(requestedAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error('Vui lòng nhập số tiền yêu cầu bồi hoàn hợp lệ');
            return;
        }

        try {
            setLoading(true);

            // Upload selected files to Cloudinary only when user submits the form
            let uploadedUrls = [];
            if (selectedFiles.length > 0) {
                const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
                const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

                if (!cloudName || !uploadPreset) {
                    toast.error('Chưa cấu hình dịch vụ tải ảnh');
                    setLoading(false);
                    return;
                }

                for (const item of selectedFiles) {
                    const formData = new FormData();
                    formData.append('file', item.file);
                    formData.append('upload_preset', uploadPreset);

                    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                        method: 'POST',
                        body: formData
                    });
                    const data = await res.json();
                    if (data.secure_url) {
                        uploadedUrls.push(data.secure_url);
                    }
                }
            }

            await axiosClient.post(`/customer/disputes/orders/${order.id}`, {
                reason,
                description: description.trim(),
                evidenceUrls: uploadedUrls,
                requestedAmount: amount,
                bankName,
                bankAccountNumber: bankAccountNumber.trim(),
                bankAccountName: bankAccountName.trim().toUpperCase()
            });

            toast.success('Gửi khiếu nại thành công! Tiệm sẽ phản hồi phương án bồi thường sớm nhất.');
            cleanupPreviews();
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Lỗi tạo khiếu nại:', err);
            toast.error(err.response?.data?.message || 'Không thể gửi khiếu nại, vui lòng thử lại');
        } finally {
            setLoading(false);
        }
    };

    const handleEscalateToAdmin = async () => {
        if (!existingDispute) return;
        if (!window.confirm('Bạn có chắc chắn muốn yêu cầu Admin can thiệp và giải quyết tranh chấp này?')) return;

        try {
            setActionLoading(true);
            await axiosClient.post(`/customer/disputes/${existingDispute.id}/escalate`);
            toast.success('Đã gửi yêu cầu tới Admin! Đội ngũ hỗ trợ sẽ xem xét đối chất 2 bên.');
            fetchDisputeDetails();
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error('Lỗi escalate:', err);
            toast.error(err.response?.data?.message || 'Không thể yêu cầu Admin can thiệp');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelDispute = async () => {
        if (!existingDispute) return;
        if (!window.confirm('Bạn có chắc chắn muốn rút lại khiếu nại này?')) return;

        try {
            setActionLoading(true);
            await axiosClient.post(`/customer/disputes/${existingDispute.id}/cancel`);
            toast.success('Đã hủy khiếu nại');
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Lỗi hủy khiếu nại:', err);
            toast.error(err.response?.data?.message || 'Không thể hủy khiếu nại');
        } finally {
            setActionLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Đã sao chép mã: ' + text);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                {existingDispute ? 'Chi Tiết Khiếu Nại & Bồi Thường' : 'Báo Cáo Sự Cố & Yêu Cầu Bồi Thường'}
                            </h3>
                            <p className="text-xs text-slate-500">
                                Đơn hàng #{order.id} • {order.shopName || 'Tiệm giặt'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={handleClose}
                        className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1">
                    {fetchLoading ? (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-500">
                            <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                            <span className="text-xs">Đang tải thông tin khiếu nại...</span>
                        </div>
                    ) : existingDispute ? (
                        /* VIEW EXISTING DISPUTE */
                        <div className="space-y-5">
                            {/* Status Banner */}
                            <div className={`p-4 rounded-xl border flex items-center justify-between ${STATUS_CONFIG[existingDispute.status]?.color || 'bg-slate-50 text-slate-700'}`}>
                                <div className="flex items-center space-x-3">
                                    <div className="w-2.5 h-2.5 rounded-full bg-current animate-pulse"></div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider">Trạng thái giải quyết</p>
                                        <p className="text-sm font-bold">{STATUS_CONFIG[existingDispute.status]?.label || existingDispute.status}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs opacity-75">Cập nhật lần cuối</span>
                                    <p className="text-xs font-medium">
                                        {existingDispute.updatedAt ? new Date(existingDispute.updatedAt).toLocaleString('vi-VN') : 'Mới tạo'}
                                    </p>
                                </div>
                            </div>

                            {/* COMPENSATION RESULT (VOUCHER OR BANK TRANSFER) */}
                            {existingDispute.status === 'RESOLVED_REFUNDED' && (
                                existingDispute.refundMethod === 'VOUCHER' ? (
                                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-4 shadow-sm space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                                <div>
                                                    <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">
                                                        Đã Bồi Thường Bằng Voucher Giảm Giá
                                                    </h4>
                                                    <p className="text-[11px] text-amber-700">
                                                        Mã giảm giá đã được kích hoạt cho lần đặt giặt tiếp theo tại tiệm
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-sm font-black text-rose-600">
                                                {Number(existingDispute.acceptedAmount || 0).toLocaleString('vi-VN')} đ
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between bg-white/90 border border-amber-200 p-3 rounded-xl">
                                            <div>
                                                <span className="text-[10px] text-slate-400 block font-bold uppercase">Mã Voucher của bạn:</span>
                                                <span className="text-sm font-black text-slate-900 font-mono tracking-wider">
                                                    {existingDispute.compensationVoucherCode}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => copyToClipboard(existingDispute.compensationVoucherCode)}
                                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                                            >
                                                Sao chép mã
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-300 rounded-2xl p-4 shadow-sm space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                                                <div>
                                                    <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                                                        Đã Chuyển Khoản Bồi Thường Trực Tiếp
                                                    </h4>
                                                    <p className="text-[11px] text-emerald-700">
                                                        Tiệm đã chuyển khoản theo thông tin tài khoản bạn đã cung cấp
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-sm font-black text-emerald-700">
                                                {Number(existingDispute.acceptedAmount || 0).toLocaleString('vi-VN')} đ
                                            </span>
                                        </div>

                                        {existingDispute.refundProofUrl && (
                                            <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between">
                                                <span className="text-xs text-emerald-900 font-medium">Biên lai chuyển khoản:</span>
                                                <button
                                                    onClick={() => setSelectedImagePreview(existingDispute.refundProofUrl)}
                                                    className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                                                >
                                                    <img src={existingDispute.refundProofUrl} alt="Bill" className="w-6 h-6 rounded object-cover border border-emerald-300" />
                                                    Xem ảnh bill chuyển khoản
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )
                            )}

                            {/* Customer Details Box */}
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-1.5 h-3.5 bg-rose-500 rounded-full"></span>
                                    Nội dung bạn đã gửi
                                </h4>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <span className="text-slate-500">Lý do khiếu nại:</span>
                                        <p className="font-semibold text-slate-900 mt-0.5">
                                            {REASON_OPTIONS.find(r => r.value === existingDispute.reason)?.label || existingDispute.reason}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Số tiền yêu cầu bồi thường:</span>
                                        <p className="font-bold text-rose-600 mt-0.5">
                                            {existingDispute.requestedAmount ? Number(existingDispute.requestedAmount).toLocaleString('vi-VN') + ' đ' : 'Thương lượng'}
                                        </p>
                                    </div>
                                </div>

                                {existingDispute.bankAccountNumber && (
                                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs">
                                        <span className="text-slate-400 font-semibold block text-[10px] uppercase">STK nhận tiền bồi hoàn:</span>
                                        <span className="font-bold text-slate-900">
                                            {existingDispute.bankName} • {existingDispute.bankAccountNumber} ({existingDispute.bankAccountName})
                                        </span>
                                    </div>
                                )}

                                <div>
                                    <span className="text-xs text-slate-500">Mô tả sự cố:</span>
                                    <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 mt-1 whitespace-pre-wrap">
                                        {existingDispute.description || 'Không có mô tả chi tiết'}
                                    </p>
                                </div>

                                {existingDispute.evidenceUrls && existingDispute.evidenceUrls.length > 0 && (
                                    <div>
                                        <span className="text-xs text-slate-500 mb-1.5 block">Ảnh bằng chứng của bạn:</span>
                                        <div className="flex flex-wrap gap-2">
                                            {existingDispute.evidenceUrls.map((url, i) => (
                                                <img 
                                                    key={i} 
                                                    src={url} 
                                                    alt="Bằng chứng" 
                                                    onClick={() => setSelectedImagePreview(url)}
                                                    className="w-16 h-16 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity shadow-sm"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Shop Response Box (if any) */}
                            {(existingDispute.shopResponseNote || existingDispute.acceptedAmount || (existingDispute.shopEvidenceUrls && existingDispute.shopEvidenceUrls.length > 0)) && (
                                <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 space-y-3">
                                    <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-2">
                                        <span className="w-1.5 h-3.5 bg-indigo-600 rounded-full"></span>
                                        Phản hồi từ Chủ Tiệm Giặt
                                    </h4>
                                    
                                    {existingDispute.shopResponseNote && (
                                        <div>
                                            <span className="text-xs text-slate-500">Lời nhắn từ tiệm:</span>
                                            <p className="text-xs text-slate-800 bg-white p-3 rounded-lg border border-indigo-100 mt-1 whitespace-pre-wrap">
                                                {existingDispute.shopResponseNote}
                                            </p>
                                        </div>
                                    )}

                                    {existingDispute.shopEvidenceUrls && existingDispute.shopEvidenceUrls.length > 0 && (
                                        <div>
                                            <span className="text-xs text-slate-500 mb-1.5 block">Ảnh/Video đối chứng từ tiệm:</span>
                                            <div className="flex flex-wrap gap-2">
                                                {existingDispute.shopEvidenceUrls.map((url, i) => (
                                                    <img 
                                                        key={i} 
                                                        src={url} 
                                                        alt="Đối chứng shop" 
                                                        onClick={() => setSelectedImagePreview(url)}
                                                        className="w-16 h-16 object-cover rounded-lg border border-indigo-200 cursor-pointer hover:opacity-80 transition-opacity shadow-sm"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Admin Decision Box (if any) */}
                            {existingDispute.adminDecisionNote && (
                                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200 space-y-2">
                                    <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-2">
                                        <span className="w-1.5 h-3.5 bg-purple-600 rounded-full"></span>
                                        Phán quyết từ Quản trị viên (Admin)
                                    </h4>
                                    <p className="text-xs text-purple-950 bg-white p-3 rounded-lg border border-purple-100">
                                        {existingDispute.adminDecisionNote}
                                    </p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-end">
                                {existingDispute.status === 'REJECTED' && (
                                    <button
                                        type="button"
                                        disabled={actionLoading}
                                        onClick={handleEscalateToAdmin}
                                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                                        </svg>
                                        Không đồng ý • Yêu cầu Admin can thiệp
                                    </button>
                                )}

                                {existingDispute.status === 'OPEN' && (
                                    <button
                                        type="button"
                                        disabled={actionLoading}
                                        onClick={handleCancelDispute}
                                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-all disabled:opacity-50"
                                    >
                                        Rút lại khiếu nại này
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* CREATE NEW DISPUTE FORM */
                        <form id="dispute-create-form" onSubmit={handleSubmitCreate} className="space-y-4">
                            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/70 text-xs text-amber-800 leading-relaxed">
                                <strong>Chính sách bảo vệ khách hàng:</strong> Quý khách vui lòng cung cấp lý do cụ thể kèm ảnh chụp rõ nét tình trạng quần áo/đồ dùng. Shop sẽ xem xét và lựa chọn phương án hoàn tiền qua VietQR hoặc tặng Voucher đền bù.
                            </div>

                            {/* Reason Selector */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Vấn đề bạn gặp phải <span className="text-rose-500">*</span>
                                </label>
                                <div className="space-y-2">
                                    {REASON_OPTIONS.map((opt) => (
                                        <label 
                                            key={opt.value}
                                            className={`flex items-start p-3 rounded-xl border cursor-pointer transition-all ${
                                                reason === opt.value 
                                                    ? 'bg-rose-50/50 border-rose-300 ring-1 ring-rose-200' 
                                                    : 'border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            <input 
                                                type="radio" 
                                                name="disputeReason" 
                                                value={opt.value} 
                                                checked={reason === opt.value}
                                                onChange={(e) => setReason(e.target.value)}
                                                className="mt-0.5 text-rose-600 focus:ring-rose-500"
                                            />
                                            <div className="ml-3">
                                                <span className="text-xs font-bold text-slate-900 block">{opt.label}</span>
                                                <span className="text-[11px] text-slate-500 leading-tight">{opt.desc}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Requested Amount */}
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="text-xs font-bold text-slate-700">
                                        Số tiền mong muốn bồi hoàn (VNĐ) <span className="text-rose-500">*</span>
                                    </label>
                                    <button 
                                        type="button"
                                        onClick={() => setRequestedAmount(order.finalTotalPrice || order.estimatedTotal || 0)}
                                        className="text-[11px] font-medium text-rose-600 hover:underline"
                                    >
                                        Hoàn toàn bộ đơn ({Number(order.finalTotalPrice || order.estimatedTotal || 0).toLocaleString('vi-VN')} đ)
                                    </button>
                                </div>
                                <input 
                                    type="number"
                                    required
                                    min="1000"
                                    value={requestedAmount}
                                    onChange={(e) => setRequestedAmount(e.target.value)}
                                    placeholder="Ví dụ: 50000"
                                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                                />
                            </div>

                            {/* Bank Details for VietQR Refund */}
                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-slate-700">TK</span>
                                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                        Tài khoản nhận tiền (Nếu chọn nhận chuyển khoản VietQR)
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                    <div>
                                        <label className="block text-[11px] text-slate-500 mb-1">Ngân hàng:</label>
                                        <select
                                            value={bankName}
                                            onChange={(e) => setBankName(e.target.value)}
                                            className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-rose-500"
                                        >
                                            {POPULAR_BANKS.map(b => (
                                                <option key={b} value={b}>{b}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-slate-500 mb-1">Số tài khoản:</label>
                                        <input
                                            type="text"
                                            value={bankAccountNumber}
                                            onChange={(e) => setBankAccountNumber(e.target.value)}
                                            placeholder="Ví dụ: 0399123456"
                                            className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-rose-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-slate-500 mb-1">Tên chủ tài khoản:</label>
                                        <input
                                            type="text"
                                            value={bankAccountName}
                                            onChange={(e) => setBankAccountName(e.target.value)}
                                            placeholder="NGUYEN VAN A"
                                            className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs uppercase focus:ring-1 focus:ring-rose-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Mô tả chi tiết sự cố <span className="text-rose-500">*</span>
                                </label>
                                <textarea 
                                    rows="3"
                                    required
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Mô tả cụ thể áo/quần bị thiếu, vết rách hoặc sự cố gặp phải khi nhận đồ..."
                                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                                />
                            </div>

                            {/* Evidence Upload */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Hình ảnh bằng chứng (khuyến nghị có để xử lý nhanh chóng)
                                </label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {selectedFiles.map((item, idx) => (
                                        <div key={idx} className="relative group w-16 h-16 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                            <img 
                                                src={item.previewUrl} 
                                                alt="Bằng chứng" 
                                                onClick={() => setSelectedImagePreview(item.previewUrl)}
                                                className="w-full h-full object-cover cursor-pointer" 
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveImage(idx)}
                                                className="absolute inset-0 bg-slate-900/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}

                                    {selectedFiles.length < 5 && (
                                        <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 hover:border-rose-400 flex flex-col items-center justify-center text-slate-400 hover:text-rose-500 cursor-pointer transition-colors">
                                            <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                            </svg>
                                            <span className="text-[9px] font-semibold">Thêm ảnh</span>
                                            <input 
                                                type="file" 
                                                multiple 
                                                accept="image/*" 
                                                onChange={handleFileChange} 
                                                className="hidden" 
                                            />
                                        </label>
                                    )}
                                </div>
                                <span className="text-[11px] text-slate-400">Định dạng hỗ trợ: JPG, PNG, WEBP (tối đa 5 ảnh). Ảnh chỉ được tải lên khi bạn nhấn gửi khiếu nại.</span>
                            </div>
                        </form>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end items-center gap-3">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                        Đóng
                    </button>
                    {!existingDispute && (
                        <button
                            type="submit"
                            form="dispute-create-form"
                            disabled={loading}
                            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-200 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Đang tải ảnh & gửi...</span>
                                </>
                            ) : (
                                'Xác nhận gửi khiếu nại'
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Image Preview Lightbox */}
            {selectedImagePreview && (
                <div 
                    className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => setSelectedImagePreview(null)}
                >
                    <img 
                        src={selectedImagePreview} 
                        alt="Xem lớn" 
                        className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl" 
                    />
                </div>
            )}
        </div>
    );
};

export default DisputeModal;
