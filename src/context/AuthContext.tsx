import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authAPI, usersAPI } from '../services/api';

export type UserRole = 'admin' | 'supervisor' | 'staff';

export interface User {
    id: string;
    username: string;
    name: string;
    role: UserRole;
    avatar?: string;
    transport_allowance?: number;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (username: string, pass: string) => Promise<boolean>;
    logout: () => void;
    loading: boolean;

    // User Management (Admin only)
    users: User[];
    refreshUsers: () => Promise<void>;
    addUser: (user: any) => Promise<boolean>;
    deleteUser: (id: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Initial session check
    useEffect(() => {
        const storedUser = localStorage.getItem(USER_KEY);
        const token = localStorage.getItem(TOKEN_KEY);

        if (storedUser && token) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    // Fetch users if admin
    useEffect(() => {
        if (user?.role === 'admin') {
            refreshUsers();
        }
    }, [user]);

    const refreshUsers = async () => {
        try {
            const response = await usersAPI.getAll();
            setUsers(response.data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    };

    const login = async (username: string, pass: string): Promise<boolean> => {
        try {
            const response = await authAPI.login(username, pass);
            const { token, user: userData } = response.data;

            localStorage.setItem(TOKEN_KEY, token);
            localStorage.setItem(USER_KEY, JSON.stringify(userData));
            setUser(userData);
            return true;
        } catch (error) {
            console.error('Login failed:', error);
            return false;
        }
    };

    const logout = () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
    };

    const addUser = async (userData: any): Promise<boolean> => {
        try {
            await usersAPI.create(userData);
            await refreshUsers();
            return true;
        } catch (error) {
            console.error('Failed to add user:', error);
            return false;
        }
    };

    const deleteUser = async (id: string): Promise<boolean> => {
        try {
            await usersAPI.delete(Number(id));
            await refreshUsers();
            return true;
        } catch (error) {
            console.error('Failed to delete user:', error);
            return false;
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
            deleteUser
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
