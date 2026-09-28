import React, { useState } from 'react';
import { useMockUser } from '../context/MockUserContext';

const getRoleBadgeColor = (role) => {
    switch (role) {
        case 'CUSTOMER': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'SHOP_OWNER': return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'ADMIN': return 'bg-purple-100 text-purple-800 border-purple-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
};

const UserSwitcher = () => {
    const { users, currentUser, switchUser, loading } = useMockUser();
    const [isOpen, setIsOpen] = useState(false);

    if (loading || !currentUser) return null;

    return (
        <div className="fixed top-4 right-4 z-50">
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center space-x-3 bg-white border border-gray-200 p-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
                >
                    <img 
                        src={currentUser.avatarUrl} 
                        alt="Avatar" 
                        className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 object-cover"
                    />
                    <div className="text-left hidden md:block pr-4">
                        <p className="text-sm font-semibold text-gray-800 leading-tight">{currentUser.fullName}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getRoleBadgeColor(currentUser.role)} font-bold inline-block mt-0.5`}>
                            {currentUser.role}
                        </span>
                    </div>
                    <svg className={`w-5 h-5 text-gray-500 mr-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>

                {isOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden transform origin-top-right transition-all duration-200 ease-out">
                        <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Chuyển tài khoản (Mock)</p>
                        </div>
                        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
                            {users.map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => {
                                        switchUser(user.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors duration-150 ${currentUser.id === user.id ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-gray-50 border border-transparent'}`}
                                >
                                    <img src={user.avatarUrl} alt={user.fullName} className="w-12 h-12 rounded-full border border-gray-200 bg-white object-cover" />
                                    <div className="text-left flex-1">
                                        <p className="text-sm font-semibold text-gray-900">{user.fullName}</p>
                                        <span className={`text-[10px] px-2 py-0.5 rounded border ${getRoleBadgeColor(user.role)} mt-1 inline-block font-medium`}>
                                            {user.role}
                                        </span>
                                    </div>
                                    {currentUser.id === user.id && (
                                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                        </svg>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserSwitcher;
