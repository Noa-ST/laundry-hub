import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const GoogleLoginButton = ({ onSuccess, onError, text = "Đăng nhập bằng Google" }) => {
    const { loginWithGoogle } = useAuth();
    const [loading, setLoading] = useState(false);
    const googleButtonRef = useRef(null);
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    useEffect(() => {
        if (!googleClientId) return;

        const initializeGoogleSignIn = () => {
            if (window.google?.accounts?.id) {
                try {
                    window.google.accounts.id.initialize({
                        client_id: googleClientId,
                        callback: handleGoogleCredentialResponse,
                        auto_select: false,
                        cancel_on_tap_outside: true,
                    });

                    if (googleButtonRef.current) {
                        window.google.accounts.id.renderButton(googleButtonRef.current, {
                            theme: 'outline',
                            size: 'large',
                            width: '100%',
                            text: 'continue_with',
                            shape: 'pill',
                            logo_alignment: 'left'
                        });
                    }
                } catch (err) {
                    console.error("Lỗi khởi tạo Google GIS:", err);
                }
            }
        };

        if (window.google?.accounts?.id) {
            initializeGoogleSignIn();
        } else {
            const timer = setTimeout(initializeGoogleSignIn, 800);
            return () => clearTimeout(timer);
        }
    }, [googleClientId]);

    const handleGoogleCredentialResponse = async (response) => {
        if (!response?.credential) {
            toast.error("Không nhận được token xác thực từ Google.");
            return;
        }

        setLoading(true);
        const res = await loginWithGoogle(response.credential);
        setLoading(false);

        if (res.success) {
            toast.success("Đăng nhập Google thành công!");
            if (onSuccess) onSuccess();
        } else {
            toast.error(res.message || "Đăng nhập Google thất bại.");
            if (onError) onError(res.message);
        }
    };

    const handleManualClick = () => {
        if (googleClientId && window.google?.accounts?.id) {
            window.google.accounts.id.prompt();
            return;
        }

        // Nếu chưa cấu hình VITE_GOOGLE_CLIENT_ID trong môi trường
        toast((t) => (
            <div className="text-xs">
                <p className="font-bold text-slate-900 mb-1">Cấu hình Google OAuth:</p>
                <p className="text-slate-600 mb-2">
                    Vui lòng thêm biến môi trường <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono">VITE_GOOGLE_CLIENT_ID</code> vào file .env trên frontend và <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono">GOOGLE_CLIENT_ID</code> trên backend.
                </p>
                <button
                    onClick={() => toast.dismiss(t.id)}
                    className="bg-indigo-600 text-white font-bold px-3 py-1 rounded-md text-[11px]"
                >
                    Đã hiểu
                </button>
            </div>
        ), { duration: 6000 });
    };

    return (
        <div className="w-full">
            {googleClientId ? (
                <div ref={googleButtonRef} className="w-full flex justify-center min-h-[44px]" />
            ) : (
                <button
                    type="button"
                    disabled={loading}
                    onClick={handleManualClick}
                    className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-all shadow-sm hover:border-slate-300 disabled:opacity-50"
                >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>{loading ? 'Đang xác thực Google...' : text}</span>
                </button>
            )}
        </div>
    );
};

export default GoogleLoginButton;
