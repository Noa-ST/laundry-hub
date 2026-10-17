import React, { useState, useEffect, useRef } from 'react';
import axiosClient from '../api/axiosClient';
import { useWebSocket } from '../context/WebSocketContext';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { describeNotification } from '../utils/orderStatus';
import NotificationIcon from './NotificationIcon';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const { notification: newNotif } = useWebSocket();

    const fetchNotifications = async (pageNum = 0, append = false) => {
        try {
            if (append) setLoadingMore(true);
            const [listRes, countRes] = await Promise.all([
                axiosClient.get(`/notifications?page=${pageNum}&size=15`),
                axiosClient.get('/notifications/unread-count')
            ]);
            if (listRes.success) {
                if (append) {
                    setNotifications(prev => {
                        const existingIds = new Set(prev.map(n => n.id));
                        const newNotifs = listRes.data.content.filter(n => !existingIds.has(n.id));
                        return [...prev, ...newNotifs];
                    });
                } else {
                    setNotifications(listRes.data.content);
                }
                setTotalPages(listRes.data.totalPages);
                setPage(pageNum);
            }
            if (countRes.success) setUnreadCount(countRes.data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            if (append) setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    // Lắng nghe thông báo mới từ WebSocket
    useEffect(() => {
        if (newNotif) {
            setNotifications(prev => [newNotif, ...prev]);
            setUnreadCount(prev => prev + 1);
        }
    }, [newNotif]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = async (id, e) => {
        e.stopPropagation();
        try {
            await axiosClient.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error(error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await axiosClient.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error(error);
        }
    };

    const formatTime = (timeStr) => {
        try {
            return format(new Date(timeStr), 'HH:mm dd/MM', { locale: vi });
        } catch (e) {
            return '';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-500 hover:text-indigo-600 transition-colors focus:outline-none"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden origin-top-right transition-all">
                    <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-800">Thông báo</h3>
                        {unreadCount > 0 && (
                            <button onClick={handleMarkAllAsRead} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                                Đánh dấu đã đọc
                            </button>
                        )}
                    </div>
                    
                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-gray-500 text-sm">
                                Bạn chưa có thông báo nào.
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {notifications.map(notif => {
                                    const meta = describeNotification(notif);
                                    return (
                                        <div 
                                            key={notif.id || Math.random()} 
                                            className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 ${!notif.read ? 'bg-indigo-50/30' : ''}`}
                                        >
                                            <NotificationIcon icon={meta.icon} tone={meta.tone} size="md" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-1">
                                                    <h4 className={`text-xs font-bold leading-snug ${!notif.read ? 'text-indigo-950 font-bold' : 'text-slate-800'}`}>
                                                        {meta.title}
                                                    </h4>
                                                    {!notif.read && notif.id && (
                                                        <button 
                                                            onClick={(e) => handleMarkAsRead(notif.id, e)}
                                                            className="w-2 h-2 bg-indigo-600 rounded-full shrink-0 ml-1 mt-1 shadow-sm hover:scale-125 transition-transform"
                                                            title="Đánh dấu đã đọc"
                                                        ></button>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed break-words">{meta.message}</p>
                                                <span className="text-[10px] text-slate-400 mt-1.5 block">
                                                    {notif.createdAt ? formatTime(notif.createdAt) : 'Vừa xong'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {page < totalPages - 1 && (
                            <button 
                                onClick={() => fetchNotifications(page + 1, true)}
                                disabled={loadingMore}
                                className="w-full text-center py-2 text-xs font-semibold text-indigo-600 hover:bg-gray-50 border-t border-gray-100 disabled:opacity-50"
                            >
                                {loadingMore ? 'Đang tải...' : 'Xem thêm'}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
