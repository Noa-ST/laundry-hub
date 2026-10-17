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

const AdminDisputeModal = ({ isOpen, onClose, dispute, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [decision, setDecision] = useState('REFUND'); // 'REFUND' or 'REJECT'
    const [refundMethod, setRefundMethod] = useState('BANK_TRANSFER'); // 'BANK_TRANSFER' or 'VOUCHER'
    const [selectedProofFile, setSelectedProofFile] = useState(null); // { file, previewUrl }
    const [adminDecisionNote, setAdminDecisionNote] = useState('');
    const [previewImage, setPreviewImage] = useState(null);

    const cleanupPreviews = () => {
        if (selectedProofFile?.previewUrl) URL.revokeObjectURL(selectedProofFile.previewUrl);
        setSelectedProofFile(null);
    };

    useEffect(() => {
        if (isOpen && dispute) {
            setDecision('REFUND');
            setRefundMethod('BANK_TRANSFER');
            setAdminDecisionNote('');
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

    const canResolve = dispute.status === 'ADMIN_REVIEWING' || dispute.status === 'OPEN' || dispute.status === 'SHOP_REVIEWING';

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

    const handleResolve = async (e) => {
        e.preventDefault();
        if (!adminDecisionNote.trim()) {
            toast.error('Vui lòng nhập căn cứ/ghi chú phán quyết của Quản trị viên');
            return;
        }

        if (decision === 'REFUND' && refundMethod === 'BANK_TRANSFER' && !selectedProofFile) {
            toast.error('Vui lòng chọn ảnh chụp biên lai chuyển khoản để làm minh chứng');
            return;
        }

        try {
            setLoading(true);

            let uploadedProofUrl = null;
            if (decision === 'REFUND' && refundMethod === 'BANK_TRANSFER' && selectedProofFile) {
                const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
                const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

                if (!cloudName || !uploadPreset) {
                    toast.error('Chưa cấu hình dịch vụ tải ảnh');
                    setLoading(false);
                    return;
                }

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

            await axiosClient.post(`/admin/disputes/${dispute.id}/resolve`, {
                acceptRefund: decision === 'REFUND',
                refundMethod: decision === 'REFUND' ? refundMethod : null,
                refundProofUrl: uploadedProofUrl,
                adminDecisionNote: adminDecisionNote.trim()
            });

            toast.success(decision === 'REFUND' 
                ? (refundMethod === 'VOUCHER' ? 'Đã duyệt bồi thường bằng Voucher cho khách' : 'Đã xác nhận bồi thường chuyển khoản VietQR') 
                : 'Đã bác bỏ khiếu nại');
            cleanupPreviews();
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Lỗi phán quyết tranh chấp:', err);
            toast.error(err.response?.data?.message || 'Không thể gửi phán quyết');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-white">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                            ⚖️
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                Phán Quyết Tranh Chấp • Đơn Hàng #{dispute.orderId}
                            </h3>
                            <p className="text-xs text-slate-500">
                                Mã khiếu nại #{dispute.id} • Khách #{dispute.customerId} vs Tiệm #{dispute.shopId}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    {/* Comparison Side-by-Side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Side A: Customer */}
                        <div className="bg-rose-50/50 rounded-xl p-4 border border-rose-200/70 space-y-2.5">
                            <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                Phía Khách Hàng
                            </h4>

                            <div className="text-xs space-y-1">
                                <p><span className="text-slate-500">Lý do:</span> <strong>{REASON_MAP[dispute.reason] || dispute.reason}</strong></p>
                                <p><span className="text-slate-500">Đòi bồi hoàn:</span> <strong className="text-rose-600">{dispute.requestedAmount ? Number(dispute.requestedAmount).toLocaleString('vi-VN') + ' đ' : 'N/A'}</strong></p>
                            </div>

                            <div className="text-xs">
                                <span className="text-slate-500">Mô tả sự cố:</span>
                                <div className="bg-white p-2.5 rounded-lg border border-rose-100 mt-1 text-slate-800 whitespace-pre-wrap">
                                    {dispute.description || 'Không có mô tả'}
                                </div>
                            </div>

                            {dispute.evidenceUrls && dispute.evidenceUrls.length > 0 && (
                                <div>
                                    <span className="text-[11px] text-slate-500 block mb-1">Ảnh bằng chứng khách:</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {dispute.evidenceUrls.map((url, i) => (
                                            <img 
                                                key={i} 
                                                src={url} 
                                                alt="Bằng chứng khách" 
                                                onClick={() => setPreviewImage(url)} 
                                                className="w-14 h-14 object-cover rounded-lg border border-rose-200 cursor-pointer hover:opacity-80"
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Side B: Shop */}
                        <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-200/70 space-y-2.5">
                            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                Phía Tiệm Giặt
                            </h4>

                            <div className="text-xs space-y-1">
                                <p><span className="text-slate-500">Trạng thái tiệm:</span> <strong>{dispute.shopResponseNote ? 'Đã phản hồi' : 'Chưa phản hồi'}</strong></p>
                                <p><span className="text-slate-500">Đồng ý bồi thường:</span> <strong className="text-emerald-600">{dispute.acceptedAmount ? Number(dispute.acceptedAmount).toLocaleString('vi-VN') + ' đ' : '0 đ (Từ chối)'}</strong></p>
                            </div>

                            <div className="text-xs">
                                <span className="text-slate-500">Giải trình của tiệm:</span>
                                <div className="bg-white p-2.5 rounded-lg border border-indigo-100 mt-1 text-slate-800 whitespace-pre-wrap min-h-[50px]">
                                    {dispute.shopResponseNote || 'Tiệm chưa phản hồi hoặc chưa đưa ra lời giải trình'}
                                </div>
                            </div>

                            {dispute.shopEvidenceUrls && dispute.shopEvidenceUrls.length > 0 && (
                                <div>
                                    <span className="text-[11px] text-slate-500 block mb-1">Ảnh đối chứng tiệm:</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {dispute.shopEvidenceUrls.map((url, i) => (
                                            <img 
                                                key={i} 
                                                src={url} 
                                                alt="Đối chứng shop" 
                                                onClick={() => setPreviewImage(url)} 
                                                className="w-14 h-14 object-cover rounded-lg border border-indigo-200 cursor-pointer hover:opacity-80"
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Past Resolution if already resolved */}
                    {!canResolve && (
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                            <h4 className="text-xs font-bold text-slate-700 uppercase">Phán Quyết Đã Lưu</h4>
                            <p className="text-xs text-slate-800">
                                <strong>Kết quả:</strong> {dispute.status === 'RESOLVED_REFUNDED' ? 'Chấp thuận hoàn tiền cho khách' : 'Bác bỏ khiếu nại'}
                            </p>
                            {dispute.status === 'RESOLVED_REFUNDED' && (
                                <p className="text-xs">
                                    <span className="text-slate-500">Hình thức bồi thường:</span>{' '}
                                    {dispute.refundMethod === 'VOUCHER' ? (
                                        <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                                            🎟️ Voucher giảm giá: <code className="font-mono">{dispute.compensationVoucherCode}</code>
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                                            🏦 Chuyển khoản VietQR
                                        </span>
                                    )}
                                </p>
                            )}
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
                            <p className="text-xs text-slate-600 mt-1">
                                <strong>Ghi chú Admin:</strong> {dispute.adminDecisionNote || 'Không có ghi chú'}
                            </p>
                        </div>
                    )}

                    {/* Resolution Form for Admin */}
                    {canResolve && (
                        <form id="admin-dispute-form" onSubmit={handleResolve} className="space-y-4 pt-2 border-t border-slate-100">
                            <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                                Quyết Định Của Quản Trị Viên (Admin Verdict)
                            </h4>

                            <div className="grid grid-cols-2 gap-3">
                                <label 
                                    className={`p-3.5 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${
                                        decision === 'REFUND' 
                                            ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-200' 
                                            : 'border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <input 
                                        type="radio" 
                                        name="adminDecision" 
                                        value="REFUND" 
                                        checked={decision === 'REFUND'} 
                                        onChange={() => setDecision('REFUND')} 
                                        className="text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-slate-900 block">Duyệt bồi thường cho Khách</span>
                                        <span className="text-[11px] text-slate-500">Khách hàng được hoàn {Number(dispute.requestedAmount || 0).toLocaleString('vi-VN')} đ</span>
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
                                        name="adminDecision" 
                                        value="REJECT" 
                                        checked={decision === 'REJECT'} 
                                        onChange={() => setDecision('REJECT')} 
                                        className="text-rose-600 focus:ring-rose-500"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-slate-900 block">Bác bỏ khiếu nại</span>
                                        <span className="text-[11px] text-slate-500">Giữ nguyên doanh thu cho Shop</span>
                                    </div>
                                </label>
                            </div>

                            {/* Options when Decision is REFUND */}
                            {decision === 'REFUND' && (
                                <div className="space-y-3 animate-fade-in">
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
                                                    <span className="text-lg">🏦</span>
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
                                                    <span className="text-lg">🎟️</span>
                                                    <div>
                                                        <h5 className="text-xs font-bold text-slate-900">Phương án 2: Bồi hoàn bằng Voucher</h5>
                                                        <p className="text-[10px] text-slate-500 mt-0.5">Tự động cấp voucher cho lần giặt sau</p>
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
                                                    Số tiền: {dispute.requestedAmount ? Number(dispute.requestedAmount).toLocaleString('vi-VN') + ' đ' : '0 đ'}
                                                </span>
                                            </div>

                                            {dispute.bankAccountNumber ? (
                                                <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-3.5 rounded-xl border border-blue-100 shadow-sm">
                                                    {/* QR Image */}
                                                    <div className="flex flex-col items-center">
                                                        <img 
                                                            src={`https://img.vietqr.io/image/${getVietQrCode(dispute.bankName)}-${dispute.bankAccountNumber}-compact2.png?amount=${dispute.requestedAmount || 0}&addInfo=${encodeURIComponent('DEN BU DON ' + dispute.orderId)}&accountName=${encodeURIComponent(dispute.bankAccountName || '')}`} 
                                                            alt="VietQR Chuyển khoản"
                                                            className="w-36 h-36 object-contain rounded-lg border border-slate-200 shadow-xs cursor-pointer hover:scale-105 transition-transform"
                                                            onClick={() => setPreviewImage(`https://img.vietqr.io/image/${getVietQrCode(dispute.bankName)}-${dispute.bankAccountNumber}-compact2.png?amount=${dispute.requestedAmount || 0}&addInfo=${encodeURIComponent('DEN BU DON ' + dispute.orderId)}&accountName=${encodeURIComponent(dispute.bankAccountName || '')}`)}
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
                                                    ⚠️ Khách hàng chưa cung cấp STK trong đơn khiếu nại. Admin có thể chọn <strong>Phương án 2 (Bồi hoàn bằng Voucher)</strong> cho khách.
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
                                                            <span className="text-[10px] text-emerald-600">Ảnh sẽ được lưu và hiển thị cho khách khi phán quyết</span>
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
                                                <span className="text-xl">🎁</span>
                                                <h5 className="text-xs font-black text-amber-900 uppercase">
                                                    Phán quyết cấp Voucher đền bù (Khấu trừ tiệm)
                                                </h5>
                                            </div>
                                            <p className="text-xs text-amber-800 leading-relaxed">
                                                Admin phê duyệt cấp một mã Voucher trị giá <strong className="text-rose-600 font-bold">{dispute.requestedAmount ? Number(dispute.requestedAmount).toLocaleString('vi-VN') + ' đ' : '0 đ'}</strong> (mã <code>ADMIN-REFUND-{dispute.orderId}-XXXX</code>) vào ví của khách hàng.
                                            </p>
                                            <div className="p-2.5 bg-white/80 rounded-lg border border-amber-200 text-[11px] text-amber-900 space-y-1.5">
                                                <p className="font-semibold text-amber-950">📌 Trách nhiệm chi phí:</p>
                                                <p>• Mã chỉ áp dụng tại chính tiệm giặt gây ra lỗi trong 90 ngày. Chi phí này <strong>do tiệm chịu và được khấu trừ vào doanh thu</strong> của tiệm ở đơn tiếp theo của khách.</p>
                                                <p>• Phương án này áp dụng khi hai bên đồng thuận bù đắp dịch vụ hoặc shop không thể chuyển khoản kịp thời.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Căn cứ phán quyết (Ghi chú bắt buộc) <span className="text-rose-500">*</span>
                                </label>
                                <textarea 
                                    rows="3"
                                    required
                                    value={adminDecisionNote}
                                    onChange={(e) => setAdminDecisionNote(e.target.value)}
                                    placeholder="Nêu rõ lý do đưa ra quyết định dựa trên bằng chứng camera/ảnh của hai bên..."
                                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                />
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
                    {canResolve && (
                        <button
                            type="submit"
                            form="admin-dispute-form"
                            disabled={loading}
                            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all disabled:opacity-50 flex items-center gap-2 ${
                                decision === 'REFUND' 
                                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' 
                                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                            }`}
                        >
                            {loading ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Đang phán quyết...</span>
                                </>
                            ) : decision === 'REFUND' ? (
                                'Chấp thuận hoàn tiền cho Khách'
                            ) : (
                                'Xác nhận bác bỏ khiếu nại'
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

export default AdminDisputeModal;
