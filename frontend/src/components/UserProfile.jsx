import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AddressBookModal from './AddressBookModal';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';
import InitialsAvatar from './InitialsAvatar';

const ROLE_LABELS = {
    CUSTOMER: 'Khách hàng',
    SHOP_OWNER: 'Chủ tiệm',
    ADMIN: 'Quản trị viên',
};

function UserProfile() {
    const { currentUser, logout, loadUser } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Vui lòng chọn tệp tin hình ảnh hợp lệ');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Kích thước ảnh không được vượt quá 5MB');
            return;
        }

        try {
            const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
            const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', uploadPreset);
            
            const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await uploadRes.json();
            
            if (data.secure_url) {
                await axiosClient.put('/auth/me/avatar', { avatarUrl: data.secure_url });
                await loadUser();
            }
        } catch (error) {
            console.error('Error uploading avatar:', error);
            toast.error('Không thể tải lên ảnh đại diện');
        }
    };

    if (!currentUser) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-3 bg-white hover:bg-gray-50 border border-gray-200 p-1.5 pr-4 rounded-full shadow-sm"
            >
                <InitialsAvatar name={currentUser.fullName} src={currentUser.avatarUrl} size="md" />
                <div className="text-left hidden sm:block max-w-[120px] md:max-w-[150px]">
                    <p className="text-sm font-semibold text-gray-800 leading-tight truncate">{currentUser.fullName}</p>
                    <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider truncate">{ROLE_LABELS[currentUser.role] || currentUser.role}</p>
                </div>
                <svg className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden py-1">
                    <div className="px-4 py-4 border-b border-gray-50 bg-gray-50/50 flex flex-col items-center justify-center">
                        <div className="relative group mb-3">
                            <InitialsAvatar
                                name={currentUser.fullName}
                                src={currentUser.avatarUrl}
                                size="xl"
                                className="border-2 border-white shadow-sm"
                            />
                            <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                            </label>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{currentUser.fullName}</p>
                        <p className="text-xs text-gray-500 truncate">{currentUser.phone}</p>
                    </div>
                    <div className="p-1">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                setIsAddressModalOpen(true);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 font-medium rounded-lg hover:bg-gray-100 flex items-center space-x-2"
                        >
                            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            <span>Sổ địa chỉ</span>
                        </button>
                        <button
                            onClick={logout}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 font-medium rounded-lg hover:bg-red-50 flex items-center space-x-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span>Đăng xuất</span>
                        </button>
                    </div>
                </div>
            )}

            <AddressBookModal 
                isOpen={isAddressModalOpen} 
                onClose={() => setIsAddressModalOpen(false)} 
            />
        </div>
    );
}

export default UserProfile;