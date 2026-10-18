import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';

const REASON_MAP = {
    MISSING_ITEM: 'Thiếu quần áo / đồ dùng',
    DAMAGED_ITEM: 'Rách, hỏng, lem màu hoặc co rút',
    WRONG_ITEM: 'Giao nhầm đồ của người khác',
    POOR_QUALITY: 'Giặt không sạch / còn mùi hôi',
    OTHER: 'Lý do khác'
};

const STATUS_CONFIG = {
    OPEN: { label: 'Chờ phản hồi', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    SHOP_REVIEWING: { label: 'Đang kiểm tra', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    ADMIN_REVIEWING: { label: 'Chờ Admin xử lý', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    RESOLVED_REFUNDED: { label: 'Đã giải quyết bồi thường', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    REJECTED: { label: 'Đã từ chối', color: 'bg-rose-50 text-rose-700 border-rose-200' }
};

const BANK_CODE_MAP = {
    'MBBank': 'MB',
    'Vietcombank': 'VCB',
    'Techcombank': 'TCB',
    'VPBank': 'VPB',
    'ACB': 'ACB',
    'BIDV': 'BIDV',
    'Agribank': 'VBA',
    'TPBank': 'TPB',
    'Sacombank': 'STB',
    'HDBank': 'HDB',
    'OCB': 'OCB',
    'VIB': 'VIB',
    'SHB': 'SHB',
    'MoMo / ViettelMoney': 'MB'
};

const getVietQrCode = (bankName) => {
    if (!bankName) return 'MB';
    return BANK_CODE_MAP[bankName] || bankName;
};

const OwnerDisputeModal = ({ isOpen, onClose, dispute, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [decision, setDecision] = useState('ACCEPT'); // 'ACCEPT' or 'REJECT'
    const [refundMethod, setRefundMethod] = useState('BANK_TRANSFER'); // 'BANK_TRANSFER' or 'VOUCHER'
    const [acceptedAmount, setAcceptedAmount] = useState(dispute?.requestedAmount || '');
    const [selectedProofFile, setSelectedProofFile] = useState(null); // { file, previewUrl }
    const [selectedEvidenceFiles, setSelectedEvidenceFiles] = useState([]); // [{ file, previewUrl }]
    const [shopResponseNote, setShopResponseNote] = useState('');
    const [previewImage, setPreviewImage] = useState(null);

    const cleanupPreviews = () => {
        if (selectedProofFile?.previewUrl) URL.revokeObjectURL(selectedProofFile.previewUrl);
        selectedEvidenceFiles.forEach(item => {
            if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
        });
        setSelectedProofFile(null);
        setSelectedEvidenceFiles([]);
    };

    useEffect(() => {
        if (isOpen && dispute) {
            setDecision('ACCEPT');
            setRefundMethod('BANK_TRANSFER');
            setAcceptedAmount(dispute.requestedAmount || '');
            setShopResponseNote('');
            cleanupPreviews();
        } else {
            cleanupPreviews();
        }
    }, [isOpen, dispute]);

    const handleClose = () => {
        cleanupPreviews();
        onClose();
    };

    if (!isOpen || !dispute) return null;

    const canRespond = dispute.status === 'OPEN' || dispute.status === 'SHOP_REVIEWING';

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        if (selectedEvidenceFiles.length + files.length > 5) {
            toast.error('Chỉ được chọn tối đa 5 ảnh đối chứng');
            return;
        }

        const newItems = files.map(file => ({
            file,
            previewUrl: URL.createObjectURL(file)
        }));
        setSelectedEvidenceFiles(prev => [...prev, ...newItems]);
        e.target.value = '';
    };

    const handleRemoveImage = (index) => {
        const item = selectedEvidenceFiles[index];
        if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
        setSelectedEvidenceFiles(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleProofFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (selectedProofFile?.previewUrl) URL.revokeObjectURL(selectedProofFile.previewUrl);
        setSelectedProofFile({
            file,
            previewUrl: URL.createObjectURL(file)
        });
        e.target.value = '';
    };

    const handleRemoveProof = () => {
        if (selectedProofFile?.previewUrl) URL.revokeObjectURL(selectedProofFile.previewUrl);
        setSelectedProofFile(null);
    };

    const copyToClipboard = (text, msg) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        toast.success(msg || `Đã sao chép: ${text}`);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (decision === 'ACCEPT') {
            const amt = parseFloat(acceptedAmount);
            if (isNaN(amt) || amt <= 0) {
                toast.error('Vui lòng nhập số tiền bồi thường hợp lệ');
                return;
            }
            if (refundMethod === 'BANK_TRANSFER' && !selectedProofFile) {
                toast.error('Vui lòng chọn ảnh chụp biên lai chuyển khoản VietQR để làm minh chứng');
                return;
            }
        }

        if (decision === 'REJECT' && !shopResponseNote.trim()) {
            toast.error('Vui lòng nêu rõ lý do từ chối để khách hàng nắm rõ');
            return;
        }

        try {
            setLoading(true);

            const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
            const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

            // Upload proof bill to Cloudinary if bank transfer
            let uploadedProofUrl = null;
            if (decision === 'ACCEPT' && refundMethod === 'BANK_TRANSFER' && selectedProofFile) {
                const formData = new FormData();
                formData.append('file', selectedProofFile.file);
                formData.append('upload_preset', uploadPreset);
                const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                uploadedProofUrl = data.secure_url || null;
            }

            // Upload shop evidence photos to Cloudinary if any
            let uploadedEvidenceUrls = [];
            if (selectedEvidenceFiles.length > 0) {
                for (const item of selectedEvidenceFiles) {
                    const formData = new FormData();
                    formData.append('file', item.file);
                    formData.append('upload_preset', uploadPreset);
                    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                        method: 'POST',
                        body: formData
                    });
                    const data = await res.json();
                    if (data.secure_url) uploadedEvidenceUrls.push(data.secure_url);
                }
            }

            await axiosClient.post(`/owner/disputes/${dispute.id}/respond`, {
                acceptRefund: decision === 'ACCEPT',
                acceptedAmount: decision === 'ACCEPT' ? parseFloat(acceptedAmount) : 0,
                refundMethod: decision === 'ACCEPT' ? refundMethod : null,
                refundProofUrl: uploadedProofUrl,
                shopResponseNote: shopResponseNote.trim(),
                shopEvidenceUrls: uploadedEvidenceUrls
            });

            toast.success(decision === 'ACCEPT' 
                ? (refundMethod === 'VOUCHER' ? 'Đã duyệt bồi thường bằng Voucher thành công' : 'Đã xác nhận bồi thường chuyển khoản VietQR') 
                : 'Đã gửi phản hồi từ chối khiếu nại');
            cleanupPreviews();
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Lỗi phản hồi khiếu nại:', err);
            toast.error(err.response?.data?.message || 'Không thể gửi phản hồi');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">Xử Lý Khiếu Nại Đơn Hàng #{dispute.orderId}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_CONFIG[dispute.status]?.color || 'bg-slate-50'}`}>
                                    {STATUS_CONFIG[dispute.status]?.label || dispute.status}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                    Tạo lúc: {new Date(dispute.createdAt).toLocaleString('vi-VN')}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1">
                    {/* Customer Claim Overview */}
                    <div className="bg-rose-50/50 rounded-xl p-4 border border-rose-100 space-y-3">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                Khiếu nại từ khách hàng
                            </h4>
                            <span className="text-xs font-bold text-rose-600">
                                Yêu cầu: {dispute.requestedAmount ? Number(dispute.requestedAmount).toLocaleString('vi-VN') + ' đ' : 'Thương lượng'}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <span className="text-slate-500">Vấn đề:</span>
                                <p className="font-semibold text-slate-900 mt-0.5">
                                    {REASON_MAP[dispute.reason] || dispute.reason}
                                </p>
                            </div>
                            <div>
                                <span className="text-slate-500">Mã đơn hàng:</span>
                                <p className="font-semibold text-slate-900 mt-0.5">#{dispute.orderId}</p>
                            </div>
                        </div>

                        <div>
                            <span className="text-xs text-slate-500">Chi tiết phản ánh:</span>
                            <p className="text-xs text-slate-800 bg-white p-3 rounded-lg border border-rose-100 mt-1 whitespace-pre-wrap">
                                {dispute.description || 'Không có mô tả'}
                            </p>
                        </div>

                        {dispute.evidenceUrls && dispute.evidenceUrls.length > 0 && (
                            <div>
                                <span className="text-xs text-slate-500 mb-1.5 block">Ảnh bằng chứng khách gửi:</span>
                                <div className="flex flex-wrap gap-2">
                                    {dispute.evidenceUrls.map((url, i) => (
                                        <img 
                                            key={i} 
                                            src={url} 
                                            alt="Bằng chứng khách" 
                                            onClick={() => setPreviewImage(url)}
                                            className="w-16 h-16 object-cover rounded-lg border border-rose-200 cursor-pointer hover:opacity-80 transition-opacity shadow-sm"
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Past Response if already answered */}
                    {!canRespond && (
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                Phản hồi đã lưu
                            </h4>
                            {dispute.acceptedAmount && (
                                <div className="space-y-1.5">
                                    <p className="text-xs">
                                        <span className="text-slate-500">Số tiền bồi thường:</span>{' '}
                                        <strong className="text-emerald-600">{Number(dispute.acceptedAmount).toLocaleString('vi-VN')} đ</strong>
                                    </p>
                                    <p className="text-xs">
                                        <span className="text-slate-500">Hình thức đền bù:</span>{' '}
                                        {dispute.refundMethod === 'VOUCHER' ? (
                                            <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                                                Voucher giảm giá: <code className="font-mono">{dispute.compensationVoucherCode}</code>
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                                                Chuyển khoản VietQR
                                            </span>
                                        )}
                                    </p>
                                    {dispute.refundProofUrl && (
                                        <div className="pt-1 flex items-center gap-2">
                                            <span className="text-xs text-slate-500">Biên lai chuyển khoản:</span>
                                            <button 
                                                type="button"
                                                onClick={() => setPreviewImage(dispute.refundProofUrl)}
                                                className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"
                                            >
                                                <img src={dispute.refundProofUrl} alt="Bill" className="w-6 h-6 object-cover rounded border border-slate-300" />
                                                Xem ảnh bill
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                            {dispute.shopResponseNote && (
                                <div>
                                    <span className="text-xs text-slate-500">Lời nhắn:</span>
                                    <p className="text-xs text-slate-800 bg-white p-2.5 rounded border border-slate-200 mt-1">
                                        {dispute.shopResponseNote}
                                    </p>
                                </div>
                            )}
                            {dispute.shopEvidenceUrls && dispute.shopEvidenceUrls.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {dispute.shopEvidenceUrls.map((url, i) => (
                                        <img 
                                            key={i} 
                                            src={url} 
                                            alt="Đối chứng shop" 
                                            onClick={() => setPreviewImage(url)}
                                            className="w-14 h-14 object-cover rounded-lg border border-slate-200 cursor-pointer"
                                        />
                                    ))}
                                </div>
                            )}
                            {dispute.adminDecisionNote && (
                                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 text-xs">
                                    <strong className="text-purple-900 block mb-1">Phán quyết từ Quản trị viên:</strong>
                                    <span className="text-purple-950">{dispute.adminDecisionNote}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Response Form for Owner */}
                    {canRespond && (
                        <form id="owner-dispute-response-form" onSubmit={handleSubmit} className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                                Phương án xử lý của tiệm
                            </h4>

                            <div className="grid grid-cols-2 gap-3">
                                <label 
                                    className={`p-3.5 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${
                                        decision === 'ACCEPT' 
                                            ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-200' 
                                            : 'border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <input 
                                        type="radio" 
                                        name="decision" 
                                        value="ACCEPT" 
                                        checked={decision === 'ACCEPT'} 
                                        onChange={() => setDecision('ACCEPT')} 
                                        className="text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-slate-900 block">Đồng ý bồi thường</span>
                                        <span className="text-[11px] text-slate-500">Hoàn tiền đền bù cho khách</span>
                                    </div>
                                </label>

                                <label 
                                    className={`p-3.5 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${
                                        decision === 'REJECT' 
                                            ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-200' 
                                            : 'border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <input 
                                        type="radio" 
                                        name="decision" 
                                        value="REJECT" 
                                        checked={decision === 'REJECT'} 
                                        onChange={() => setDecision('REJECT')} 
                                        className="text-rose-600 focus:ring-rose-500"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-slate-900 block">Từ chối khiếu nại</span>
                                        <span className="text-[11px] text-slate-500">Nêu lý do & đối chứng</span>
                                    </div>
                                </label>
                            </div>

                            {decision === 'ACCEPT' && (
                                <div className="space-y-3 animate-fade-in">
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-slate-700">
                                                Số tiền bồi thường (VNĐ) <span className="text-rose-500">*</span>
                                            </label>
                                            <button 
                                                type="button" 
                                                onClick={() => setAcceptedAmount(dispute.requestedAmount || '')}
                                                className="text-[11px] font-medium text-indigo-600 hover:underline"
                                            >
                                                Theo yêu cầu của khách ({Number(dispute.requestedAmount || 0).toLocaleString('vi-VN')} đ)
                                            </button>
                                        </div>
                                        <input 
                                            type="number"
                                            required
                                            min="1000"
                                            value={acceptedAmount}
                                            onChange={(e) => setAcceptedAmount(e.target.value)}
                                            placeholder="Nhập số tiền đền bù"
                                            className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        />
                                    </div>

                                    {/* Select Refund Method: VietQR Bank Transfer vs Voucher */}
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold text-slate-700">
                                            Hình thức thực hiện bồi thường <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <div 
                                                onClick={() => setRefundMethod('BANK_TRANSFER')}
                                                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                                    refundMethod === 'BANK_TRANSFER'
                                                        ? 'bg-blue-50/70 border-blue-400 ring-1 ring-blue-300'
                                                        : 'bg-white border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">VietQR</span>
                                                    <div>
                                                        <h5 className="text-xs font-bold text-slate-900">Phương án 1: Chuyển khoản VietQR</h5>
                                                        <p className="text-[10px] text-slate-500 mt-0.5">Quét QR chuyển ngay theo STK khách</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div 
                                                onClick={() => setRefundMethod('VOUCHER')}
                                                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                                    refundMethod === 'VOUCHER'
                                                        ? 'bg-amber-50/70 border-amber-400 ring-1 ring-amber-300'
                                                        : 'bg-white border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700">Voucher</span>
                                                    <div>
                                                        <h5 className="text-xs font-bold text-slate-900">Phương án 2: Bồi hoàn Voucher của tiệm</h5>
                                                        <p className="text-[10px] text-slate-500 mt-0.5">Cấp mã giảm giá khấu trừ doanh thu đơn sau</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* METHOD 1: VIETQR DETAILS */}
                                    {refundMethod === 'BANK_TRANSFER' && (
                                        <div className="p-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/40 rounded-xl border border-blue-200/80 space-y-3.5 animate-fade-in">
                                            <div className="flex items-center justify-between">
                                                <h5 className="text-xs font-bold text-blue-900 flex items-center gap-1.5 uppercase">
                                                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                                                    Quét mã VietQR chuyển khoản bồi hoàn
                                                </h5>
                                                <span className="text-[11px] text-blue-700 font-semibold">
                                                    Số tiền: {acceptedAmount ? Number(acceptedAmount).toLocaleString('vi-VN') + ' đ' : '0 đ'}
                                                </span>
                                            </div>

                                            {dispute.bankAccountNumber ? (
                                                <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-3.5 rounded-xl border border-blue-100 shadow-sm">
                                                    {/* QR Image */}
                                                    <div className="flex flex-col items-center">
                                                        <img 
                                                            src={`https://img.vietqr.io/image/${getVietQrCode(dispute.bankName)}-${dispute.bankAccountNumber}-compact2.png?amount=${acceptedAmount || 0}&addInfo=${encodeURIComponent('DEN BU DON ' + dispute.orderId)}&accountName=${encodeURIComponent(dispute.bankAccountName || '')}`} 
                                                            alt="VietQR Chuyển khoản"
                                                            className="w-36 h-36 object-contain rounded-lg border border-slate-200 shadow-xs cursor-pointer hover:scale-105 transition-transform"
                                                            onClick={() => setPreviewImage(`https://img.vietqr.io/image/${getVietQrCode(dispute.bankName)}-${dispute.bankAccountNumber}-compact2.png?amount=${acceptedAmount || 0}&addInfo=${encodeURIComponent('DEN BU DON ' + dispute.orderId)}&accountName=${encodeURIComponent(dispute.bankAccountName || '')}`)}
                                                            title="Click để phóng to mã QR"
                                                        />
                                                        <span className="text-[10px] text-slate-400 mt-1">Mở App ngân hàng quét mã</span>
                                                    </div>

                                                    {/* Account Details & Quick Copy */}
                                                    <div className="flex-1 space-y-2 text-xs w-full">
                                                        <div className="flex justify-between items-center py-1 border-b border-slate-100">
                                                            <span className="text-slate-500">Ngân hàng:</span>
                                                            <span className="font-bold text-slate-800">{dispute.bankName}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center py-1 border-b border-slate-100">
                                                            <span className="text-slate-500">Số tài khoản:</span>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-mono font-bold text-indigo-700">{dispute.bankAccountNumber}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => copyToClipboard(dispute.bankAccountNumber, 'Đã sao chép STK')}
                                                                    className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 font-semibold"
                                                                >
                                                                    Copy
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between items-center py-1 border-b border-slate-100">
                                                            <span className="text-slate-500">Chủ tài khoản:</span>
                                                            <span className="font-bold text-slate-800 uppercase">{dispute.bankAccountName || 'CHƯA CẬP NHẬT'}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center py-1">
                                                            <span className="text-slate-500">Nội dung CK:</span>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-mono font-bold text-slate-700">DEN BU DON {dispute.orderId}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => copyToClipboard(`DEN BU DON ${dispute.orderId}`, 'Đã sao chép nội dung')}
                                                                    className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 font-semibold"
                                                                >
                                                                    Copy
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
                                                    Khách hàng chưa cung cấp STK trong đơn khiếu nại. Bạn có thể chọn <strong>Phương án 2 (Bồi hoàn bằng Voucher)</strong> hoặc nhắn khách gửi STK qua khung chat.
                                                </div>
                                            )}

                                            {/* Proof Upload */}
                                            <div className="space-y-1.5">
                                                <label className="block text-xs font-bold text-slate-700">
                                                    Ảnh chụp biên lai chuyển khoản (Bill chuyển tiền) <span className="text-rose-500">*</span>
                                                </label>
                                                {selectedProofFile ? (
                                                    <div className="flex items-center gap-3 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                                                        <img 
                                                            src={selectedProofFile.previewUrl} 
                                                            alt="Biên lai chuyển khoản" 
                                                            className="w-12 h-12 object-cover rounded-lg border border-emerald-300 cursor-pointer"
                                                            onClick={() => setPreviewImage(selectedProofFile.previewUrl)}
                                                        />
                                                        <div className="flex-1">
                                                            <span className="text-xs font-bold text-emerald-800 block">Đã chọn ảnh biên lai giao dịch</span>
                                                            <span className="text-[10px] text-emerald-600">Ảnh sẽ được lưu và hiển thị cho khách khi bạn bấm xác nhận</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={handleRemoveProof}
                                                            className="text-xs font-bold text-rose-600 hover:text-rose-800 px-2 py-1 rounded hover:bg-rose-50"
                                                        >
                                                            Xóa & chọn lại
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <label className="w-full py-3.5 px-4 rounded-xl border-2 border-dashed border-blue-300 hover:border-blue-500 bg-white flex items-center justify-center gap-2 cursor-pointer transition-colors">
                                                        <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                        </svg>
                                                        <span className="text-xs font-bold text-blue-700">Chọn ảnh chụp màn hình biên lai chuyển khoản thành công</span>
                                                        <input 
                                                            type="file" 
                                                            accept="image/*" 
                                                            onChange={handleProofFileChange} 
                                                            className="hidden" 
                                                        />
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* METHOD 2: VOUCHER DETAILS */}
                                    {refundMethod === 'VOUCHER' && (
                                        <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-300/80 space-y-2.5 animate-fade-in">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                                <h5 className="text-xs font-black text-amber-900 uppercase">
                                                    Tiệm phát hành Voucher đền bù cho khách
                                                </h5>
                                            </div>
                                            <p className="text-xs text-amber-800 leading-relaxed">
                                                Tiệm của bạn sẽ cấp một mã Voucher trị giá <strong className="text-rose-600 font-bold">{acceptedAmount ? Number(acceptedAmount).toLocaleString('vi-VN') + ' đ' : '0 đ'}</strong> (định dạng <code>REFUND-{dispute.orderId}-XXXX</code>) gửi trực tiếp vào ví ưu đãi của khách hàng.
                                            </p>
                                            <div className="p-2.5 bg-white/80 rounded-lg border border-amber-200 text-[11px] text-amber-900 space-y-1.5">
                                                <p className="font-semibold text-amber-950">Trách nhiệm chi phí của tiệm:</p>
                                                <p>• Mã chỉ có giá trị sử dụng tại chính tiệm của bạn trong 90 ngày. Khoản tiền bồi thường này sẽ được <strong>khấu trừ vào doanh thu của tiệm</strong> ở lần giặt tiếp theo của khách.</p>
                                                <p>• <strong className="text-rose-600">Lưu ý quan trọng:</strong> Chỉ áp dụng hình thức này khi <strong>đã thương lượng và được khách hàng đồng ý</strong>. Nếu khách đòi tiền mặt mà tiệm tự ý đền bằng voucher, khách có thể gửi khiếu nại lên Ban Quản Trị để xử lý phạt vi phạm.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    {decision === 'ACCEPT' ? 'Lời nhắn gửi khách hàng (tùy chọn)' : 'Lý do từ chối cụ thể *'}
                                </label>
                                <textarea 
                                    rows="3"
                                    required={decision === 'REJECT'}
                                    value={shopResponseNote}
                                    onChange={(e) => setShopResponseNote(e.target.value)}
                                    placeholder={decision === 'ACCEPT' ? 'Gửi lời xin lỗi hoặc ghi chú giải quyết...' : 'Giải thích rõ tại sao từ chối kèm thông tin camera kiểm tra khi đóng gói...'}
                                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                            </div>

                            {/* Evidence from Shop */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Hình ảnh đối chứng của tiệm (Ảnh đóng gói, camera...)
                                </label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {selectedEvidenceFiles.map((item, idx) => (
                                        <div key={idx} className="relative group w-16 h-16 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                            <img 
                                                src={item.previewUrl} 
                                                alt="Đối chứng shop" 
                                                onClick={() => setPreviewImage(item.previewUrl)}
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

                                    {selectedEvidenceFiles.length < 5 && (
                                        <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-400 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors">
                                            <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                            </svg>
                                            <span className="text-[9px] font-semibold">Tải ảnh</span>
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
                                <span className="text-[11px] text-slate-400">Định dạng hỗ trợ: JPG, PNG, WEBP (tối đa 5 ảnh). Ảnh chỉ được tải lên khi bạn nhấn gửi.</span>
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
                    {canRespond && (
                        <button
                            type="submit"
                            form="owner-dispute-response-form"
                            disabled={loading}
                            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all disabled:opacity-50 flex items-center gap-2 ${
                                decision === 'ACCEPT' 
                                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' 
                                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                            }`}
                        >
                            {loading ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Đang tải ảnh & xử lý...</span>
                                </>
                            ) : decision === 'ACCEPT' ? (
                                'Xác nhận bồi thường'
                            ) : (
                                'Gửi từ chối khiếu nại'
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Lightbox Preview */}
            {previewImage && (
                <div 
                    className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => setPreviewImage(null)}
                >
                    <img src={previewImage} alt="Xem lớn" className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl" />
                </div>
            )}
        </div>
    );
};

export default OwnerDisputeModal;
