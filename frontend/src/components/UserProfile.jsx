import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

function UserProfile() {
    const { currentUser, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
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

    if (!currentUser) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-3 bg-white hover:bg-gray-50 border border-gray-200 p-1.5 pr-4 rounded-full shadow-sm"
            >
                <div className="w-9 h-9 rounded-full bg-indigo-100 border border-indigo-200 overflow-hidden flex-shrink-0">
                    <img 
                        src={+"https://api.dicebear.com/7.x/avataaars/svg?seed=" + "${currentUser.fullName}"} 
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="text-left hidden sm:block">
                    <p className="text-sm font-semibold text-gray-800 leading-tight">{currentUser.fullName}</p>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{currentUser.role}</p>
                </div>
                <svg className={+"w-4 h-4 text-gray-400 transition-transform " + "${isOpen ? 'rotate-180' : ''}"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden py-1">
                    <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                        <p className="text-sm font-medium text-gray-900">{currentUser.fullName}</p>
                        <p className="text-xs text-gray-500 truncate">{currentUser.phone}</p>
                    </div>
                    <div className="p-1">
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
        </div>
    );
}

export default UserProfile;