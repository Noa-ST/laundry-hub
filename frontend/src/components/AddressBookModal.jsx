import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import LocationPickerMap from './LocationPickerMap';
import toast from 'react-hot-toast';
import { handleGeolocationError, GEOLOCATION_OPTIONS } from '../utils/geoUtils';

const AddressBookModal = ({ isOpen, onClose, onSelectAddress }) => {
    const { currentUser } = useAuth();
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Form state
    const [isAdding, setIsAdding] = useState(false);
    const [editId, setEditId] = useState(null);
    const [label, setLabel] = useState('Nhà riêng');
    const [addressText, setAddressText] = useState('');
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');

    useEffect(() => {
        if (isOpen && currentUser) {
            fetchAddresses();
        }
    }, [isOpen, currentUser]);

    const fetchAddresses = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get('/addresses');
            if (res.success) {
                setAddresses(res.data);
            }
        } catch (err) {
            console.error("Lỗi lấy sổ địa chỉ:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleGetCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setLat(pos.coords.latitude.toFixed(6));
                    setLng(pos.coords.longitude.toFixed(6));
                },
                (err) => {
                    handleGeolocationError(err);
                },
                GEOLOCATION_OPTIONS
            );
        } else {
            alert("Trình duyệt của bạn không hỗ trợ định vị GPS.");
        }
    };

    const handleSaveAddress = async (e) => {
        e.preventDefault();
        try {
            if (!addressText || !addressText.trim()) {
                toast.error("Vui lòng nhập địa chỉ cụ thể");
                return;
            }
            const latitude = parseFloat(lat);
            const longitude = parseFloat(lng);
            if (isNaN(latitude) || isNaN(longitude) || (latitude === 0 && longitude === 0)) {
                toast.error("Vui lòng chọn vị trí trên bản đồ để xác định tọa độ GPS");
                return;
            }

            const payload = {
                label,
                address: addressText.trim(),
                latitude,
                longitude
            };
            
            let res;
            if (editId) {
                res = await axiosClient.put(`/addresses/${editId}`, payload);
            } else {
                res = await axiosClient.post('/addresses', payload);
            }
            
            if (res.success) {
                toast.success(editId ? "Cập nhật địa chỉ thành công!" : "Đã thêm địa chỉ mới!");
                setIsAdding(false);
                setEditId(null);
                setLabel('Nhà riêng');
                setAddressText('');
                setLat('');
                setLng('');
                fetchAddresses();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Lỗi khi lưu địa chỉ");
        }
    };

    const handleEdit = (addr) => {
        setEditId(addr.id);
        setLabel(addr.label);
        setAddressText(addr.address);
        setLat(addr.latitude);
        setLng(addr.longitude);
        setIsAdding(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Xóa địa chỉ này?")) return;
        try {
            await axiosClient.delete(`/addresses/${id}`);
            fetchAddresses();
        } catch (err) {
            toast.error("Lỗi khi xóa");
        }
    };

    const handleSetDefault = async (id) => {
        try {
            await axiosClient.patch(`/addresses/${id}/default`);
            fetchAddresses();
        } catch (err) {
            toast.error("Lỗi khi đặt mặc định");
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] overflow-hidden animate-slide-up">
                
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white z-20 shrink-0">
                    <h2 className="text-lg font-bold text-slate-900">Sổ Địa Chỉ</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-full hover:bg-slate-100">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                <div className="overflow-y-auto flex-1 p-4 bg-slate-50/50">
                    {isAdding ? (
                        <form onSubmit={handleSaveAddress} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                            <h3 className="font-bold text-sm text-slate-800">Thêm địa chỉ mới</h3>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Tên lưu nhớ (Label)</label>
                                <select value={label} onChange={e=>setLabel(e.target.value)} className="w-full border-slate-200 rounded-lg text-sm p-2 bg-slate-50 outline-none focus:border-teal-500">
                                    <option value="Nhà riêng">Nhà riêng</option>
                                    <option value="Công ty">Công ty</option>
                                    <option value="Khác">Khác</option>
                                </select>
                            </div>
                            <LocationPickerMap 
                                initialAddress={addressText}
                                initialLat={lat ? parseFloat(lat) : 0}
                                initialLng={lng ? parseFloat(lng) : 0}
                                onChange={({ address, latitude, longitude }) => {
                                    setAddressText(address);
                                    setLat(latitude);
                                    setLng(longitude);
                                }}
                            />
                            <div className="flex gap-2 pt-2 border-t border-slate-100">
                                <button type="button" onClick={()=>{setIsAdding(false); setEditId(null);}} className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button>
                                <button type="submit" className="flex-1 py-2 text-xs font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700">{editId ? 'Cập Nhật' : 'Lưu Địa Chỉ'}</button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-3">
                            <button onClick={() => setIsAdding(true)} className="w-full border-2 border-dashed border-teal-300 bg-teal-50/50 text-teal-700 py-3 rounded-xl text-sm font-semibold hover:bg-teal-50 flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                                Thêm địa chỉ mới
                            </button>

                            {loading ? (
                                <p className="text-center text-xs text-slate-500 py-4">Đang tải...</p>
                            ) : addresses.length === 0 ? (
                                <p className="text-center text-xs text-slate-500 py-4">Bạn chưa lưu địa chỉ nào.</p>
                            ) : (
                                addresses.map(addr => (
                                    <div key={addr.id} className={`bg-white border rounded-xl p-3 shadow-sm ${addr.isDefault ? 'border-teal-500 ring-1 ring-teal-500' : 'border-slate-200 hover:border-teal-300'} transition-all cursor-pointer`} onClick={() => onSelectAddress && onSelectAddress(addr)}>
                                        <div className="flex justify-between items-start mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${addr.label==='Nhà riêng' ? 'bg-blue-50 text-blue-700' : addr.label==='Công ty' ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                                                    {addr.label}
                                                </span>
                                                {addr.isDefault && <span className="text-[10px] font-bold text-teal-600">Mặc định</span>}
                                            </div>
                                            {!onSelectAddress && (
                                                <div className="flex gap-1">
                                                    {!addr.isDefault && <button onClick={(e) => { e.stopPropagation(); handleSetDefault(addr.id); }} className="text-[10px] text-teal-600 bg-teal-50 hover:bg-teal-100 px-1.5 py-0.5 rounded font-medium">Đặt Mặc định</button>}
                                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(addr); }} className="text-[10px] text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded font-medium">Sửa</button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(addr.id); }} className="text-[10px] text-rose-500 bg-rose-50 hover:bg-rose-100 px-1.5 py-0.5 rounded font-medium">Xóa</button>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-sm font-semibold text-slate-800 line-clamp-2">{addr.address}</p>
                                        <p className="text-[10px] text-slate-400 mt-1">GPS: {addr.latitude}, {addr.longitude}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AddressBookModal;
