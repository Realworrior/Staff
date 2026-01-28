import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle token expiration
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: (username: string, password: string) =>
        api.post('/auth/login', { username, password }),
    getMe: () => api.get('/auth/me'),
};

// Users API
export const usersAPI = {
    getAll: () => api.get('/users'),
    create: (userData: any) => api.post('/users', userData),
    update: (id: number, userData: any) => api.put(`/users/${id}`, userData),
    delete: (id: number) => api.delete(`/users/${id}`),
};

// Attendance API
export const attendanceAPI = {
    clockIn: (location: string, latitude: number, longitude: number) =>
        api.post('/attendance/clock-in', { location, latitude, longitude }),
    clockOut: () => api.post('/attendance/clock-out'),
    getMyRecords: () => api.get('/attendance/my-records'),
    getAll: (params?: any) => api.get('/attendance/all', { params }),
    getSummary: (params?: any) => api.get('/attendance/summary', { params }),
};

// Schedules API
export const schedulesAPI = {
    getAll: (params?: any) => api.get('/schedules', { params }),
    create: (scheduleData: any) => api.post('/schedules', scheduleData),
    bulkCreate: (schedules: any[]) => api.post('/schedules/bulk', { schedules }),
    update: (id: number, scheduleData: any) => api.put(`/schedules/${id}`, scheduleData),
    delete: (id: number) => api.delete(`/schedules/${id}`),
    deleteRange: (data: { start_date: string, end_date: string }) => api.delete('/schedules/range/bulk', { data }),
};

// Account Logs API
export const accountLogsAPI = {
    getAll: () => api.get('/account-logs'),
    create: (logData: { phone_number: string; branch: string }) => api.post('/account-logs', logData),
    updateStatus: (id: number, status: 'open' | 'pending' | 'closed') => api.patch(`/account-logs/${id}`, { status }),
};

// Payroll API
export const payrollAPI = {
    calculate: (params: { startDate: string, endDate: string }) => api.get('/payroll/calculate', { params }),
    getHistory: () => api.get('/payroll/history'),
    createRecord: (data: { userId: number, startDate: string, endDate: string, totalTransport: number }) => api.post('/payroll/record', data),
    updateStatus: (id: number, status: 'pending' | 'paid') => api.patch(`/payroll/${id}/status`, { status }),
};

// Chat API
export const chatAPI = {
    getChannels: () => api.get('/chat/channels'),
    getDMs: () => api.get('/chat/direct-messages'),
    createChannel: (data: { name: string, description?: string, type: string }) => api.post('/chat/channels', data),
    startDM: (targetUserId: number) => api.post('/chat/dm', { targetUserId }),
    getMessages: (channelId: number) => api.get(`/chat/channels/${channelId}/messages`),
    sendMessage: (data: { channelId: number, content?: string, file_url?: string, file_name?: string, file_type?: string }) => api.post('/chat/messages', data),
    uploadFile: (formData: FormData) => api.post('/chat/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    toggleReaction: (data: { messageId: number, emoji: string }) => api.post('/chat/reactions', data),
};

export default api;
