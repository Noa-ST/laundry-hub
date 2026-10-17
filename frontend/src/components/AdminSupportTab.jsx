import React, { useState, useEffect, useRef } from 'react';
import axiosClient from '../api/axiosClient';
import { useWebSocket } from '../context/WebSocketContext';
import toast from 'react-hot-toast';

const SUPPORT_STATUS_MAP = {
    OPEN: { label: 'Đang mở', icon: '🟢', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    IN_PROGRESS: { label: 'Đang xử lý', icon: '🟡', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
    RESOLVED: { label: 'Đã giải quyết', icon: '✅', badgeClass: 'bg-teal-50 text-teal-700 border-teal-200' },
    CLOSED: { label: 'Đã đóng', icon: '⚪', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' }
};

const AdminSupportTab = () => {
    const { stompClient, connected } = useWebSocket();

    const [conversations, setConversations] = useState([]);
    const [selectedConv, setSelectedConv] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loadingConvs, setLoadingConvs] = useState(true);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [sending, setSending] = useState(false);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    const messagesContainerRef = useRef(null);

    const scrollToBottom = () => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    };

    // Fetch conversations list
    const fetchConversations = async () => {
        try {
            setLoadingConvs(true);
            const statusParam = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
            const res = await axiosClient.get(`/support/admin/conversations${statusParam}`);
            if (res?.success && res.data) {
                const list = res.data.content || res.data;
                setConversations(Array.isArray(list) ? list : []);
                
                // If currently selected conversation is in list, update it
                if (selectedConv) {
                    const updated = (Array.isArray(list) ? list : []).find(c => c.id === selectedConv.id);
                    if (updated) setSelectedConv(updated);
                }
            }
        } catch (err) {
            console.error("Lỗi lấy danh sách CSKH:", err);
            toast.error("Không thể tải danh sách hội thoại CSKH");
        } finally {
            setLoadingConvs(false);
        }
    };

    useEffect(() => {
        fetchConversations();
    }, [statusFilter]);

    // Fetch messages for selected conversation
    useEffect(() => {
        if (!selectedConv?.id) {
            setMessages([]);
            return;
        }

        const fetchMessages = async () => {
            setLoadingMsgs(true);
            try {
                const res = await axiosClient.get(`/support/admin/conversations/${selectedConv.id}/messages`);
                if (res?.success && res.data) {
                    setMessages(res.data);
                    // Update local unread count
                    setConversations(prev => prev.map(c => c.id === selectedConv.id ? { ...c, unreadAdminCount: 0 } : c));
                }
            } catch (err) {
                console.error("Lỗi lấy tin nhắn:", err);
            } finally {
                setLoadingMsgs(false);
            }
        };

        fetchMessages();
    }, [selectedConv?.id]);

    // WebSocket real-time subscription
    useEffect(() => {
        if (!connected || !stompClient) return;

        // 1. Subscribe to admin global support channel
        const adminSub = stompClient.subscribe('/topic/admin/support', (msg) => {
            if (msg.body) {
                const updatedConv = JSON.parse(msg.body);
                setConversations(prev => {
                    const idx = prev.findIndex(c => c.id === updatedConv.id);
                    if (idx >= 0) {
                        const copy = [...prev];
                        copy[idx] = updatedConv;
                        return copy.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
                    } else {
                        return [updatedConv, ...prev];
                    }
                });
            }
        });

        // 2. Subscribe to selected conversation messages
        let activeConvSub = null;
        if (selectedConv?.id) {
            activeConvSub = stompClient.subscribe(`/topic/support/${selectedConv.id}`, (msg) => {
                if (msg.body) {
                    const data = JSON.parse(msg.body);
                    if (data.content && data.senderRole) {
                        setMessages(prev => {
                            if (prev.some(m => m.id === data.id)) return prev;
                            return [...prev, data];
                        });
                    }
                }
            });
        }

        return () => {
            if (adminSub) adminSub.unsubscribe();
            if (activeConvSub) activeConvSub.unsubscribe();
        };
    }, [connected, stompClient, selectedConv?.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e) => {
        e?.preventDefault();
        if (!inputText.trim() || !selectedConv || sending) return;

        const content = inputText.trim();
        setInputText('');
        setSending(true);

        try {
            const res = await axiosClient.post(`/support/admin/conversations/${selectedConv.id}/messages`, { content });
            if (res?.success && res.data) {
                setMessages(prev => {
                    if (prev.some(m => m.id === res.data.id)) return prev;
                    return [...prev, res.data];
                });
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Lỗi gửi tin nhắn phản hồi");
        } finally {
            setSending(false);
        }
    };

    const handleUpdateStatus = async (newStatus) => {
        if (!selectedConv) return;
        try {
            const res = await axiosClient.patch(`/support/admin/conversations/${selectedConv.id}/status`, { status: newStatus });
            if (res?.success && res.data) {
                setSelectedConv(res.data);
                setConversations(prev => prev.map(c => c.id === selectedConv.id ? res.data : c));
                const label = SUPPORT_STATUS_MAP[newStatus]?.label || newStatus;
                toast.success(`Đã chuyển trạng thái: ${label}`);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Lỗi cập nhật trạng thái");
        }
    };

    const filteredConversations = conversations.filter(c => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
            (c.userName && c.userName.toLowerCase().includes(q)) ||
            (c.userPhone && c.userPhone.includes(q)) ||
            (c.userEmail && c.userEmail.toLowerCase().includes(q)) ||
            (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
        );
    });

    const formatDateTime = (dt) => {
        if (!dt) return '';
        const d = new Date(dt);
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString('vi-VN');
    };

    return (
        <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-64px)] bg-slate-100 overflow-hidden min-w-0">
            
            {/* Left Pane: Conversations List */}
            <div className={`w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col h-full shrink-0 ${selectedConv ? 'hidden md:flex' : 'flex'}`}>
                {/* Search & Header */}
                <div className="p-4 border-b border-slate-100 flex flex-col gap-3 shrink-0">
                    <div className="flex justify-between items-center">
                        <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                            <span>Hộp thư CSKH</span>
                            <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold border border-indigo-200">
                                {conversations.length}
                            </span>
                        </h3>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Tìm kiếm người dùng, SĐT..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                        />
                        <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    {/* Status filter tabs */}
                    <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                        {[
                            { id: 'ALL', label: 'Tất cả' },
                            { id: 'OPEN', label: 'Đang mở' },
                            { id: 'IN_PROGRESS', label: 'Đang xử lý' },
                            { id: 'RESOLVED', label: 'Đã giải quyết' }
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setStatusFilter(f.id)}
                                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                                    statusFilter === f.id
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Conversation Items */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {loadingConvs ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            <div className="text-3xl mb-2">💬</div>
                            Chưa có cuộc trò chuyện nào
                        </div>
                    ) : (
                        filteredConversations.map(conv => {
                            const isSelected = selectedConv?.id === conv.id;
                            const isShopOwner = conv.userRole === 'SHOP_OWNER';

                            return (
                                <div
                                    key={conv.id}
                                    onClick={() => setSelectedConv(conv)}
                                    className={`p-3.5 transition-all cursor-pointer flex items-start gap-3 border-l-4 ${
                                        isSelected 
                                            ? 'bg-indigo-50/70 border-indigo-600' 
                                            : conv.unreadAdminCount > 0 
                                                ? 'bg-amber-50/50 border-amber-500 hover:bg-slate-50' 
                                                : 'border-transparent hover:bg-slate-50'
                                    }`}
                                >
                                    {/* Avatar */}
                                    <div className="relative shrink-0">
                                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-sm ${
                                            isShopOwner ? 'bg-indigo-600' : 'bg-teal-600'
                                        }`}>
                                            {conv.userName ? conv.userName.substring(0, 2).toUpperCase() : 'KH'}
                                        </div>
                                        {conv.unreadAdminCount > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                                                {conv.unreadAdminCount}
                                            </span>
                                        )}
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <h4 className="font-bold text-slate-900 text-xs truncate" title={conv.userName}>
                                                {conv.userName}
                                            </h4>
                                            <span className="text-[10px] text-slate-400 shrink-0">
                                                {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                                isShopOwner ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'
                                            }`}>
                                                {isShopOwner ? 'Chủ tiệm' : 'Khách hàng'}
                                            </span>
                                            {conv.status && (
                                                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${SUPPORT_STATUS_MAP[conv.status]?.badgeClass || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                                    {SUPPORT_STATUS_MAP[conv.status]?.icon} {SUPPORT_STATUS_MAP[conv.status]?.label || conv.status}
                                                </span>
                                            )}
                                            {conv.userPhone && (
                                                <span className="text-[10px] text-slate-400 truncate">
                                                    {conv.userPhone}
                                                </span>
                                            )}
                                        </div>

                                        <p className={`text-xs truncate ${conv.unreadAdminCount > 0 ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
                                            {conv.lastMessage || 'Chưa có tin nhắn'}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Right Pane: Chat Window */}
            <div className={`flex-1 flex flex-col h-full bg-slate-50 min-w-0 overflow-hidden ${!selectedConv ? 'hidden md:flex' : 'flex'}`}>
                {selectedConv ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm">
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setSelectedConv(null)}
                                    className="md:hidden p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-sm ${
                                    selectedConv.userRole === 'SHOP_OWNER' ? 'bg-indigo-600' : 'bg-teal-600'
                                }`}>
                                    {selectedConv.userName ? selectedConv.userName.substring(0, 2).toUpperCase() : 'KH'}
                                </div>

                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-900 text-sm">{selectedConv.userName}</h3>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            selectedConv.userRole === 'SHOP_OWNER' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-teal-50 text-teal-700 border border-teal-200'
                                        }`}>
                                            {selectedConv.userRole === 'SHOP_OWNER' ? 'Chủ tiệm giặt' : 'Khách hàng'}
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 flex items-center gap-3">
                                        {selectedConv.userPhone && (
                                            <a href={`tel:${selectedConv.userPhone}`} className="hover:text-indigo-600 hover:underline">
                                                📞 {selectedConv.userPhone}
                                            </a>
                                        )}
                                        {selectedConv.userEmail && <span>✉️ {selectedConv.userEmail}</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Status Control */}
                            <div className="flex items-center gap-2">
                                <select
                                    value={selectedConv.status || 'OPEN'}
                                    onChange={(e) => handleUpdateStatus(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl outline-none cursor-pointer"
                                >
                                    <option value="OPEN">🟢 Đang mở</option>
                                    <option value="IN_PROGRESS">🟡 Đang xử lý</option>
                                    <option value="RESOLVED">✅ Đã giải quyết</option>
                                    <option value="CLOSED">⚪ Đã đóng</option>
                                </select>
                            </div>
                        </div>

                        {/* Messages Thread */}
                        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                            {loadingMsgs ? (
                                <div className="flex justify-center items-center py-12">
                                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 text-xs">
                                    Chưa có tin nhắn nào trong phiên này.
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    const isAdmin = msg.senderRole === 'ADMIN';

                                    return (
                                        <div 
                                            key={msg.id} 
                                            className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                                        >
                                            <div className="flex items-end gap-2 max-w-[80%] sm:max-w-[70%]">
                                                {!isAdmin && (
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 mb-1 ${
                                                        selectedConv.userRole === 'SHOP_OWNER' ? 'bg-indigo-600' : 'bg-teal-600'
                                                    }`}>
                                                        {msg.senderName ? msg.senderName.substring(0, 2).toUpperCase() : 'KH'}
                                                    </div>
                                                )}

                                                <div className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                                                    isAdmin 
                                                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                                                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                                                }`}>
                                                    <div className="flex items-center justify-between gap-3 mb-1">
                                                        <span className={`font-bold text-[10px] ${isAdmin ? 'text-indigo-200' : 'text-slate-500'}`}>
                                                            {isAdmin ? '🛡️ CSKH Admin' : msg.senderName}
                                                        </span>
                                                        <span className={`text-[10px] ${isAdmin ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                            {formatDateTime(msg.createdAt)}
                                                        </span>
                                                    </div>
                                                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Quick Responses */}
                        <div className="p-2 bg-slate-100/90 border-t border-slate-200/60 flex gap-2 overflow-x-auto scrollbar-hide shrink-0">
                            {[
                                'Chào bạn, LaundryHub đã tiếp nhận yêu cầu.',
                                'Đã kiểm tra và xử lý thành công cho bạn!',
                                'Vui lòng cung cấp thêm mã đơn hàng giúp mình nhé.',
                                'Cảm ơn bạn đã phản hồi tới CSKH LaundryHub.'
                            ].map((quick, i) => (
                                <button
                                    key={i}
                                    onClick={() => setInputText(quick)}
                                    className="whitespace-nowrap bg-white hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-[11px] font-medium px-3 py-1 rounded-full border border-slate-200 shadow-2xs transition-colors shrink-0"
                                >
                                    {quick}
                                </button>
                            ))}
                        </div>

                        {/* Input Footer */}
                        <form 
                            onSubmit={handleSendMessage}
                            className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center gap-3 shrink-0"
                        >
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder={`Nhập phản hồi cho ${selectedConv.userName}...`}
                                className="flex-1 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!inputText.trim() || sending}
                                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                                <span>Gửi</span>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                        <div className="w-16 h-16 rounded-2xl bg-slate-200/60 flex items-center justify-center text-3xl mb-3 shadow-inner">
                            🎧
                        </div>
                        <h4 className="font-bold text-slate-700 text-base mb-1">Kênh CSKH Trực Tuyến</h4>
                        <p className="text-xs max-w-sm text-slate-400">
                            Chọn một phiên hỗ trợ từ danh sách bên trái để xem tin nhắn và trực tiếp phản hồi cho Khách hàng hoặc Chủ tiệm.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminSupportTab;
