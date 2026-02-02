import { useState } from 'react';
import { Lock, ChevronRight, UserCircle2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import logoDark from '../assets/logo-dark.png';
import logoLight from '../assets/logo-light.png';

export const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const { theme } = useTheme();

    // Form state
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const handleCredentialsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const user = username.toLowerCase().trim();
        const pass = password.trim();

        const errorMsg = await login(user, pass);

        if (!errorMsg) {
            navigate('/');
        } else {
            setError(errorMsg);
        }
    };

    return (
        <div className="min-h-screen bg-[rgb(var(--bg-primary))] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[rgb(var(--bg-secondary))] rounded-2xl shadow-xl overflow-hidden border border-[rgb(var(--border-color))]">
                <div className="bg-[rgb(var(--accent-primary))] p-8 text-center flex flex-col items-center">
                    <div className="mb-4 bg-white/10 p-4 rounded-full backdrop-blur-sm">
                        <img
                            src={theme === 'dark' ? logoDark : logoLight}
                            alt="Falmebet Logo"
                            className="h-16 w-auto drop-shadow-lg"
                        />
                    </div>
                    <p className="text-white/90 font-medium">
                        Secure Access Portal
                    </p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleCredentialsSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-[rgb(var(--text-secondary))] mb-2">Username</label>
                            <div className="relative group">
                                <UserCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-tertiary))] group-focus-within:text-[rgb(var(--accent-primary))] transition-colors" size={20} />
                                <input
                                    type="text"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    autoComplete="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-primary))] focus:ring-2 focus:ring-[rgb(var(--accent-primary))] focus:border-transparent outline-none transition-all placeholder:text-[rgb(var(--text-tertiary))]"
                                    placeholder="Enter your username"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-[rgb(var(--text-secondary))] mb-2">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-tertiary))] group-focus-within:text-[rgb(var(--accent-primary))] transition-colors" size={20} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-12 py-3 rounded-xl border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-primary))] focus:ring-2 focus:ring-[rgb(var(--accent-primary))] focus:border-transparent outline-none transition-all placeholder:text-[rgb(var(--text-tertiary))]"
                                    placeholder="Enter your password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[rgb(var(--text-tertiary))] hover:text-[rgb(var(--text-primary))] transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium animate-in fade-in">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full flex items-center justify-center gap-2 bg-[rgb(var(--accent-primary))] text-white font-semibold py-3 px-6 rounded-xl hover:bg-[rgb(var(--accent-hover))] transition-colors shadow-lg"
                        >
                            <Lock size={18} />
                            Secure Login
                            <ChevronRight size={18} />
                        </button>

                        <div className="mt-6 p-4 bg-[rgb(var(--bg-tertiary))] rounded-xl space-y-2 text-xs text-[rgb(var(--text-secondary))] border border-[rgb(var(--border-color))]">
                            <p className="font-semibold text-[rgb(var(--text-primary))]">Demo Credentials:</p>
                            <div className="grid grid-cols-2 gap-2">
                                <div><span className="font-medium text-[rgb(var(--accent-primary))]">admin</span> / falmebet123</div>
                                <div><span className="font-medium text-blue-500">supervisor</span> / falmebet123</div>
                                <div><span className="font-medium text-[rgb(var(--accent-primary))]">staff</span> / falmebet123</div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
