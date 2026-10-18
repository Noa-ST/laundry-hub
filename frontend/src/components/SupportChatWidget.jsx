import React, { useState, useEffect, useRef } from 'react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import toast from 'react-hot-toast';

const SupportChatWidget = () => {
    const { currentUser, isAuthenticated } = useAuth();
    const { stompClient, connected } = useWebSocket();
    
    const [isOpen, setIsOpen] = useState(false);
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const messagesContainerRef = useRef(null);


    const scrollToBottom = () => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    };

    // Fetch conversation on mount or auth change
    useEffect(() => {
        if (!isAuthenticated || currentUser?.role === 'ADMIN') {
            setConversation(null);
            setMessages([]);
            setUnreadCount(0);
            return;
        }

        const fetchConversation = async () => {
            try {
                const res = await axiosClient.get('/support/my-conversation');
                if (res?.success && res.data) {
                    setConversation(res.data);
                    setUnreadCount(res.data.unreadUserCount || 0);
                }
            } catch (err) {
                console.error("Lỗi lấy thông tin hội thoại CSKH:", err);
            }
        };

        fetchConversation();
    }, [isAuthenticated, currentUser]);

    // Fetch messages when widget is opened
    useEffect(() => {
        if (!isOpen || !isAuthenticated || currentUser?.role === 'ADMIN') return;

        const fetchMessages = async () => {
            setLoading(true);
            try {
                const res = await axiosClient.get('/support/my-conversation/messages');
                if (res?.success && res.data) {
                    setMessages(res.data);
                    setUnreadCount(0);
                }
            } catch (err) {
                console.error("Lỗi lấy tin nhắn CSKH:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();
    }, [isOpen, isAuthenticated]);

    // WebSocket subscription for realtime updates
    useEffect(() => {
        if (!connected || !stompClient || !isAuthenticated || currentUser?.role === 'ADMIN') return;

        let convSub = null;
        let userSub = null;

        if (conversation?.id) {
            convSub = stompClient.subscribe(`/topic/support/${conversation.id}`, (msg) => {
                if (msg.body) {
                    const data = JSON.parse(msg.body);
                    // If it's a message
                    if (data.content && data.senderRole) {
                        setMessages(prev => {
                            if (prev.some(m => m.id === data.id)) return prev;
                            return [...prev, data];
                        });
                        if (!isOpen && data.senderRole === 'ADMIN') {
                            setUnreadCount(prev => prev + 1);
                            toast("Có phản hồi mới từ CSKH LaundryHub!");
                        }
                    } else if (data.status) {
                        // Conversation status update
                        setConversation(prev => ({ ...prev, status: data.status }));
                    }
                }
            });
        }

        // Also subscribe to personal notification channel
        if (currentUser?.id) {
            userSub = stompClient.subscribe(`/topic/user/${currentUser.id}/support`, (msg) => {
                if (msg.body) {
                    const data = JSON.parse(msg.body);
                    setMessages(prev => {
                        if (prev.some(m => m.id === data.id)) return prev;
                        return [...prev, data];
                    });
                    if (!isOpen) {
                        setUnreadCount(prev => prev + 1);
                    }
                }
            });
        }

        return () => {
            if (convSub) convSub.unsubscribe();
            if (userSub) userSub.unsubscribe();
        };
    }, [connected, stompClient, conversation?.id, currentUser?.id, isOpen, isAuthenticated]);

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputText.trim() || sending) return;

        const content = inputText.trim();
        setInputText('');
        setSending(true);

        try {
            const res = await axiosClient.post('/support/my-conversation/messages', { content });
            if (res?.success && res.data) {
                setMessages(prev => {
                    if (prev.some(m => m.id === res.data.id)) return prev;
                    return [...prev, res.data];
                });
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Không thể gửi tin nhắn hỗ trợ");
        } finally {
            setSending(false);
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    // Don't show floating widget for Admin users (Admin has AdminSupportTab)
    if (isAuthenticated && currentUser?.role === 'ADMIN') {
        return null;
    }

    return (
        <>
            {/* Floating Action Button */}
            <div className="fixed bottom-6 right-6 z-[9980] flex flex-col items-end">
                {/* Unread badge tooltip when closed */}
                {!isOpen && unreadCount > 0 && (
                    <div className="mb-2 bg-rose-600 text-white text-xs font-bold py-1 px-3 rounded-full shadow-lg animate-bounce flex items-center gap-1.5 border border-white">
                        <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                        <span>{unreadCount} tin nhắn CSKH mới</span>
                    </div>
                )}

                <button
                    onClick={() => {
                        if (!isAuthenticated) {
                            window.dispatchEvent(new Event('auth:required'));
                        } else {
                            setIsOpen(!isOpen);
                        }
                    }}
                    className={`relative w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer ${
                        isOpen 
                            ? 'bg-slate-800 hover:bg-slate-900 rotate-90' 
                            : 'bg-gradient-to-tr from-teal-600 via-teal-500 to-emerald-500 hover:shadow-teal-500/40'
                    }`}
                    title="Liên hệ CSKH LaundryHub 24/7"
                >
                    {isOpen ? (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <>
                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                                    {unreadCount}
                                </span>
                            )}
                        </>
                    )}
                </button>
            </div>

            {/* Chat Box Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-4 sm:right-6 w-[360px] sm:w-[390px] h-[530px] max-h-[82vh] bg-white rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col z-[9985] overflow-hidden animate-slide-up">
                    
                    {/* Header */}
                    <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 text-white p-4 flex items-center justify-between shadow-md shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white font-bold text-lg">
                                    
                                </div>
                                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white"></span>
                            </div>
                            <div>
                                <h3 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
                                    CSKH LaundryHub
                                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-medium">Online</span>
                                </h3>
                                <p className="text-[11px] text-teal-100 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>
                                    Sẵn sàng hỗ trợ Khách & Chủ tiệm
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>

                    {/* Messages Body */}
                    <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/70">
                        {/* Welcome message */}
                        <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs shrink-0 font-bold shadow-sm">
                                LH
                            </div>
                            <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-none p-3 shadow-sm text-xs text-slate-700 max-w-[85%] leading-relaxed">
                                <p className="font-semibold text-teal-800 mb-1">Chào bạn{currentUser?.fullName ? ` ${currentUser.fullName}` : ''}!</p>
                                <p>Đội ngũ Hỗ trợ CSKH LaundryHub có thể giúp gì cho bạn hôm nay? Hãy gửi thắc mắc về đơn hàng, tài khoản, đối soát hay khiếu nại tại đây nhé!</p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-6">
                                <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            messages.map((msg) => {
                                const isMe = msg.senderId === currentUser?.id;
                                const isAdmin = msg.senderRole === 'ADMIN';

                                return (
                                    <div 
                                        key={msg.id} 
                                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                                    >
                                        <div className="flex items-end gap-1.5 max-w-[85%]">
                                            {!isMe && (
                                                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0 mb-1">
                                                    AD
                                                </div>
                                            )}
                                            <div 
                                                className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                                                    isMe 
                                                        ? 'bg-teal-600 text-white rounded-tr-none' 
                                                        : isAdmin 
                                                            ? 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-none'
                                                            : 'bg-slate-200 text-slate-800 rounded-tl-none'
                                                }`}
                                            >
                                                {!isMe && isAdmin && (
                                                    <span className="block text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider mb-0.5">
                                                        CSKH Admin
                                                    </span>
                                                )}
                                                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1 px-1">
                                            {formatTime(msg.createdAt)}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Quick Suggestions */}
                    <div className="px-3 py-1.5 bg-slate-100/70 border-t border-slate-200/50 flex gap-1.5 overflow-x-auto scrollbar-hide shrink-0">
                        {[
                            'Kiểm tra đơn hàng',
                            'Vấn đề hoàn tiền / ví',
                            'Khiếu nại tiệm giặt',
                            'Cần hỗ trợ gấp'
                        ].map((suggestion, idx) => (
                            <button
                                key={idx}
                                onClick={() => setInputText(suggestion)}
                                className="whitespace-nowrap bg-white hover:bg-teal-50 hover:text-teal-700 text-slate-600 text-[11px] font-medium px-2.5 py-1 rounded-full border border-slate-200/80 transition-colors shrink-0"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>

                    {/* Input Footer */}
                    <form 
                        onSubmit={handleSendMessage}
                        className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0"
                    >
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Nhập tin nhắn hỗ trợ..."
                            className="flex-1 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim() || sending}
                            className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white p-2.5 rounded-xl shadow-sm transition-all shrink-0 cursor-pointer"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </form>
                </div>
            )}
        </>
    );
};

export default SupportChatWidget;
