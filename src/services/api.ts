import axios from 'axios';

const getApiUrl = () => {
    let url = import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_URL || '/api');

    // Ensure the URL correctly includes the /api prefix
    if (!url.includes('/api')) {
        url = url.endsWith('/') ? `${url}api` : `${url}/api`;
    }

    // Always end with a trailing slash to work reliably with non-slashed relative paths
    const finalUrl = url.endsWith('/') ? url : `${url}/`;

    if (!import.meta.env.DEV) {
        console.log('[API] Initialized with Base URL:', finalUrl);
    }

    return finalUrl;
};

const API_URL = getApiUrl();
export const API_BASE_URL = API_URL;

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    // Ensure headers object exists to avoid runtime error when setting Authorization
    config.headers = config.headers || {};
    if (token) {
        // some axios types mark headers as AxiosHeaders or plain object; cast to any to be safe
        (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle token expiration
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Only redirect and clear tokens if not on the login page/endpoint
            // to avoid breaking the display of actual login error messages
            const isLoginRequest = error.config?.url?.includes('/auth/login');

            if (!isLoginRequest) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: (username: string, password: string) =>
        api.post('auth/login', { username, password }),
    getMe: () => api.get('auth/me'),
};

// Users API
export const usersAPI = {
    getAll: () => api.get('users'),
    create: (userData: any) => api.post('users', userData),
    update: (id: number, userData: any) => api.put(`users/${id}`, userData),
    delete: (id: number) => api.delete(`users/${id}`),
};

// Attendance API
export const attendanceAPI = {
    clockIn: (location: string, latitude: number, longitude: number) =>
        api.post('attendance/clock-in', { location, latitude, longitude }),
    clockOut: () => api.post('attendance/clock-out'),
    getMyRecords: () => api.get('attendance/my-records'),
    getAll: (params?: any) => api.get('attendance/all', { params }),
    getSummary: (params?: any) => api.get('attendance/summary', { params }),
};

// Schedules API
export const schedulesAPI = {
    getAll: (params?: any) => api.get('schedules', { params }),
    create: (scheduleData: any) => api.post('schedules', scheduleData),
    bulkCreate: (schedules: any[]) => api.post('schedules/bulk', { schedules }),
    update: (id: number, scheduleData: any) => api.put(`schedules/${id}`, scheduleData),
    delete: (id: number) => api.delete(`schedules/${id}`),
    deleteRange: (data: { start_date: string, end_date: string, branch: string }) => api.delete('schedules/range/bulk', { data }),
    importRota: (file: File, branch: string) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('branch', branch);
        return api.post('schedules/import', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },
};

// Account Logs API
export const accountLogsAPI = {
    getAll: (params?: any) => api.get('account-logs', { params }),
    create: (logData: { phone_number: string; branch: string }) => api.post('account-logs', logData),
    updateStatus: (id: number, status: 'open' | 'pending' | 'closed') => api.patch(`account-logs/${id}`, { status }),
};

// Payroll API
export const payrollAPI = {
    calculate: (params: { startDate: string; endDate: string; branch?: string }) => api.get('payroll/calculate', { params }),
    getHistory: () => api.get('payroll/history'),
    createRecord: (data: { userId: number, startDate: string, endDate: string, totalTransport: number }) => api.post('payroll/record', data),
    updateStatus: (id: number, status: 'pending' | 'paid') => api.patch(`payroll/${id}/status`, { status }),
};

// Chat API
export const chatAPI = {
    getChannels: () => api.get('chat/channels'),
    getDMs: () => api.get('chat/direct-messages'),
    createChannel: (data: { name: string, description?: string, type: string }) => api.post('chat/channels', data),
    startDM: (targetUserId: number) => api.post('chat/dm', { targetUserId }),
    getMessages: (channelId: number) => api.get(`chat/channels/${channelId}/messages`),
    sendMessage: (data: { channelId: number, content?: string, file_url?: string, file_name?: string, file_type?: string }) => api.post('chat/messages', data),
    uploadFile: (formData: FormData) => api.post('chat/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    toggleReaction: (data: { messageId: number, emoji: string }) => api.post('chat/reactions', data),
};

export default api;
