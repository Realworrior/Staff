import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Users, Filter, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { clsx } from 'clsx';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { payrollAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface PayrollCalculation {
    userId: number;
    name: string;
    role: string;
    transportAllowance: number;
    shiftCount: number;
    totalTransport: number;
    status: 'pending' | 'paid';
}

interface PayrollRecord {
    id: number;
    user_id: number;
    user_name: string;
    start_date: string;
    end_date: string;
    total_transport: number;
    status: 'pending' | 'paid';
    paid_at: string | null;
    created_at: string;
}

export const Payroll = () => {
    const { users, selectedBranch } = useAuth();
    const [view, setView] = useState<'calculate' | 'history'>('calculate');
    const [startDate, setStartDate] = useState(format(startOfWeek(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfWeek(new Date()), 'yyyy-MM-dd'));
    const [calculations, setCalculations] = useState<PayrollCalculation[]>([]);
    const [history, setHistory] = useState<PayrollRecord[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchCalculations = useCallback(async () => {
        setLoading(true);
        try {
            const response = await payrollAPI.calculate({ startDate, endDate, branch: selectedBranch });
            setCalculations(response.data);
        } catch (err) {
            console.error('Failed to fetch calculations:', err);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, selectedBranch]);

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const response = await payrollAPI.getHistory();
            // Filter history by branch on frontend since history backend join is already there
            const filteredHistory = response.data.filter((record: any) => {
                const recordUser = users.find(u => u.id.toString() === record.user_id.toString());
                return recordUser && recordUser.branch === selectedBranch;
            });
            setHistory(filteredHistory);
        } catch (err) {
            console.error('Failed to fetch history:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedBranch, users]);

    useEffect(() => {
        if (view === 'calculate') {
            fetchCalculations();
        } else {
            fetchHistory();
        }
    }, [view, fetchCalculations, fetchHistory]);

    const handleLogAsPending = async (calc: PayrollCalculation) => {
        try {
            await payrollAPI.createRecord({
                userId: calc.userId,
                startDate,
                endDate,
                totalTransport: calc.totalTransport
            });
            alert(`Logged ${calc.name}'s transport as pending.`);
            fetchCalculations();
        } catch (err) {
            alert('Failed to log record.');
        }
    };

    const handleMarkAsPaid = async (recordId: number) => {
        try {
            await payrollAPI.updateStatus(recordId, 'paid');
            alert('Payment marked as paid (Milestone reached).');
            fetchHistory();
        } catch (err) {
            alert('Failed to update status.');
        }
    };

    const setRange = (type: 'week' | 'month' | 'lastWeek') => {
        const now = new Date();
        if (type === 'week') {
            setStartDate(format(startOfWeek(now), 'yyyy-MM-dd'));
            setEndDate(format(endOfWeek(now), 'yyyy-MM-dd'));
        } else if (type === 'month') {
            setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
            setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        } else if (type === 'lastWeek') {
            const lastWeek = subDays(now, 7);
            setStartDate(format(startOfWeek(lastWeek), 'yyyy-MM-dd'));
            setEndDate(format(endOfWeek(lastWeek), 'yyyy-MM-dd'));
        }
    };

    const totalCalculated = calculations.reduce((acc, curr) => acc + curr.totalTransport, 0);
    const paidHistoryCount = history.filter(h => h.status === 'paid').length;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))]">Payroll & Transport</h1>
                    <p className="text-[rgb(var(--text-secondary))] underline decoration-accent-primary decoration-2 underline-offset-4">
                        Office: {selectedBranch === 'betfalme' ? 'Betfalme' : 'Sofa/Safi'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-[rgb(var(--bg-secondary))] p-1 rounded-xl border border-[rgb(var(--border-color))] flex">
                        <button
                            onClick={() => setView('calculate')}
                            className={clsx(
                                "px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
                                view === 'calculate' ? "bg-[rgb(var(--accent-primary))] text-white shadow-sm" : "text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))]"
                            )}
                        >
                            Calculations
                        </button>
                        <button
                            onClick={() => setView('history')}
                            className={clsx(
                                "px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
                                view === 'history' ? "bg-[rgb(var(--accent-primary))] text-white shadow-sm" : "text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))]"
                            )}
                        >
                            History
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Filters */}
            {view === 'calculate' && (
                <div className="bg-[rgb(var(--bg-secondary))] p-4 rounded-2xl border border-[rgb(var(--border-color))] flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-[rgb(var(--text-tertiary))]" />
                        <span className="text-sm font-bold text-[rgb(var(--text-secondary))]">Filters:</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setRange('week')} className="px-3 py-1.5 bg-[rgb(var(--bg-tertiary))] rounded-lg text-xs font-bold hover:bg-[rgb(var(--border-color))]">This Week</button>
                        <button onClick={() => setRange('lastWeek')} className="px-3 py-1.5 bg-[rgb(var(--bg-tertiary))] rounded-lg text-xs font-bold hover:bg-[rgb(var(--border-color))]">Last Week</button>
                        <button onClick={() => setRange('month')} className="px-3 py-1.5 bg-[rgb(var(--bg-tertiary))] rounded-lg text-xs font-bold hover:bg-[rgb(var(--border-color))]">This Month</button>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="px-3 py-1.5 bg-[rgb(var(--bg-tertiary))] rounded-lg text-xs border border-[rgb(var(--border-color))] outline-none font-mono"
                        />
                        <span className="text-[rgb(var(--text-tertiary))] text-xs">to</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="px-3 py-1.5 bg-[rgb(var(--bg-tertiary))] rounded-lg text-xs border border-[rgb(var(--border-color))] outline-none font-mono"
                        />
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-[rgb(var(--bg-secondary))] p-6 rounded-2xl border border-[rgb(var(--border-color))] shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-[rgb(var(--text-secondary))]">Est. Transport</p>
                            <h3 className="text-2xl font-black text-[rgb(var(--text-primary))]">KES {totalCalculated.toLocaleString()}</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-[rgb(var(--bg-secondary))] p-6 rounded-2xl border border-[rgb(var(--border-color))] shadow-sm border-l-4 border-l-[rgb(var(--accent-primary))]">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-[rgb(var(--text-secondary))]">Total (Staff)</p>
                            <h3 className="text-2xl font-black text-[rgb(var(--accent-primary))]">KES {totalCalculated.toLocaleString()}</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-[rgb(var(--bg-secondary))] p-6 rounded-2xl border border-[rgb(var(--border-color))] shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-[rgb(var(--text-secondary))]">Paid Milestones</p>
                            <h3 className="text-2xl font-black text-[rgb(var(--text-primary))]">{paidHistoryCount}</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-[rgb(var(--bg-secondary))] p-6 rounded-2xl border border-[rgb(var(--border-color))] shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-[rgb(var(--text-secondary))]">Staff Eligible</p>
                            <h3 className="text-2xl font-black text-[rgb(var(--text-primary))]">{calculations.length}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Table */}
            <div className="bg-[rgb(var(--bg-secondary))] rounded-2xl shadow-sm border border-[rgb(var(--border-color))] overflow-hidden">
                <div className="p-6 border-b border-[rgb(var(--border-color))] flex justify-between items-center">
                    <h2 className="text-lg font-bold text-[rgb(var(--text-primary))]">
                        {view === 'calculate' ? `Calculation: ${format(new Date(startDate), 'MMM d')} - ${format(new Date(endDate), 'MMM d, yyyy')}` : 'Payment History'}
                    </h2>
                    {loading && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[rgb(var(--accent-primary))]" />}
                </div>

                <div className="overflow-x-auto">
                    {view === 'calculate' ? (
                        <table className="w-full text-left">
                            <thead className="bg-[rgb(var(--bg-tertiary))] text-[rgb(var(--text-secondary))] text-sm">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Employee</th>
                                    <th className="px-6 py-4 font-semibold text-right">Allowance</th>
                                    <th className="px-6 py-4 font-semibold text-right">PM/NT Shifts</th>
                                    <th className="px-6 py-4 font-semibold text-right">Total (KES)</th>
                                    <th className="px-6 py-4 font-semibold text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[rgb(var(--border-color))]">
                                {calculations.map((calc, idx) => (
                                    <tr key={idx} className="hover:bg-[rgb(var(--bg-tertiary))] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-[rgb(var(--text-primary))]">{calc.name}</span>
                                                <span className="text-xs text-[rgb(var(--text-tertiary))] capitalize">{calc.role}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-[rgb(var(--text-secondary))]">KES {calc.transportAllowance}</td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-[rgb(var(--text-primary))]">{calc.shiftCount}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm font-black font-mono">
                                                KES {calc.totalTransport.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleLogAsPending(calc)}
                                                className="px-4 py-1.5 bg-[rgb(var(--bg-tertiary))] text-[rgb(var(--accent-primary))] rounded-lg text-xs font-bold hover:bg-[rgb(var(--accent-primary))] hover:text-white transition-all"
                                            >
                                                Log as Pending
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-[rgb(var(--bg-tertiary))] text-[rgb(var(--text-secondary))] text-sm">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Employee</th>
                                    <th className="px-6 py-4 font-semibold">Period</th>
                                    <th className="px-6 py-4 font-semibold text-right">Amount</th>
                                    <th className="px-6 py-4 font-semibold text-center">Status</th>
                                    <th className="px-6 py-4 font-semibold text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[rgb(var(--border-color))]">
                                {history.map((record) => (
                                    <tr key={record.id} className="hover:bg-[rgb(var(--bg-tertiary))] transition-colors">
                                        <td className="px-6 py-4 font-bold text-[rgb(var(--text-primary))]">{record.user_name}</td>
                                        <td className="px-6 py-4 text-xs font-mono text-[rgb(var(--text-secondary))]">
                                            {format(new Date(record.start_date), 'MMM d')} - {format(new Date(record.end_date), 'MMM d')}
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-[rgb(var(--text-primary))]">KES {record.total_transport.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className={clsx(
                                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                                record.status === 'paid' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700 font-bold"
                                            )}>
                                                {record.status === 'paid' ? <CheckCircle size={10} /> : <Clock size={10} />}
                                                {record.status}
                                            </div>
                                            {record.paid_at && (
                                                <p className="text-[9px] text-[rgb(var(--text-tertiary))] mt-1">Paid on {format(new Date(record.paid_at), 'MMM d, HH:mm')}</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {record.status === 'pending' && (
                                                <button
                                                    onClick={() => handleMarkAsPaid(record.id)}
                                                    className="px-4 py-1.5 bg-[rgb(var(--accent-primary))] text-white rounded-lg text-xs font-bold hover:bg-[rgb(var(--accent-hover))] transition-all shadow-sm"
                                                >
                                                    Mark as Paid
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};
