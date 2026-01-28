import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Clock, Loader2, Calendar as CalIcon, List, Users } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from 'date-fns';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';
import { schedulesAPI } from '../services/api';

// Helper for unique staff colors
const getStaffColor = (name: string) => {
    const colors = [
        'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/40 dark:text-pink-300',
        'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300',
        'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300',
        'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-300',
        'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300',
        'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300',
        'bg-lime-100 text-lime-700 border-lime-200 dark:bg-lime-900/40 dark:text-lime-300',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

export const Schedule = () => {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'personal' | 'team'>(user?.role === 'admin' ? 'team' : 'personal');
    const [viewType, setViewType] = useState<'list' | 'month'>('month');
    const [shifts, setShifts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Calculate Date Range based on View Type
    const startDate = viewType === 'month'
        ? startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
        : startOfWeek(currentDate, { weekStartsOn: 1 });

    const endDate = viewType === 'month'
        ? endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
        : addDays(startDate, 6);

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const fetchShifts = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                start_date: format(startDate, 'yyyy-MM-dd'),
                end_date: format(endDate, 'yyyy-MM-dd'),
                ...(viewMode === 'personal' && user ? { user_id: user.id } : {})
            };
            const response = await schedulesAPI.getAll(params);
            setShifts(response.data);
        } catch (error) {
            console.error('Failed to fetch shifts:', error);
        } finally {
            setLoading(false);
        }
    }, [format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'), viewMode, user?.id]);

    useEffect(() => {
        fetchShifts();
    }, [fetchShifts]);

    const handlePrev = () => setCurrentDate(curr => viewType === 'month' ? addMonths(curr, -1) : addDays(curr, -7));
    const handleNext = () => setCurrentDate(curr => viewType === 'month' ? addMonths(curr, 1) : addDays(curr, 7));

    function addMonths(date: Date, amount: number): Date {
        const newDate = new Date(date);
        newDate.setMonth(newDate.getMonth() + amount);
        return newDate;
    }

    const getShiftsByType = (dayShifts: any[]) => {
        return {
            AM: dayShifts.filter(s => s.shift_type === 'AM'),
            PM: dayShifts.filter(s => s.shift_type === 'PM'),
            NT: dayShifts.filter(s => s.shift_type === 'NT')
        };
    };

    const getShiftBackground = (type: string) => {
        switch (type) {
            case 'AM': return 'bg-amber-50/60 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/30'; // Morning sun
            case 'PM': return 'bg-rose-50/60 dark:bg-rose-900/10 border-rose-100 dark:border-rose-800/30'; // Sunset
            case 'NT': return 'bg-indigo-50/60 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/30'; // Night
            default: return 'bg-gray-50/80 dark:bg-gray-800/50';
        }
    };

    // For Full Cell Personal View
    const getPersonalCellStyles = (shiftType?: string) => {
        if (!shiftType) return "bg-[rgb(var(--bg-secondary))]";
        switch (shiftType) {
            case 'AM': return 'bg-amber-100 dark:bg-amber-900/30 border-l-4 border-amber-500 text-amber-900 dark:text-amber-100';
            case 'PM': return 'bg-rose-100 dark:bg-rose-900/30 border-l-4 border-rose-500 text-rose-900 dark:text-rose-100';
            case 'NT': return 'bg-indigo-100 dark:bg-indigo-900/30 border-l-4 border-indigo-500 text-indigo-900 dark:text-indigo-100';
            default: return 'bg-gray-100 dark:bg-gray-800 text-gray-500';
        }
    };

    return (
        <div className="space-y-4 h-[calc(100vh-6rem)] flex flex-col max-w-[1900px] mx-auto p-2 md:p-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-[rgb(var(--text-primary))] flex items-center gap-2">
                        {viewMode === 'personal' ? 'My Schedule' : 'Team Rota'}
                        <span className="text-xs font-normal px-2 py-1 bg-[rgb(var(--bg-tertiary))] rounded-full text-[rgb(var(--text-secondary))] hidden md:inline-block">
                            {viewType === 'month' ? 'Month View' : 'List View'}
                        </span>
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    <div className="flex bg-[rgb(var(--bg-tertiary))] p-1 rounded-xl">
                        <button
                            onClick={() => setViewType('list')}
                            className={clsx(
                                "p-2 rounded-lg transition-all flex items-center gap-2",
                                viewType === 'list' ? "bg-[rgb(var(--bg-secondary))] text-[rgb(var(--accent-primary))] shadow-sm" : "text-[rgb(var(--text-secondary))]"
                            )}
                            title="List View"
                        >
                            <List size={18} />
                            <span className="text-xs font-medium md:hidden">List</span>
                        </button>
                        <button
                            onClick={() => setViewType('month')}
                            className={clsx(
                                "p-2 rounded-lg transition-all flex items-center gap-2",
                                viewType === 'month' ? "bg-[rgb(var(--bg-secondary))] text-[rgb(var(--accent-primary))] shadow-sm" : "text-[rgb(var(--text-secondary))]"
                            )}
                            title="Month View"
                        >
                            <CalIcon size={18} />
                            <span className="text-xs font-medium md:hidden">Calendar</span>
                        </button>
                    </div>

                    {user?.role !== 'admin' && (
                        <div className="flex bg-[rgb(var(--bg-tertiary))] p-1 rounded-xl">
                            <button
                                onClick={() => setViewMode('personal')}
                                className={clsx(
                                    "px-3 py-1.5 rounded-md text-xs md:text-sm font-medium transition-all",
                                    viewMode === 'personal' ? "bg-[rgb(var(--bg-secondary))] text-[rgb(var(--accent-primary))] shadow-sm" : "text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))]"
                                )}
                            >
                                My Shifts
                            </button>
                            <button
                                onClick={() => setViewMode('team')}
                                className={clsx(
                                    "px-3 py-1.5 rounded-md text-xs md:text-sm font-medium transition-all",
                                    viewMode === 'team' ? "bg-[rgb(var(--bg-secondary))] text-[rgb(var(--accent-primary))] shadow-sm" : "text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))]"
                                )}
                            >
                                Team
                            </button>
                        </div>
                    )}

                    <div className="flex items-center bg-[rgb(var(--bg-secondary))] rounded-lg border border-[rgb(var(--border-color))] p-1 shadow-sm ml-auto md:ml-0">
                        <button onClick={handlePrev} className="p-1.5 md:p-2 hover:bg-[rgb(var(--bg-tertiary))] rounded-md">
                            <ChevronLeft size={18} className="text-[rgb(var(--text-secondary))]" />
                        </button>
                        <span className="px-2 md:px-4 font-medium text-[rgb(var(--text-primary))] min-w-[100px] md:min-w-[140px] text-center text-sm md:text-base">
                            {viewType === 'month' ? format(currentDate, 'MMMM yyyy') : `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`}
                        </span>
                        <button onClick={handleNext} className="p-1.5 md:p-2 hover:bg-[rgb(var(--bg-tertiary))] rounded-md">
                            <ChevronRight size={18} className="text-[rgb(var(--text-secondary))]" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Grid Container */}
            <div className="flex-1 bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border-color))] rounded-xl overflow-hidden shadow-sm flex flex-col min-h-0 relative">
                {loading && (
                    <div className="absolute inset-0 bg-[rgb(var(--bg-secondary))]/50 backdrop-blur-[2px] z-20 flex items-center justify-center">
                        <Loader2 className="animate-spin text-[rgb(var(--accent-primary))]" size={32} />
                    </div>
                )}

                {/* MONTH VIEW */}
                {viewType === 'month' && (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                        <div className="grid grid-cols-7 border-b border-[rgb(var(--border-color))] bg-[rgb(var(--bg-tertiary))] divide-x divide-[rgb(var(--border-color))]">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                <div key={day} className="p-2 text-center text-xs md:text-sm font-semibold text-[rgb(var(--text-secondary))] uppercase tracking-wide">
                                    {day}
                                </div>
                            ))}
                        </div>

                        <div className="flex-1 grid grid-cols-7 grid-rows-5 divide-x divide-y divide-[rgb(var(--border-color))] overflow-y-auto">
                            {calendarDays.map((date) => {
                                const dayShifts = shifts.filter(s => isSameDay(new Date(s.date), date));
                                const isCurrentMonth = isSameMonth(date, currentDate);
                                const isToday = isSameDay(date, new Date());
                                const { AM, PM, NT } = getShiftsByType(dayShifts);

                                // Personal View Logic
                                if (viewMode === 'personal') {
                                    const myShift = dayShifts[0]; // Should only be 1
                                    const shiftType = myShift?.shift_type;

                                    // Find colleagues on the same shift (excluding self)
                                    const colleagues = dayShifts.filter(s =>
                                        s.shift_type === shiftType &&
                                        s.user_id !== myShift.user_id
                                    );

                                    // Format times explicitly based on shift type or fallback to data
                                    const getTimeString = (type: string, start: string, end: string) => {
                                        // Use standard display if matches known types to ensure consistency
                                        if (type === 'AM') return "7:30 AM - 3:30 PM";
                                        if (type === 'PM') return "3:30 PM - 10:30 PM";
                                        if (type === 'NT') return "10:30 PM - 7:30 AM";

                                        // Fallback parsing
                                        try {
                                            const s = format(new Date(`2000-01-01T${start}`), 'h:mm a');
                                            const e = format(new Date(`2000-01-01T${end}`), 'h:mm a');
                                            return `${s} - ${e}`;
                                        } catch (e) {
                                            return `${start.slice(0, 5)} - ${end.slice(0, 5)}`;
                                        }
                                    };

                                    return (
                                        <div key={date.toISOString()} className={clsx(
                                            "min-h-[100px] md:min-h-[160px] p-2 flex flex-col transition-all relative group border-2", // Increased min-height
                                            getPersonalCellStyles(shiftType),
                                            !isCurrentMonth && "opacity-50 grayscale",
                                            shiftType ? "border-transparent" : "border-dashed border-[rgb(var(--border-color))]"
                                        )}>
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={clsx(
                                                    "text-sm font-bold",
                                                    isToday && "underline decoration-2 underline-offset-4"
                                                )}>
                                                    {format(date, 'd')}
                                                </span>
                                                {shiftType && (
                                                    <span className="text-xs font-black opacity-60 uppercase tracking-widest bg-white/20 px-1.5 py-0.5 rounded">{shiftType}</span>
                                                )}
                                            </div>

                                            {myShift ? (
                                                <div className="flex-1 flex flex-col gap-2">
                                                    {/* Time Display */}
                                                    <div className="flex items-center gap-1.5 opacity-90 mx-auto bg-white/10 px-2 py-1 rounded-md">
                                                        <Clock size={14} />
                                                        <span className="text-xs font-semibold whitespace-nowrap">
                                                            {getTimeString(shiftType, myShift.start_time, myShift.end_time)}
                                                        </span>
                                                    </div>

                                                    {/* Colleagues Section */}
                                                    {colleagues.length > 0 && (
                                                        <div className="mt-auto pt-2 border-t border-black/5 dark:border-white/10">
                                                            <div className="text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1 flex items-center gap-1">
                                                                <Users size={10} />
                                                                On Shift With:
                                                            </div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {colleagues.map((col: any) => (
                                                                    <div
                                                                        key={col.id}
                                                                        className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-medium truncate max-w-full"
                                                                        title={col.user_name}
                                                                    >
                                                                        {col.user_name?.split(' ')[0]}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex-1 flex items-center justify-center">
                                                    <span className="text-xs text-gray-400 font-medium italic">OFF</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                // Team View Logic
                                return (
                                    <div key={date.toISOString()} className={clsx(
                                        "min-h-[100px] md:min-h-[140px] flex flex-col transition-colors relative group",
                                        isCurrentMonth ? "bg-[rgb(var(--bg-secondary))]" : "bg-[rgb(var(--bg-tertiary))]/30 opacity-60",
                                        isToday && "bg-[rgb(var(--accent-light))]/5"
                                    )}>
                                        <div className="flex items-center justify-between p-1 px-2 border-b border-[rgb(var(--border-color))]">
                                            <span className={clsx(
                                                "text-xs font-medium w-5 h-5 inline-flex items-center justify-center rounded-full",
                                                isToday
                                                    ? "bg-[rgb(var(--accent-primary))] text-white"
                                                    : "text-[rgb(var(--text-secondary))]"
                                            )}>
                                                {format(date, 'd')}
                                            </span>
                                        </div>

                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-px bg-[rgb(var(--border-color))]">
                                            {/* AM Column */}
                                            <div className={clsx("p-1 space-y-1", getShiftBackground('AM'))}>
                                                <div className="text-[9px] font-black text-center text-amber-600 dark:text-amber-400 uppercase mb-1 hidden md:block opacity-80">AM</div>
                                                {AM.map((s: any) => (
                                                    <div key={s.id} className={clsx("text-[10px] px-1.5 py-0.5 rounded border shadow-sm truncate font-medium", getStaffColor(s.user_name || ''))} title={s.user_name}>
                                                        {s.user_name?.split(' ')[0]}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* PM Column */}
                                            <div className={clsx("p-1 space-y-1", getShiftBackground('PM'))}>
                                                <div className="text-[9px] font-black text-center text-rose-600 dark:text-rose-400 uppercase mb-1 hidden md:block opacity-80">PM</div>
                                                {PM.map((s: any) => (
                                                    <div key={s.id} className={clsx("text-[10px] px-1.5 py-0.5 rounded border shadow-sm truncate font-medium", getStaffColor(s.user_name || ''))} title={s.user_name}>
                                                        {s.user_name?.split(' ')[0]}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* NT Column */}
                                            <div className={clsx("p-1 space-y-1", getShiftBackground('NT'))}>
                                                <div className="text-[9px] font-black text-center text-indigo-600 dark:text-indigo-400 uppercase mb-1 hidden md:block opacity-80">NT</div>
                                                {NT.map((s: any) => (
                                                    <div key={s.id} className={clsx("text-[10px] px-1.5 py-0.5 rounded border shadow-sm truncate font-medium", getStaffColor(s.user_name || ''))} title={s.user_name}>
                                                        {s.user_name?.split(' ')[0]}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* LIST VIEW (Legacy/Mobile) - Updated with Colors */}
                {viewType === 'list' && (
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="max-w-3xl mx-auto space-y-4">
                            {calendarDays.filter(d => isSameMonth(d, currentDate)).map(date => {
                                const dayShifts = shifts.filter(s => isSameDay(new Date(s.date), date));
                                const { AM, PM, NT } = getShiftsByType(dayShifts);

                                if (dayShifts.length === 0) return null;

                                return (
                                    <div key={date.toISOString()} className="bg-[rgb(var(--bg-primary))] rounded-xl border border-[rgb(var(--border-color))] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                        <div className={clsx("p-3 border-b border-[rgb(var(--border-color))] flex justify-between items-center bg-[rgb(var(--bg-tertiary))]")}>
                                            <div className="font-bold flex items-baseline gap-2 text-[rgb(var(--text-primary))]">
                                                <span className="text-xl">{format(date, 'd')}</span>
                                                <span className="text-sm uppercase text-[rgb(var(--text-secondary))]">{format(date, 'EEEE')}</span>
                                            </div>
                                        </div>
                                        <div className="p-3 grid gap-2">
                                            {[...AM, ...PM, ...NT].map((s: any) => (
                                                <div key={s.id} className={clsx("flex items-center justify-between p-3 rounded-lg border transition-colors",
                                                    // Use shared style logic or specific list view style
                                                    s.shift_type === 'AM' ? 'bg-amber-50/50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-800/30' :
                                                        s.shift_type === 'PM' ? 'bg-rose-50/50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-800/30' :
                                                            'bg-indigo-50/50 border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-800/30'
                                                )}>
                                                    <div className="flex items-center gap-3">
                                                        <span className={clsx(
                                                            "font-bold text-xs px-2 py-1 rounded",
                                                            s.shift_type === 'AM' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                                                                s.shift_type === 'PM' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' :
                                                                    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                                                        )}>
                                                            {s.shift_type}
                                                        </span>
                                                        <span className="font-medium text-sm text-[rgb(var(--text-primary))]">{s.user_name}</span>
                                                    </div>
                                                    <span className="text-xs text-[rgb(var(--text-secondary))] font-mono">{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
