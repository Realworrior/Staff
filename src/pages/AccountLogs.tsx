import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, AlertCircle, CheckCircle, Loader2, Download } from 'lucide-react';
import { accountLogsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { clsx } from 'clsx';

type Status = 'open' | 'pending' | 'closed';
type Priority = 'low' | 'medium' | 'high';

interface AccountLog {
    id: number;
    phone_number: string;
    branch: string;
    status: Status;
    request_count: number;
    priority: Priority;
    last_request_at: string;
    created_at: string;
    updated_at: string;
}

export const AccountLogs = () => {
    const { selectedBranch } = useAuth();
    const [logs, setLogs] = useState<AccountLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            // We pass branch to filter on backend
            const response = await accountLogsAPI.getAll({ params: { branch: selectedBranch } });
            setLogs(response.data.data);
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedBranch]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleDownload = () => {
        if (logs.length === 0) return;

        const headers = ['Phone Number', 'Branch', 'Status', 'Frequency', 'Priority', 'Last Request', 'Created At'];
        const csvRows = logs.map((log: AccountLog) => [
            log.phone_number,
            log.branch,
            log.status,
            log.request_count,
            log.priority,
            format(new Date(log.last_request_at), 'yyyy-MM-dd HH:mm'),
            format(new Date(log.created_at), 'yyyy-MM-dd HH:mm')
        ].join(','));

        const csvContent = [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `account_report_${selectedBranch}_${format(new Date(), 'yyyyMMdd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setSubmitting(true);

        try {
            await accountLogsAPI.create({
                phone_number: searchQuery,
                branch: selectedBranch
            });
            setSuccessMessage('Entry logged successfully');
            setSearchQuery('');
            fetchLogs();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create entry');
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusUpdate = async (id: number, status: Status) => {
        try {
            await accountLogsAPI.updateStatus(id, status);
            fetchLogs();
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const getPriorityColor = (priority: Priority) => {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'medium': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
            case 'low': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        }
    };

    const getStatusColor = (status: Status) => {
        switch (status) {
            case 'open': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
            case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            case 'closed': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))]">Account Deactivation Logs</h1>
                    <p className="text-[rgb(var(--text-secondary))] underline decoration-accent-primary decoration-2 underline-offset-4">
                        Office: {selectedBranch === 'betfalme' ? 'Betfalme' : 'Sofa/Safi'}
                    </p>
                </div>
                <button
                    onClick={handleDownload}
                    disabled={logs.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-[rgb(var(--bg-tertiary))] text-[rgb(var(--text-primary))] rounded-lg hover:bg-[rgb(var(--border-color))] transition-all border border-[rgb(var(--border-color))] disabled:opacity-50"
                >
                    <Download size={18} />
                    Download Report
                </button>
            </div>

            {/* Submission Form */}
            <div className="bg-[rgb(var(--bg-secondary))] p-8 rounded-2xl shadow-sm border border-[rgb(var(--border-color))]">
                <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full space-y-2">
                        <label className="text-sm font-semibold text-[rgb(var(--text-secondary))]">Phone Number / Client ID</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--text-tertiary))]" size={20} />
                            <input
                                type="text"
                                placeholder="Search or Enter phone number..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-primary))] focus:ring-2 focus:ring-[rgb(var(--accent-primary))] transition-all outline-none"
                                required
                            />
                        </div>
                    </div>
                    <div className="w-full md:w-48 space-y-2">
                        <label className="text-sm font-semibold text-[rgb(var(--text-secondary))]">Branch</label>
                        <div className="px-4 py-3 rounded-xl border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-tertiary))] text-[rgb(var(--text-primary))] font-bold text-sm uppercase">
                            {selectedBranch}
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full md:w-auto px-8 py-3 bg-[rgb(var(--accent-primary))] text-white rounded-xl font-bold hover:bg-[rgb(var(--accent-hover))] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {submitting ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                        Log Entry
                    </button>
                </form>

                {error && (
                    <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-sm font-medium flex items-center gap-2">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}
                {successMessage && (
                    <div className="mt-4 p-3 rounded-lg bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 text-sm font-medium flex items-center gap-2">
                        <CheckCircle size={16} />
                        {successMessage}
                    </div>
                )}
            </div>

            {/* List View */}
            <div className="bg-[rgb(var(--bg-secondary))] rounded-2xl shadow-sm border border-[rgb(var(--border-color))] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[rgb(var(--bg-tertiary))] text-[rgb(var(--text-secondary))] text-sm">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Phone Number</th>
                                <th className="px-6 py-4 font-semibold">Branch</th>
                                <th className="px-6 py-4 font-semibold">Frequency</th>
                                <th className="px-6 py-4 font-semibold">Priority</th>
                                <th className="px-6 py-4 font-semibold">Last Request</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgb(var(--border-color))]">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <Loader2 className="animate-spin mx-auto text-[rgb(var(--accent-primary))]" size={32} />
                                    </td>
                                </tr>
                            ) : logs.length > 0 ? logs.map((log: AccountLog) => (
                                <tr key={log.id} className="hover:bg-[rgb(var(--bg-tertiary))] transition-colors group">
                                    <td className="px-6 py-4 font-semibold text-[rgb(var(--text-primary))]">{log.phone_number}</td>
                                    <td className="px-6 py-4 capitalize text-[rgb(var(--text-secondary))] font-bold">{log.branch}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-bold text-[rgb(var(--text-primary))]">{log.request_count}</span>
                                            <span className="text-xs text-[rgb(var(--text-tertiary))]">times</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={clsx(
                                            "px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider",
                                            getPriorityColor(log.priority)
                                        )}>
                                            {log.priority}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-medium text-[rgb(var(--text-primary))]">{format(new Date(log.last_request_at), 'MMM dd, HH:mm')}</p>
                                        <p className="text-[10px] text-[rgb(var(--text-tertiary))]">Updated {format(new Date(log.updated_at), 'MMM dd')}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={log.status}
                                                onChange={(e) => handleStatusUpdate(log.id, e.target.value as Status)}
                                                className={clsx(
                                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all outline-none border-none cursor-pointer",
                                                    getStatusColor(log.status)
                                                )}
                                            >
                                                <option value="open">Open</option>
                                                <option value="pending">Pending</option>
                                                <option value="closed">Closed</option>
                                            </select>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-[rgb(var(--text-tertiary))]">
                                        No deactivation logs found for {selectedBranch}.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
