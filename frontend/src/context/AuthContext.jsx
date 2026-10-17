import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadUser = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            setCurrentUser(null);
            setLoading(false);
            return;
        }
        try {
            const response = await axiosClient.get('/auth/me');
            if (response.success && response.data) {
                const userData = { ...response.data, id: response.data.userId ?? response.data.id, userId: response.data.userId ?? response.data.id };
                setCurrentUser(userData);
            } else {
                localStorage.removeItem('access_token');
                setCurrentUser(null);
            }
        } catch (error) {
            console.error('Lỗi tải user:', error);
            localStorage.removeItem('access_token');
            setCurrentUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUser();

        const handleUnauthorized = () => {
            setCurrentUser(null);
        };
        window.addEventListener('auth:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
    }, []);

    const login = async (phone, password) => {
        try {
            const response = await axiosClient.post('/auth/login', { phone, password });
            if (response.success && response.data) {
                localStorage.setItem('access_token', response.data.accessToken);
                const userData = { ...response.data, id: response.data.userId ?? response.data.id, userId: response.data.userId ?? response.data.id };
                setCurrentUser(userData);
                return { success: true };
            }
            return { success: false, message: response.message || 'Đăng nhập thất bại' };
        } catch (error) {
            return { 
                success: false, 
                message: error.response?.data?.message || 'Có lỗi xảy ra khi đăng nhập' 
            };
        }
    };

    const register = async (data) => {
        try {
            const response = await axiosClient.post('/auth/register', data);
            if (response.success && response.data) {
                localStorage.setItem('access_token', response.data.accessToken);
                const userData = { ...response.data, id: response.data.userId ?? response.data.id, userId: response.data.userId ?? response.data.id };
                setCurrentUser(userData);
                return { success: true };
            }
            return { success: false, message: response.message || 'Đăng ký thất bại' };
        } catch (error) {
            return { 
                success: false, 
                message: error.response?.data?.message || 'Có lỗi xảy ra khi đăng ký' 
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        setCurrentUser(null);
    };

    const value = { currentUser, loading, isAuthenticated: !!currentUser, login, register, logout, loadUser };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};