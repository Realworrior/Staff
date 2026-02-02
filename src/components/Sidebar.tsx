import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Calendar,
    Clock,
    FileText,
    DollarSign,
    MessageSquare,
    Settings,
    LogOut,
    Menu,
    RefreshCw,
    Book,
    Sun,
    Moon,
    Shield,
    Building2
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/', roles: ['admin', 'supervisor', 'staff'] },
    { icon: Clock, label: 'Attendance', path: '/attendance', roles: ['admin', 'supervisor', 'staff'] },
    { icon: Calendar, label: 'Schedule', path: '/schedule', roles: ['admin', 'supervisor', 'staff'] },
    { icon: RefreshCw, label: 'Rota Generator', path: '/rota', roles: ['admin'] },
    { icon: Users, label: 'User Management', path: '/users', roles: ['admin'] },
    { icon: FileText, label: 'Leave', path: '/leave', roles: ['admin', 'supervisor', 'staff'] },
    { icon: DollarSign, label: 'Payroll', path: '/payroll', roles: ['admin', 'supervisor'] },
    { icon: Users, label: 'HR', path: '/hr', roles: ['admin', 'supervisor'] },
    { icon: Shield, label: 'Account Logs', path: '/account-logs', roles: ['admin', 'supervisor'] },
    { icon: Book, label: 'Knowledge Base', path: '/kb', roles: ['admin', 'supervisor', 'staff'] },
    { icon: MessageSquare, label: 'Chat', path: '/chat', roles: ['admin', 'supervisor', 'staff'] },
    { icon: Settings, label: 'Settings', path: '/settings', roles: ['admin'] },
];

interface SidebarProps {
    isOpen: boolean;
    toggleSidebar: () => void;
}

export const Sidebar = ({ isOpen, toggleSidebar }: SidebarProps) => {
    const { user, logout, selectedBranch, setSelectedBranch } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const activeRole = user?.role;

    const branches = [
        { id: 'betfalme', name: 'Betfalme Office', color: 'text-emerald-500' },
        { id: 'sofa_safi', name: 'Sofa/Safi Office', color: 'text-blue-500' }
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={toggleSidebar}
                />
            )}

            {/* Sidebar Container */}
            <aside className={clsx(
                "fixed md:sticky top-0 left-0 h-screen w-64 bg-[rgb(var(--bg-secondary))] border-r border-[rgb(var(--border-color))] z-50 transition-transform duration-300 ease-in-out",
                !isOpen && "-translate-x-full md:translate-x-0"
            )}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6 border-b border-[rgb(var(--border-color))] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="bg-[rgb(var(--accent-primary))] p-1.5 rounded-lg text-white">
                                <Building2 size={24} strokeWidth={2.5} />
                            </div>
                            <span className="font-bold text-xl tracking-tight text-[rgb(var(--text-primary))]">StaffManager</span>
                        </div>
                        <button className="md:hidden text-[rgb(var(--text-primary))]" onClick={toggleSidebar}>
                            <Menu size={24} />
                        </button>
                    </div>

                    {/* Branch Switcher (Admin/Supervisor Only) */}
                    {(activeRole === 'admin' || activeRole === 'supervisor') && (
                        <div className="px-4 py-4 border-b border-[rgb(var(--border-color))] bg-[rgb(var(--bg-primary))/50]">
                            <label className="block text-[10px] font-bold text-[rgb(var(--text-tertiary))] uppercase tracking-wider mb-2 ml-1">
                                Current Office
                            </label>
                            <div className="grid grid-cols-1 gap-1">
                                {branches.map((branch) => (
                                    <button
                                        key={branch.id}
                                        onClick={() => setSelectedBranch(branch.id)}
                                        className={clsx(
                                            "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all border",
                                            selectedBranch === branch.id
                                                ? "bg-[rgb(var(--bg-secondary))] border-[rgb(var(--accent-primary))] shadow-sm"
                                                : "bg-transparent border-transparent hover:bg-[rgb(var(--bg-tertiary))] text-[rgb(var(--text-secondary))]"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={clsx("w-2 h-2 rounded-full", selectedBranch === branch.id ? "bg-[rgb(var(--accent-primary))]" : "bg-gray-400")} />
                                            <span className={clsx("font-medium", selectedBranch === branch.id ? "text-[rgb(var(--text-primary))]" : "")}>
                                                {branch.name}
                                            </span>
                                        </div>
                                        {selectedBranch === branch.id && (
                                            <div className="text-[rgb(var(--accent-primary))]">
                                                <Shield size={14} />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                        {navItems.filter(item => activeRole && item.roles.includes(activeRole)).map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => clsx(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                                    isActive
                                        ? "bg-[rgb(var(--accent-light))] text-[rgb(var(--accent-primary))] font-medium"
                                        : "text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-tertiary))] hover:text-[rgb(var(--text-primary))]"
                                )}
                                onClick={() => window.innerWidth < 768 && toggleSidebar()}
                            >
                                <item.icon size={20} />
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>

                    {/* User Profile / Logout */}
                    <div className="p-4 border-t border-[rgb(var(--border-color))] bg-[rgb(var(--bg-tertiary))]">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[rgb(var(--accent-primary))] flex items-center justify-center text-white font-bold shrink-0">
                                    {activeRole?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-[rgb(var(--text-primary))] truncate">
                                        {user?.name}
                                    </p>
                                    <p className="text-xs text-[rgb(var(--text-tertiary))] truncate capitalize">{activeRole}</p>
                                </div>
                            </div>

                            <button
                                onClick={toggleTheme}
                                className="flex items-center gap-3 w-full px-4 py-2 text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--accent-primary))] hover:bg-[rgb(var(--bg-secondary))] rounded-lg transition-colors text-sm"
                            >
                                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                            </button>

                            <button
                                onClick={logout}
                                className="flex items-center gap-3 w-full px-4 py-2 text-[rgb(var(--text-secondary))] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm"
                            >
                                <LogOut size={16} />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};
