import axios from 'axios';

// 1. Create a custom axios instance
const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
});

// 2. Helper function to read the cookie on the client side
const getCookie = (name: string) => {
    if (typeof document === 'undefined') return null; // Prevent SSR errors
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
};

// 3. Add the Interceptor
api.interceptors.request.use((config) => {
    const token = getCookie('auth_token');

    if (token) {
        // Automatically attach the Bearer token to headers
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

export default api;