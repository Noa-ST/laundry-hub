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
            if (response.success) {
                setCurrentUser(response.data);
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
            if (response.success) {
                localStorage.setItem('access_token', response.data.accessToken);
                setCurrentUser(response.data);
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
            if (response.success) {
                localStorage.setItem('access_token', response.data.accessToken);
                setCurrentUser(response.data);
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

    const value = { currentUser, loading, isAuthenticated: !!currentUser, login, register, logout };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};