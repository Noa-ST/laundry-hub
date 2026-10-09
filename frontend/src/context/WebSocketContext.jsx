import React, { createContext, useContext, useEffect, useState } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext(null);

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [stompClient, setStompClient] = useState(null);
    const [notification, setNotification] = useState(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (!currentUser || !currentUser.userId) return;

        const socketUrl = 'http://localhost:8080/ws';
        
        const client = new Client({
            webSocketFactory: () => new SockJS(socketUrl),
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        client.onConnect = () => {
            console.log('Connected to WebSocket as user: ' + currentUser.userId);
            setConnected(true);

            // Subscribe to customer notifications
            client.subscribe(`/topic/user/${currentUser.userId}/notifications`, (message) => {
                if (message.body) {
                    const payload = JSON.parse(message.body);
                    console.log('Received notification:', payload);
                    
                    // Play sound
                    try {
                        const audio = new Audio('/bell.mp3');
                        audio.play();
                    } catch(e) { console.error("Could not play sound", e); }

                    // Set notification state to show popup
                    setNotification(payload);
                    
                    // Auto hide after 5s
                    setTimeout(() => setNotification(null), 5000);
                }
            });
            
            // If owner, subscribe to global owner notifications
            if (currentUser.role === 'SHOP_OWNER') {
                client.subscribe('/topic/owner/notifications', (message) => {
                    if (message.body) {
                        const payload = JSON.parse(message.body);
                        setNotification(payload);
                        setTimeout(() => setNotification(null), 5000);
                    }
                });
            }
        };

        client.onStompError = (frame) => {
            console.error('Broker reported error: ' + frame.headers['message']);
            console.error('Additional details: ' + frame.body);
        };

        client.activate();
        setStompClient(client);

        return () => {
            if (client.active) {
                client.deactivate();
            }
        };
    }, [currentUser]);

    return (
        <WebSocketContext.Provider value={{ stompClient, notification, connected, setNotification }}>
            {children}
            
            {/* Notification Popup UI */}
            {notification && (
                <div className="fixed top-4 right-4 z-50 animate-bounce">
                    <div className="bg-white border-l-4 border-primary shadow-xl rounded-r-xl p-4 w-80 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-primary/5 translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                        <div className="flex items-start gap-3 relative z-10">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-slate-800">{notification.title}</h4>
                                <p className="text-xs text-slate-500 mt-1">{notification.message}</p>
                            </div>
                            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </WebSocketContext.Provider>
    );
};
