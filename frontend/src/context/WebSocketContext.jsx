import React, { createContext, useContext, useEffect, useState } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { useAuth } from './AuthContext';
import { describeNotification } from '../utils/orderStatus';
import NotificationIcon from '../components/NotificationIcon';

const WebSocketContext = createContext(null);

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [stompClient, setStompClient] = useState(null);
    const [notification, setNotification] = useState(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (!currentUser || !currentUser.userId) {
            setConnected(false);
            setStompClient(null);
            return;
        }

        const socketUrl = import.meta.env.VITE_WS_URL || (import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/v1\/?$/, '/ws') : '/ws');
        
        const token = localStorage.getItem('access_token');
        if (!token) {
            setConnected(false);
            setStompClient(null);
            return;
        }

        const client = new Client({
            webSocketFactory: () => new SockJS(socketUrl),
            connectHeaders: {
                Authorization: `Bearer ${token}`,
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        client.onConnect = () => {
            setConnected(true);

            // Subscribe to personal notifications (both customer and shop owner)
            client.subscribe(`/topic/user/${currentUser.userId}/notifications`, (message) => {
                if (message.body) {
                    try {
                        const payload = JSON.parse(message.body);

                        // Play sound
                        try {
                            const audio = new Audio('/bell.mp3');
                            audio.play().catch(() => {});
                        } catch(e) {}

                        // Set notification state to show popup
                        setNotification(payload);
                        
                        // Auto hide after 5s
                        setTimeout(() => setNotification(null), 5000);
                    } catch (e) {
                        console.error("Lỗi đọc payload notification:", e);
                    }
                }
            });
        };

        client.onStompError = (frame) => {
            console.warn('Broker reported error: ' + frame.headers['message']);
        };

        client.onWebSocketError = (event) => {
            console.warn('WebSocket connection error:', event);
        };

        client.activate();
        setStompClient(client);

        return () => {
            setConnected(false);
            if (client) {
                try {
                    client.deactivate();
                } catch(e) {
                    console.warn("Lỗi ngắt kết nối WebSocket:", e);
                }
            }
        };
    }, [currentUser?.userId, currentUser?.role]);

    return (
        <WebSocketContext.Provider value={{ stompClient, notification, connected, setNotification }}>
            {children}
            
            {/* Notification Popup UI */}
            {notification && (() => {
                const meta = describeNotification(notification);
                return (
                    <div className="fixed top-4 right-4 z-50 animate-slide-up max-w-sm">
                        <div className="bg-white border border-slate-200/80 shadow-2xl rounded-2xl p-4 relative overflow-hidden group flex items-start gap-3">
                            <NotificationIcon icon={meta.icon} tone={meta.tone} size="md" />
                            <div className="flex-1 min-w-0 pr-2">
                                <h4 className="text-xs font-bold text-slate-900 leading-snug">{meta.title}</h4>
                                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{meta.message}</p>
                            </div>
                            <button 
                                onClick={() => setNotification(null)} 
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                );
            })()}
        </WebSocketContext.Provider>
    );
};
