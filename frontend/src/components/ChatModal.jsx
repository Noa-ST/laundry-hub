import React, { useState, useEffect, useRef } from 'react';
import axiosClient from '../api/axiosClient';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const ChatModal = ({ isOpen, onClose, orderId, orderCode, shopName, customerName }) => {
    const { currentUser } = useAuth();
    const { stompClient, connected } = useWebSocket();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const isCustomer = currentUser?.role === 'CUSTOMER';
    const chatTitle = isCustomer ? shopName : customerName;

    useEffect(() => {
        if (!isOpen || !orderId) return;

        const fetchMessages = async () => {
            setLoading(true);
            try {
                const res = await axiosClient.get(`/orders/${orderId}/messages?size=50`);
                if (res.success) {
                    setMessages(res.data.content.reverse());
                }
            } catch (error) {
                console.error("Error fetching messages:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();

    }, [isOpen, orderId]);

    useEffect(() => {
        if (!isOpen || !orderId || !connected || !stompClient) return;

        const subscription = stompClient.subscribe(`/topic/chat/${orderId}`, (message) => {
            if (message.body) {
                const newMsg = JSON.parse(message.body);
                setMessages(prev => {
                    // Check if message already exists (sometimes REST API and WebSocket overlap)
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [isOpen, orderId, connected, stompClient]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const content = newMessage;
        setNewMessage(''); // Clear input optimistically

        try {
            const res = await axiosClient.post(`/orders/${orderId}/messages`, { content });
            if (res && res.success && res.data) {
                setMessages(prev => {
                    if (prev.some(m => m.id === res.data.id)) return prev;
                    return [...prev, res.data];
                });
            }
        } catch (error) {
            console.error("Error sending message:", error);
            // Restore message if failed
            setNewMessage(content);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm sm:items-center items-end">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md h-[80vh] sm:h-[600px] shadow-2xl flex flex-col overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0 shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold">
                            {chatTitle ? chatTitle.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 leading-tight line-clamp-1">{chatTitle}</h3>
                            <p className="text-[11px] text-slate-500 font-medium">Đơn hàng #{orderCode}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-100">
                        <svg className="w-5 h-5 stroke-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 custom-scrollbar space-y-4">
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                            <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <p className="text-sm">Bắt đầu trò chuyện về đơn hàng này</p>
                        </div>
                    ) : (
                        messages.map((msg, index) => {
                            const isMine = msg.senderId === currentUser?.userId;
                            return (
                                <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                                    <div 
                                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                                            isMine 
                                            ? 'bg-teal-600 text-white rounded-tr-sm' 
                                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
                                        }`}
                                    >
                                        {msg.content}
                                    </div>
                                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                                        {format(new Date(msg.timestamp), 'HH:mm')}
                                    </span>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 bg-white border-t border-slate-100 shrink-0">
                    <form onSubmit={handleSendMessage} className="flex gap-2 relative items-end">
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e);
                                }
                            }}
                            placeholder="Nhập tin nhắn..."
                            className="flex-1 bg-slate-100 border-0 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none min-h-[44px] max-h-[120px] custom-scrollbar"
                            rows="1"
                        />
                        <button 
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="bg-teal-600 text-white p-3 rounded-full hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                            <svg className="w-5 h-5 -ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChatModal;
