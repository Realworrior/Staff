import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAttendance } from '../context/AttendanceContext';
import { Clock, Calendar, CheckCircle, PlayCircle, ArrowRight, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { schedulesAPI } from '../services/api';
import { clsx } from 'clsx';
import { format, addDays } from 'date-fns';

// Helper for unique staff colors - minimalist border-only style
const getStaffColor = (name: string) => {
    const colors = [
        'border-fuchsia-500/50 text-fuchsia-700 dark:text-fuchsia-300 bg-fuchsia-50/30 dark:bg-fuchsia-900/10',
        'border-emerald-500/50 text-emerald-700 dark:text-emerald-300 bg-emerald-50/30 dark:bg-emerald-900/10',
        'border-sky-500/50 text-sky-700 dark:text-sky-300 bg-sky-50/30 dark:bg-sky-900/10',
        'border-orange-500/50 text-orange-700 dark:text-orange-300 bg-orange-50/30 dark:bg-orange-900/10',
        'border-violet-500/50 text-violet-700 dark:text-violet-300 bg-violet-50/30 dark:bg-violet-900/10',
        'border-rose-500/50 text-rose-700 dark:text-rose-300 bg-rose-50/30 dark:bg-rose-900/10',
        'border-amber-500/50 text-amber-700 dark:text-amber-300 bg-amber-50/30 dark:bg-amber-900/10',
        'border-blue-500/50 text-blue-700 dark:text-blue-300 bg-blue-50/30 dark:bg-blue-900/10',
        'border-teal-500/50 text-teal-700 dark:text-teal-300 bg-teal-50/30 dark:bg-teal-900/10',
        'border-indigo-500/50 text-indigo-700 dark:text-indigo-300 bg-indigo-50/30 dark:bg-indigo-900/10',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

export const Dashboard = () => {
    const { user, selectedBranch } = useAuth();
    const { isCheckedIn, clockIn, clockOut, currentSession, loading, summary, isWithinRange, refreshData } = useAttendance();
    const navigate = useNavigate();
    const [upcomingShifts, setUpcomingShifts] = useState<any[]>([]);
    const [loadingShift, setLoadingShift] = useState(false);

    const isAdmin = user?.role === 'admin';

    const handleQuickAction = async () => {
        if (isCheckedIn) await clockOut();
        else {
            if (!isWithinRange) {
                alert("You must be within 20m of the office to clock in.");
                navigate('/attendance');
                return;
            }
            await clockIn();
        }
    };

    // Refresh attendance summary when branch changes
    useEffect(() => {
        if (isAdmin) {
            refreshData();
        }
    }, [selectedBranch, isAdmin, refreshData]);

    useEffect(() => {
        if (!isAdmin && user) {
            const fetchUpcomingWeek = async () => {
                setLoadingShift(true);
                try {
                    const start = new Date();
                    const end = addDays(start, 10); // Fetch a bit more to ensure 7 shifts

                    const response = await schedulesAPI.getAll({
                        start_date: format(start, 'yyyy-MM-dd'),
                        end_date: format(end, 'yyyy-MM-dd'),
                        branch: selectedBranch
                    });

                    const allShifts = Array.isArray(response.data) ? response.data : [];

                    const myShifts = allShifts
                        .filter((s: any) => s.user_id?.toString() === user?.id?.toString())
                        .map((shift: any) => {
                            const colleagues = allShifts.filter((s: any) =>
                                s.date === shift.date &&
                                s.shift_type === shift.shift_type &&
                                s.user_id?.toString() !== user?.id?.toString()
                            );

                            return {
                                ...shift,
                                colleagues
                            };
                        })
                        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

                    setUpcomingShifts(myShifts);
                } catch (err) {
                    console.error('Failed to fetch upcoming shifts:', err);
                } finally {
                    setLoadingShift(false);
                }
            };
            fetchUpcomingWeek();
        }
    }, [isAdmin, user, selectedBranch]);

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-[rgb(var(--text-primary))]">
                        Welcome back, {user?.name?.split(' ')[0] || 'User'}!
                    </h1>
                    <p className="text-[rgb(var(--text-secondary))] mt-1">
                        Here's your overview for <span className="font-medium text-[rgb(var(--accent-primary))]">{format(new Date(), 'EEEE, MMMM do')}</span> at <span className="underline decoration-accent-primary underline-offset-4">{selectedBranch === 'betfalme' ? 'Betfalme' : 'Sofa/Safi'}</span>.
                    </p>
                </div>
                {!isAdmin && (
                    <div className="flex items-center gap-2">
                        <span className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 ${isCheckedIn ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-[rgb(var(--bg-tertiary))] text-[rgb(var(--text-secondary))] font-medium'}`}>
                            <div className={`w-2 h-2 rounded-full ${isCheckedIn ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                            {isCheckedIn ? 'Currently On Shift' : 'Off Duty'}
                        </span>
                    </div>
                )}
            </div>

            {/* Admin Stats Grid */}
            {isAdmin ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    <div className="bg-[rgb(var(--bg-secondary))] p-4 md:p-6 rounded-2xl shadow-sm border border-[rgb(var(--border-color))]">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                                <Users size={24} />
                            </div>
                            <span className="text-sm font-semibold text-[rgb(var(--text-secondary))]">Workforce</span>
                        </div>
                        <p className="text-3xl font-bold text-[rgb(var(--text-primary))]">{summary?.totalStaff || 0}</p>
                        <p className="text-xs text-[rgb(var(--text-tertiary))] mt-1">Active Staff Members ({selectedBranch})</p>
                    </div>

                    <div className="bg-[rgb(var(--bg-secondary))] p-4 md:p-6 rounded-2xl shadow-sm border border-[rgb(var(--border-color))]">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400">
                                <PlayCircle size={24} />
                            </div>
                            <span className="text-sm font-semibold text-[rgb(var(--text-secondary))]">Attendance Today</span>
                        </div>
                        <p className="text-3xl font-bold text-[rgb(var(--text-primary))]">{summary?.presentToday || 0}</p>
                        <p className="text-xs text-[rgb(var(--text-tertiary))] mt-1">Currently Clocked In</p>
                    </div>

                    <div className="bg-[rgb(var(--bg-secondary))] p-4 md:p-6 rounded-2xl shadow-sm border border-[rgb(var(--border-color))]">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 bg-[rgb(var(--accent-light))] rounded-xl text-[rgb(var(--accent-primary))]">
                                <TrendingUp size={24} />
                            </div>
                            <span className="text-sm font-semibold text-[rgb(var(--text-secondary))]">Efficiency</span>
                        </div>
                        <p className="text-3xl font-bold text-[rgb(var(--text-primary))]">{summary?.avgHoursWorked || '0.00'}</p>
                        <p className="text-xs text-[rgb(var(--text-tertiary))] mt-1">Avg. Hours per Staff</p>
                    </div>

                    <div className="bg-[rgb(var(--bg-secondary))] p-4 md:p-6 rounded-2xl shadow-sm border border-[rgb(var(--border-color))]">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-xl text-red-600 dark:text-red-400">
                                <AlertCircle size={24} />
                            </div>
                            <span className="text-sm font-semibold text-[rgb(var(--text-secondary))]">Punctuality Issues</span>
                        </div>
                        <p className="text-3xl font-bold text-[rgb(var(--text-primary))]">{summary?.lateArrivals || 0}</p>
                        <p className="text-xs text-[rgb(var(--text-tertiary))] mt-1">Lates in the last 30 days</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    {/* Staff Attendance Card */}
                    <div className="bg-[rgb(var(--bg-secondary))] p-4 md:p-6 rounded-2xl shadow-sm border border-[rgb(var(--border-color))] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Clock size={64} className="text-[rgb(var(--accent-primary))]" />
                        </div>
                        <h3 className="text-[rgb(var(--text-secondary))] text-sm font-semibold mb-1 uppercase tracking-wider">Attendance Status</h3>
                        <div className="mt-4">
                            {isCheckedIn ? (
                                <div>
                                    <p className="text-3xl font-bold text-[rgb(var(--text-primary))]">{currentSession?.clockIn}</p>
                                    <p className="text-sm text-green-600 dark:text-green-400 font-bold flex items-center gap-1 mt-2">
                                        <CheckCircle size={16} /> Active Since Morning
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm text-[rgb(var(--text-secondary))] mb-4 leading-relaxed">You are currently clocked out. Remember to clock in when you arrive at the office.</p>
                                    <button
                                        onClick={handleQuickAction}
                                        disabled={loading}
                                        className="flex items-center gap-2 bg-[rgb(var(--accent-primary))] text-white px-5 py-2 rounded-xl font-bold hover:bg-[rgb(var(--accent-hover))] transition-all disabled:opacity-50"
                                    >
                                        <PlayCircle size={20} />
                                        Clock In Now
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Monthly Roster Quick Access */}
                    <div className="bg-[rgb(var(--bg-secondary))] p-4 md:p-6 rounded-2xl shadow-sm border border-[rgb(var(--border-color))] relative overflow-hidden group flex flex-col justify-between">
                        <div className="absolute -top-4 -right-4 w-32 h-32 bg-emerald-500/5 rounded-full -z-0" />
                        <div className="relative z-10">
                            <h3 className="text-[rgb(var(--text-secondary))] text-sm font-semibold mb-1 uppercase tracking-wider">Monthly Roster</h3>
                            <p className="text-sm text-[rgb(var(--text-secondary))] mt-3 leading-relaxed">
                                Access the complete staff schedule and coverage plan for {selectedBranch === 'betfalme' ? 'Betfalme' : 'Sofa/Safi'} Office.
                            </p>
                        </div>

                        <button
                            onClick={() => navigate('/schedule')}
                            className="relative z-10 mt-6 flex items-center justify-center gap-2 w-full py-3 bg-[rgb(var(--bg-tertiary))] text-[rgb(var(--accent-primary))] font-bold rounded-xl hover:bg-[rgb(var(--border-color))] transition-all border border-transparent hover:border-[rgb(var(--border-color))]"
                        >
                            <Calendar size={18} />
                            Explore Full Schedule
                            <ArrowRight size={18} />
                        </button>
                    </div>

                    {/* Quick Links Card */}
                    <div className="bg-[rgb(var(--bg-secondary))] p-4 md:p-6 rounded-2xl shadow-sm border border-[rgb(var(--border-color))] flex flex-col justify-center gap-3">
                        <button
                            onClick={() => navigate('/leave')}
                            className="w-full text-left px-4 py-3.5 rounded-xl bg-[rgb(var(--bg-tertiary))] hover:bg-[rgb(var(--border-color))] transition-all flex items-center justify-between group border border-transparent hover:border-[rgb(var(--border-color))]"
                        >
                            <span className="font-semibold text-[rgb(var(--text-primary))]">Request Time Off</span>
                            <ArrowRight size={18} className="text-[rgb(var(--text-tertiary))] group-hover:text-[rgb(var(--accent-primary))] transition-colors" />
                        </button>
                        <button
                            onClick={() => navigate('/kb')}
                            className="w-full text-left px-4 py-3.5 rounded-xl bg-[rgb(var(--bg-tertiary))] hover:bg-[rgb(var(--border-color))] transition-all flex items-center justify-between group border border-transparent hover:border-[rgb(var(--border-color))]"
                        >
                            <span className="font-semibold text-[rgb(var(--text-primary))]">Knowledge Base</span>
                            <ArrowRight size={18} className="text-[rgb(var(--text-tertiary))] group-hover:text-[rgb(var(--accent-primary))] transition-colors" />
                        </button>
                    </div>
                </div>
            )}

            {/* UPCOMING SHIFTS TRAIN CART VIEW (Rolling 7-Day) */}
            {!isAdmin && (
                <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border-color))] rounded-3xl p-6 md:p-8 shadow-sm flex flex-col overflow-hidden relative">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[rgb(var(--accent-light))] rounded-xl text-[rgb(var(--accent-primary))]">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-[rgb(var(--text-primary))]">Shift Journey</h3>
                                <p className="text-xs text-[rgb(var(--text-secondary))]">Your next 7 upcoming shifts ({selectedBranch})</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/schedule')}
                            className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--accent-primary))] hover:underline flex items-center gap-1"
                        >
                            Full Schedule <ArrowRight size={14} />
                        </button>
                    </div>

                    <div className="relative">
                        {/* The "Track" */}
                        <div className="absolute top-1/2 left-0 right-0 h-1 bg-[rgb(var(--border-color))] -translate-y-1/2 z-0 hidden md:block" />

                        <div className="flex flex-nowrap gap-4 overflow-x-auto pb-4 custom-scrollbar relative z-10">
                            {loadingShift ? (
                                Array(7).fill(0).map((_, i) => (
                                    <div key={i} className="min-w-[240px] h-48 bg-[rgb(var(--bg-tertiary))] animate-pulse rounded-2xl border border-[rgb(var(--border-color))]" />
                                ))
                            ) : upcomingShifts.length > 0 ? (
                                upcomingShifts.slice(0, 7).map((shift: any, idx: number) => (
                                    <div key={idx} className="flex items-center shrink-0">
                                        {/* Train Cart */}
                                        <div className={clsx(
                                            "min-w-[260px] p-5 rounded-2xl border-t-0 border-l-[0.5px] shadow-md flex flex-col gap-4 transition-transform hover:scale-[1.02] bg-white dark:bg-white/5",
                                            shift.shift_type === 'AM' ? 'border-green-500' :
                                                shift.shift_type === 'PM' ? 'border-red-500' :
                                                    'border-blue-500'
                                        )}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-xs font-black uppercase tracking-widest opacity-60 text-[rgb(var(--text-primary))]">{format(new Date(shift.date), 'EEEE')}</p>
                                                    <h4 className="text-xl font-extrabold text-[rgb(var(--text-primary))]">{format(new Date(shift.date), 'MMM do')}</h4>
                                                </div>
                                                <span className={clsx(
                                                    "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-gray-100 dark:bg-white/10 text-[rgb(var(--text-primary))]"
                                                )}>
                                                    {shift.shift_type}
                                                </span>
                                            </div>

                                            <div className="h-2" /> {/* Spacer */}

                                            {/* Colleagues */}
                                            {shift.colleagues.length > 0 && (
                                                <div className="mt-auto pt-2 border-t border-[rgb(var(--border-color))]">
                                                    <div className="flex flex-wrap gap-1">
                                                        {shift.colleagues.map((col: any) => (
                                                            <div key={col.id} className={clsx("flex items-center gap-1.5 px-2 py-1 rounded-lg border shadow-sm", getStaffColor(col.user_name || ''))} title={col.user_name}>
                                                                <span className="text-[10px] font-bold truncate max-w-[80px]">
                                                                    {col.user_name}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Coupler (visual link) */}
                                        {idx < Math.min(upcomingShifts.length, 7) - 1 && (
                                            <div className="hidden md:flex flex-col items-center px-1">
                                                <div className="w-4 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full shadow-sm" />
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="w-full flex flex-col items-center justify-center py-12 opacity-50">
                                    <Calendar size={48} className="mb-4 text-[rgb(var(--accent-primary))]" />
                                    <p className="font-bold text-[rgb(var(--text-primary))]">No upcoming shifts scheduled</p>
                                    <p className="text-sm">Enjoy your time off!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
