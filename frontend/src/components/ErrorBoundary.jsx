import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center animate-fade-in">
                        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl mx-auto flex items-center justify-center text-3xl mb-4 shadow-inner">
                            ⚠️
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Đã có sự cố khi tải trang</h2>
                        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                            Hệ thống vừa gặp lỗi hiển thị tạm thời. Bạn vui lòng tải lại trang hoặc quay về trang chính.
                        </p>

                        {this.state.error && (
                            <div className="mb-6 p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs text-slate-600 font-mono overflow-x-auto max-h-32">
                                {this.state.error.toString()}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={this.handleReload}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl text-xs transition-all shadow-sm"
                            >
                                🔄 Tải lại trang
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-xl text-xs transition-all"
                            >
                                🏠 Trang chủ
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
