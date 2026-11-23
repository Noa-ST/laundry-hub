import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import GoogleLoginButton from './GoogleLoginButton';
import toast from 'react-hot-toast';

const EyeIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
);

const EyeSlashIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
);

const CheckIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
);

const AuthModal = ({ isOpen, onClose, defaultTab = 'login' }) => {
    const { login, register, forgotPassword } = useAuth();
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Login Form State
    const [loginPhone, setLoginPhone] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Register Form State
    const [regFullName, setRegFullName] = useState('');
    const [regPhone, setRegPhone] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regRole, setRegRole] = useState('CUSTOMER');

    // Forgot Password State
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotSuccess, setForgotSuccess] = useState(false);

    useEffect(() => {
        setActiveTab(defaultTab);
        resetStates();
    }, [defaultTab, isOpen]);

    if (!isOpen) return null;

    const resetStates = () => {
        setError('');
        setSuccess('');
        setShowPassword(false);
        setForgotSuccess(false);
        setForgotEmail('');
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        resetStates();
        
        if (!loginPhone || !loginPassword) {
            setError('Vui lòng nhập đầy đủ số điện thoại và mật khẩu.');
            return;
        }

        setLoading(true);
        const res = await login(loginPhone, loginPassword);
        setLoading(false);

        if (res.success) {
            setSuccess('Đăng nhập thành công!');
            setTimeout(() => {
                onClose();
            }, 800);
        } else {
            setError(res.message);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!regFullName || !regPhone || !regPassword) {
            setError('Vui lòng nhập đầy đủ thông tin bắt buộc.');
            return;
        }
        if (regPassword.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự.');
            return;
        }

        setLoading(true);
        const res = await register({
            fullName: regFullName,
            phone: regPhone,
            email: regEmail ? regEmail.trim() : null,
            password: regPassword,
            role: regRole
        });
        setLoading(false);

        if (res.success) {
            setSuccess('Đăng ký tài khoản thành công!');
            setTimeout(() => {
                onClose();
            }, 800);
        } else {
            setError(res.message);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setError('');

        if (!forgotEmail || !forgotEmail.includes('@')) {
            setError('Vui lòng nhập địa chỉ email hợp lệ.');
            return;
        }

        setLoading(true);
        const res = await forgotPassword(forgotEmail.trim());
        setLoading(false);

        if (res.success) {
            setForgotSuccess(true);
            toast.success('Yêu cầu đặt lại mật khẩu đã được gửi!');
        } else {
            setError(res.message);
        }
    };

    const toggleTab = (tab) => {
        setActiveTab(tab);
        resetStates();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="rounded-3xl bg-white shadow-2xl border border-slate-200/80 max-w-md w-full p-8 relative overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar">
                
                <button 
                    onClick={onClose}
                    className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                        {activeTab === 'login' 
                            ? 'Chào mừng trở lại' 
                            : activeTab === 'register' 
                                ? 'Bắt đầu với LaundryHub' 
                                : 'Khôi phục Mật Khẩu'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                        {activeTab === 'login' 
                            ? 'Đăng nhập để đặt lịch giặt hoặc quản lý tiệm của bạn.' 
                            : activeTab === 'register'
                                ? 'Tạo tài khoản mới để trải nghiệm dịch vụ tiện lợi.'
                                : 'Nhập email để nhận liên kết đặt lại mật khẩu trong 15 phút.'}
                    </p>
                </div>

                {/* Navigation Toggle between Login & Register */}
                {activeTab !== 'forgot_password' && (
                    <div className="bg-slate-100 p-1 rounded-xl grid grid-cols-2 text-xs font-semibold text-slate-600 mb-6 relative">
                        <button
                            type="button"
                            className={`py-2 rounded-lg transition-all ${activeTab === 'login' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'hover:text-slate-900'}`}
                            onClick={() => toggleTab('login')}
                        >
                            Đăng nhập
                        </button>
                        <button
                            type="button"
                            className={`py-2 rounded-lg transition-all ${activeTab === 'register' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'hover:text-slate-900'}`}
                            onClick={() => toggleTab('register')}
                        >
                            Đăng ký
                        </button>
                    </div>
                )}

                {/* Status Messages */}
                {error && (
                    <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-100 flex items-center gap-2">
                        <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                        <span>{error}</span>
                    </div>
                )}
                
                {success && (
                    <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-100 flex items-center gap-2">
                        <CheckIcon className="w-4 h-4 shrink-0 text-emerald-600" />
                        <span>{success}</span>
                    </div>
                )}

                {/* ----------------- TAB: LOGIN ----------------- */}
                {activeTab === 'login' && (
                    <div className="space-y-4">
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Số điện thoại</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.896-1.596-5.48-4.18-7.077-7.077l1.293-.97c.362-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="tel"
                                        value={loginPhone}
                                        onChange={(e) => setLoginPhone(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all placeholder:text-slate-300"
                                        placeholder="0912 345 678"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Mật khẩu</label>
                                    <button 
                                        type="button" 
                                        onClick={() => toggleTab('forgot_password')}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                                    >
                                        Quên mật khẩu?
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all placeholder:text-slate-300"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                                    >
                                        {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-sm text-sm transition-all disabled:opacity-70 flex justify-center items-center"
                            >
                                {loading ? (
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : 'Đăng nhập'}
                            </button>
                        </form>

                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-slate-200"></div>
                            <span className="flex-shrink mx-4 text-xs text-slate-400 uppercase font-semibold">Hoặc</span>
                            <div className="flex-grow border-t border-slate-200"></div>
                        </div>

                        <GoogleLoginButton onSuccess={onClose} text="Đăng nhập bằng Google" />
                    </div>
                )}

                {/* ----------------- TAB: REGISTER ----------------- */}
                {activeTab === 'register' && (
                    <div className="space-y-4">
                        <form onSubmit={handleRegister} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Họ và tên</label>
                                <input
                                    type="text"
                                    value={regFullName}
                                    onChange={(e) => setRegFullName(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all placeholder:text-slate-300"
                                    placeholder="Nguyễn Văn A"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Số điện thoại</label>
                                <input
                                    type="tel"
                                    value={regPhone}
                                    onChange={(e) => setRegPhone(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all placeholder:text-slate-300"
                                    placeholder="0912 345 678"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                                    Email <span className="text-slate-400 font-normal lowercase">(tùy chọn - để nhận hóa đơn)</span>
                                </label>
                                <input
                                    type="email"
                                    value={regEmail}
                                    onChange={(e) => setRegEmail(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all placeholder:text-slate-300"
                                    placeholder="email@example.com"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Mật khẩu</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={regPassword}
                                        onChange={(e) => setRegPassword(e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all placeholder:text-slate-300"
                                        placeholder="Tối thiểu 6 ký tự"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                                    >
                                        {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="pt-1">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Bạn là ai?</label>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div 
                                        className={`relative cursor-pointer rounded-xl p-3 transition-all border ${regRole === 'CUSTOMER' ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
                                        onClick={() => setRegRole('CUSTOMER')}
                                    >
                                        {regRole === 'CUSTOMER' && (
                                            <div className="absolute top-2 right-2 text-slate-900">
                                                <CheckIcon className="w-3.5 h-3.5" />
                                            </div>
                                        )}
                                        <div className={`font-semibold text-xs ${regRole === 'CUSTOMER' ? 'text-slate-900' : 'text-slate-700'}`}>Khách hàng</div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">Đặt dịch vụ giặt sấy</div>
                                    </div>
                                    <div 
                                        className={`relative cursor-pointer rounded-xl p-3 transition-all border ${regRole === 'SHOP_OWNER' ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
                                        onClick={() => setRegRole('SHOP_OWNER')}
                                    >
                                        {regRole === 'SHOP_OWNER' && (
                                            <div className="absolute top-2 right-2 text-slate-900">
                                                <CheckIcon className="w-3.5 h-3.5" />
                                            </div>
                                        )}
                                        <div className={`font-semibold text-xs ${regRole === 'SHOP_OWNER' ? 'text-slate-900' : 'text-slate-700'}`}>Chủ tiệm</div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">Mở tiệm & bán dịch vụ</div>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-sm text-sm transition-all disabled:opacity-70 flex justify-center items-center"
                            >
                                {loading ? (
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : 'Tạo tài khoản'}
                            </button>
                        </form>

                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-slate-200"></div>
                            <span className="flex-shrink mx-4 text-xs text-slate-400 uppercase font-semibold">Hoặc</span>
                            <div className="flex-grow border-t border-slate-200"></div>
                        </div>

                        <GoogleLoginButton onSuccess={onClose} text="Đăng ký nhanh bằng Google" />
                    </div>
                )}

                {/* ----------------- TAB: FORGOT PASSWORD ----------------- */}
                {activeTab === 'forgot_password' && (
                    <div className="space-y-4">
                        {forgotSuccess ? (
                            <div className="text-center py-4 space-y-3 animate-fade-in">
                                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                                    <CheckIcon className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-slate-900 text-base">Đã gửi yêu cầu đặt lại mật khẩu!</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Nếu địa chỉ email <strong className="text-slate-800">{forgotEmail}</strong> tồn tại trên hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra hòm thư chính và thư mục Spam.
                                </p>
                                <button
                                    onClick={() => toggleTab('login')}
                                    className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
                                >
                                    Quay lại Đăng nhập
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleForgotPassword} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                                        Email tài khoản
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                            </svg>
                                        </div>
                                        <input
                                            type="email"
                                            value={forgotEmail}
                                            onChange={(e) => setForgotEmail(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all placeholder:text-slate-300"
                                            placeholder="email@example.com"
                                            required
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Hệ thống sẽ gửi link đổi mật khẩu có hiệu lực trong 15 phút.
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-sm text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading && (
                                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    )}
                                    <span>Gửi liên kết khôi phục</span>
                                </button>

                                <div className="text-center pt-2">
                                    <button
                                        type="button"
                                        onClick={() => toggleTab('login')}
                                        className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                                    >
                                        ← Quay lại Đăng nhập
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}

                {/* Footer Switcher */}
                {activeTab !== 'forgot_password' && (
                    <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                        {activeTab === 'login' ? (
                            <p className="text-xs text-slate-500">
                                Chưa có tài khoản?{' '}
                                <button onClick={() => toggleTab('register')} className="font-bold text-slate-900 underline underline-offset-4 hover:text-indigo-600">
                                    Đăng ký ngay
                                </button>
                            </p>
                        ) : (
                            <p className="text-xs text-slate-500">
                                Đã có tài khoản?{' '}
                                <button onClick={() => toggleTab('login')} className="font-bold text-slate-900 underline underline-offset-4 hover:text-indigo-600">
                                    Đăng nhập
                                </button>
                            </p>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};

export default AuthModal;