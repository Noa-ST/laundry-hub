import React, { createContext, useState, useEffect, useContext } from 'react';
import axiosClient from '../api/axiosClient';

const MockUserContext = createContext();

export const MockUserProvider = ({ children }) => {
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMockUsers = async () => {
            try {
                const response = await axiosClient.get('/mock-users');
                if (response.success && response.data.length > 0) {
                    setUsers(response.data);
                    
                    // Kiểm tra localStorage
                    const savedUserStr = localStorage.getItem('mock_current_user');
                    let initialUser = null;
                    if (savedUserStr) {
                        try {
                            const parsed = JSON.parse(savedUserStr);
                            initialUser = response.data.find(u => u.id === parsed.id);
                        } catch (e) {}
                    }
                    
                    if (!initialUser) {
                        // Lấy CUSTOMER làm default
                        initialUser = response.data.find(u => u.role === 'CUSTOMER') || response.data[0];
                    }
                    
                    setCurrentUser(initialUser);
                    if (initialUser) {
                        localStorage.setItem('mock_current_user', JSON.stringify(initialUser));
                    }
                }
            } catch (error) {
                console.error("Không thể tải danh sách Mock Users", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMockUsers();
    }, []);

    const switchUser = (userId) => {
        const selected = users.find(u => u.id === userId);
        if (selected) {
            setCurrentUser(selected);
            localStorage.setItem('mock_current_user', JSON.stringify(selected));
            // Reload trang để làm mới các request với X-Mock-User-Id mới
            window.location.reload();
        }
    };

    return (
        <MockUserContext.Provider value={{ users, currentUser, switchUser, loading }}>
            {children}
        </MockUserContext.Provider>
    );
};

export const useMockUser = () => useContext(MockUserContext);
