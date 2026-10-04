import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
    const { login } = useAuth();
    const [phone, setPhone] = useState('0862476195');
    const [password, setPassword] = useState('123456');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const res = await login(phone, password);
        if (!res.success) {
            setError(res.message);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white text-center">
                    <div className="inline-block p-3 bg-white/20 rounded-full mb-3 shadow-inner">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Laundry Hub</h1>
                    <p className="mt-2 text-blue-100 font-medium">Đăng nhập hệ thống</p>
                </div>
                
                <div className="p-8">
                    {error && (
                        <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg border border-red-100 text-sm font-medium">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                            <input 
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Nhập số điện thoại"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                            <input 
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Nhập mật khẩu"
                                required
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-70"
                        >
                            {loading ? 'Đang xử lý...' : 'Đăng Nhập'}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-3 font-medium uppercase text-center">Tài khoản trải nghiệm</p>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => {setPhone('0862476195'); setPassword('123456');}} type="button" className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-1 rounded font-medium">Khách</button>
                            <button onClick={() => {setPhone('0862476194'); setPassword('123456');}} type="button" className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-1 rounded font-medium">Chủ Tiệm</button>
                            <button onClick={() => {setPhone('0862476193'); setPassword('123456');}} type="button" className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-1 rounded font-medium">Admin</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;