import axios from 'axios';

const axiosClient = axios.create({
    baseURL: '/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptors for requests
axiosClient.interceptors.request.use(
    (config) => {
        // Lấy mock user ID từ localStorage (hoặc nơi lưu trữ tạm thời)
        const mockUserStr = localStorage.getItem('mock_current_user');
        if (mockUserStr) {
            try {
                const user = JSON.parse(mockUserStr);
                if (user && user.id) {
                    config.headers['X-Mock-User-Id'] = user.id.toString();
                }
            } catch (e) {
                console.error("Lỗi parse mock_current_user", e);
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptors for responses
axiosClient.interceptors.response.use(
    (response) => {
        if (response && response.data) {
            return response.data;
        }
        return response;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default axiosClient;
