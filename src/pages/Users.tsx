import { useState } from 'react';
import { useAuth, type UserRole } from '../context/AuthContext';
import { Plus, Trash2, Shield, User, Users, Loader2, Edit2 } from 'lucide-react';
import { usersAPI } from '../services/api';

export const UserManagement = () => {
    const { users, addUser, deleteUser, user: currentUser, refreshUsers } = useAuth();
    const [isAdding, setIsAdding] = useState(false);
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState<UserRole>('staff');
    const [transportAllowance, setTransportAllowance] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        try {
            if (editingUser) {
                const response = await usersAPI.update(editingUser.id, {
                    name,
                    role,
                    transport_allowance: transportAllowance,
                });
                if (response.data) {
                    setEditingUser(null);
                    setIsAdding(false);
                    resetForm();
                    refreshUsers();
                }
            } else {
                const success = await addUser({
                    username,
                    password,
                    name,
                    role,
                    transport_allowance: transportAllowance,
                });

                if (success) {
                    setIsAdding(false);
                    resetForm();
                } else {
                    setError('Failed to create user. Username might already exist.');
                }
            }
        } catch (err) {
            setError('An unexpected error occurred.');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setUsername('');
        setPassword('');
        setName('');
        setRole('staff');
        setTransportAllowance(0);
        setError(null);
    };

    const handleEdit = (user: any) => {
        setEditingUser(user);
        setName(user.name);
        setRole(user.role);
        setTransportAllowance(user.transport_allowance || 0);
        setIsAdding(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return;

        const success = await deleteUser(id);
        if (!success) {
            alert('Failed to delete user.');
        }
    };

    const getRoleIcon = (role: UserRole) => {
        switch (role) {
            case 'admin': return <Shield className="text-[rgb(var(--accent-primary))]" size={20} />;
            case 'supervisor': return <Users className="text-blue-500" size={20} />;
            case 'staff': return <User className="text-emerald-500" size={20} />;
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))]">User Management</h1>
                    <p className="text-[rgb(var(--text-secondary))]">Add or remove system users</p>
                </div>
                <button
                    onClick={() => {
                        setEditingUser(null);
                        resetForm();
                        setIsAdding(!isAdding);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-[rgb(var(--accent-primary))] text-white rounded-lg hover:bg-[rgb(var(--accent-hover))] transition-colors shadow-sm"
                >
                    <Plus size={20} />
                    {isAdding ? 'Close Form' : 'Add User'}
                </button>
            </div>

            {isAdding && (
                <div className="mb-8 bg-[rgb(var(--bg-secondary))] p-8 rounded-2xl shadow-sm border border-[rgb(var(--border-color))] animate-in fade-in slide-in-from-top-4">
                    <h2 className="text-lg font-bold mb-6 text-[rgb(var(--text-primary))]">
                        {editingUser ? `Edit Employee: ${editingUser.name}` : 'Create New Employee'}
                    </h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">Full Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-primary))] focus:ring-2 focus:ring-[rgb(var(--accent-primary))] outline-none transition-all"
                                required
                                placeholder="e.g. John Doe"
                            />
                        </div>
                        {!editingUser && (
                            <div>
                                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-primary))] focus:ring-2 focus:ring-[rgb(var(--accent-primary))] outline-none transition-all"
                                    required
                                    placeholder="johndoe"
                                />
                            </div>
                        )}
                        {!editingUser && (
                            <div>
                                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">Initial Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-primary))] focus:ring-2 focus:ring-[rgb(var(--accent-primary))] outline-none transition-all"
                                    required
                                    placeholder="Set password"
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">Role</label>
                            <select
                                value={role}
                                onChange={e => setRole(e.target.value as UserRole)}
                                className="w-full px-4 py-2.5 rounded-xl border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-primary))] focus:ring-2 focus:ring-[rgb(var(--accent-primary))] outline-none transition-all"
                            >
                                <option value="staff">Staff Member</option>
                                <option value="supervisor">Supervisor</option>
                                <option value="admin">Administrator</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">Transport Allowance (KES)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[rgb(var(--text-tertiary))]">KES</span>
                                <input
                                    type="number"
                                    value={transportAllowance}
                                    onChange={e => setTransportAllowance(Number(e.target.value))}
                                    className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-primary))] focus:ring-2 focus:ring-[rgb(var(--accent-primary))] outline-none transition-all font-mono"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="md:col-span-2 p-3 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-sm font-medium border border-red-100 dark:border-red-900/30">
                                {error}
                            </div>
                        )}

                        <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
                                className="px-5 py-2.5 text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-tertiary))] rounded-xl font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex items-center gap-2 px-8 py-2.5 bg-[rgb(var(--accent-primary))] text-white rounded-xl hover:bg-[rgb(var(--accent-hover))] font-semibold shadow-lg shadow-emerald-200 dark:shadow-none disabled:opacity-75 disabled:cursor-not-allowed"
                            >
                                {submitting && <Loader2 className="animate-spin" size={20} />}
                                {submitting ? (editingUser ? 'Updating...' : 'Creating...') : (editingUser ? 'Update User' : 'Create User')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-[rgb(var(--bg-secondary))] rounded-2xl shadow-sm border border-[rgb(var(--border-color))] overflow-hidden">
                <div className="p-6 border-b border-[rgb(var(--border-color))]">
                    <h3 className="font-bold text-[rgb(var(--text-primary))]">System Users</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[rgb(var(--bg-tertiary))] text-[rgb(var(--text-secondary))] text-sm">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Employee</th>
                                <th className="px-6 py-4 font-semibold">Role</th>
                                <th className="px-6 py-4 font-semibold">Username</th>
                                <th className="px-6 py-4 font-semibold text-right">Transport (KES)</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgb(var(--border-color))]">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-[rgb(var(--bg-tertiary))] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-[rgb(var(--bg-tertiary))] overflow-hidden flex-shrink-0">
                                                <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                                            </div>
                                            <span className="font-semibold text-[rgb(var(--text-primary))]">{u.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {getRoleIcon(u.role)}
                                            <span className="capitalize text-[rgb(var(--text-primary))] text-sm">{u.role}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-[rgb(var(--text-secondary))] font-mono text-sm">
                                        {u.username}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-sm font-bold text-[rgb(var(--accent-primary))]">
                                        {u.transport_allowance || 0}
                                    </td>
                                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => handleEdit(u)}
                                            className="p-2 text-[rgb(var(--text-tertiary))] hover:text-[rgb(var(--accent-primary))] hover:bg-[rgb(var(--accent-light))] rounded-lg transition-all"
                                            title="Edit User"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        {u.username !== 'admin' && u.id.toString() !== currentUser?.id?.toString() && (
                                            <button
                                                onClick={() => handleDelete(u.id, u.name)}
                                                className="p-2 text-[rgb(var(--text-tertiary))] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                title="Delete User"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
