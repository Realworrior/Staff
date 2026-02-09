import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authAPI, usersAPI } from '../services/api';

export type UserRole = 'admin' | 'supervisor' | 'staff';

export interface User {
    id: string;
    username: string;
    name: string;
    role: UserRole;
    branch: string;
    avatar?: string;
    transport_allowance?: number;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (username: string, pass: string) => Promise<string | null>;
    logout: () => void;
    loading: boolean;

    // User Management (Admin only)
    users: User[];
    refreshUsers: () => Promise<void>;
    addUser: (user: any) => Promise<string | null>;
    deleteUser: (id: string) => Promise<string | null>;

    // Branch Management
    selectedBranch: string;
    setSelectedBranch: (branch: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBranch, setSelectedBranch] = useState<string>('betfalme');

    // Initial session check
    useEffect(() => {
        const storedUser = localStorage.getItem(USER_KEY);
        const token = localStorage.getItem(TOKEN_KEY);

        if (storedUser && token) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setSelectedBranch(parsedUser.branch || 'betfalme');
        }
        setLoading(false);
    }, []);

    // Fetch users if admin
    useEffect(() => {
        if (user?.role === 'admin') {
            refreshUsers();
        }
    }, [user]);

    // Apply branch theme class to body
    useEffect(() => {
        const body = document.body;
        // Remove all branch classes first
        body.classList.forEach(cls => {
            if (cls.startsWith('branch-')) {
                body.classList.remove(cls);
            }
        });

        // Add class for current branch
        if (selectedBranch !== 'betfalme') {
            body.classList.add(`branch-${selectedBranch}`);
        }
    }, [selectedBranch]);

    const refreshUsers = async () => {
        try {
            const response = await usersAPI.getAll();
            setUsers(response.data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    };

    const login = async (username: string, pass: string): Promise<string | null> => {
        try {
            const response = await authAPI.login(username, pass);
            const { token, user: userData } = response.data;

            localStorage.setItem(TOKEN_KEY, token);
            localStorage.setItem(USER_KEY, JSON.stringify(userData));
            setUser(userData);
            setSelectedBranch(userData.branch || 'betfalme');
            return null; // Success
        } catch (error: any) {
            console.error('Login error detail:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message,
                config_url: error.config?.url
            });
            if (error.code === 'ERR_NETWORK') {
                return 'Network Error. Server unreachable.';
            }
            if (error.response?.status === 401) {
                return error.response?.data?.error || 'Invalid credentials.';
            }
            return error.response?.data?.message || error.response?.data?.error || 'Login failed. Please try again.';
        }
    };

    const logout = () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
    };

    const addUser = async (userData: any): Promise<string | null> => {
        try {
            await usersAPI.create(userData);
            await refreshUsers();
            return null; // Success
        } catch (error: any) {
            console.error('Failed to add user:', error);
            return error.response?.data?.error || 'Failed to create user. Please try again.';
        }
    };

    const deleteUser = async (id: string): Promise<string | null> => {
        try {
            await usersAPI.delete(Number(id));
            await refreshUsers();
            return null; // Success
        } catch (error: any) {
            console.error('Failed to delete user:', error);
            return error.response?.data?.error || 'Failed to delete user.';
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!user,
            login,
            logout,
            loading,
            users,
            refreshUsers,
            addUser,
            deleteUser,
            selectedBranch,
            setSelectedBranch
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
