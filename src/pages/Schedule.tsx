import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalIcon, List, Grid3x3 } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths } from 'date-fns';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';
import { schedulesAPI } from '../services/api';

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

export const Schedule = () => {
    const { user, selectedBranch } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'personal' | 'team'>(user?.role === 'admin' ? 'team' : 'personal');
    const [viewType, setViewType] = useState<'list' | 'month' | 'table'>('month');
    const [shifts, setShifts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Memoize Date Range based on View Type to prevent infinite loops
    const { startDate, endDate, calendarDays } = useMemo(() => {
        const start = viewType === 'month'
            ? startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
            : startOfWeek(currentDate, { weekStartsOn: 1 });

        const end = viewType === 'month'
            ? endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
            : addDays(start, 6);

        return {
            startDate: start,
            endDate: end,
            calendarDays: eachDayOfInterval({ start, end })
        };
    }, [currentDate, viewType]);

    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');

    const fetchShifts = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                start_date: startDateStr,
                end_date: endDateStr,
                branch: selectedBranch, // Always fetch branch rota to identify colleagues
                // Remove user_id filtering at API level so other users' shifts are returned
            };
            const response = await schedulesAPI.getAll(params);
            setShifts(response.data);
        } catch (error) {
            console.error('Failed to fetch shifts:', error);
        } finally {
            setLoading(false);
        }
    }, [startDateStr, endDateStr, viewMode, user?.id, selectedBranch]);

    useEffect(() => {
        fetchShifts();
    }, [fetchShifts]);

    const handlePrev = () => setCurrentDate(curr => viewType === 'month' ? addMonths(curr, -1) : addDays(curr, -7));
    const handleNext = () => setCurrentDate(curr => viewType === 'month' ? addMonths(curr, 1) : addDays(curr, 7));

    const getShiftsByType = (dayShifts: any[]) => {
        return {
            AM: dayShifts.filter(s => s.shift_type === 'AM'),
            PM: dayShifts.filter(s => s.shift_type === 'PM'),
            NT: dayShifts.filter(s => s.shift_type === 'NT')
        };
    };

    const getShiftBackground = (type: string) => {
        switch (type) {
            case 'AM': return 'bg-white dark:bg-black/20 border-l-[0.5px] border-green-500 text-[rgb(var(--text-primary))]';
            case 'PM': return 'bg-white dark:bg-black/20 border-l-[0.5px] border-red-500 text-[rgb(var(--text-primary))]';
            case 'NT': return 'bg-white dark:bg-black/20 border-l-[0.5px] border-blue-500 text-[rgb(var(--text-primary))]';
            default: return 'bg-gray-50/80 dark:bg-gray-800/50';
        }
    };

    // For Full Cell Personal View
    const getPersonalCellStyles = (shiftType?: string) => {
        if (!shiftType) return "bg-[rgb(var(--bg-secondary))]";
        switch (shiftType) {
            case 'AM': return 'bg-white dark:bg-black/10 border-l-[0.5px] border-green-500 text-[rgb(var(--text-primary))] shadow-sm';
            case 'PM': return 'bg-white dark:bg-black/10 border-l-[0.5px] border-red-500 text-[rgb(var(--text-primary))] shadow-sm';
            case 'NT': return 'bg-white dark:bg-black/10 border-l-[0.5px] border-blue-500 text-[rgb(var(--text-primary))] shadow-sm';
            default: return 'bg-gray-100 dark:bg-gray-800 text-gray-500';
        }
    };

    const downloadCSV = (content: string, filename: string) => {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportCSV = () => {
        if (shifts.length === 0) return;

        if (viewMode === 'team') {
            const uniqueStaff = Array.from(new Set(shifts.map(s => s.user_name))).sort();
            const headers = ['Date', ...uniqueStaff];
            const dates = Array.from(new Set(shifts.map(s => s.date))).sort();

            const rows = dates.map(date => {
                const dayShifts = shifts.filter(s => s.date === date);
                const staffMap = uniqueStaff.map(name => {
                    const shift = dayShifts.find(s => s.user_name === name);
                    return shift ? shift.shift_type : 'OFF';
                });
                return [date, ...staffMap];
            });

            const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            downloadCSV(csvContent, `team_rota_${selectedBranch}_${format(currentDate, 'yyyy_MM')}.csv`);
        } else {
            const headers = ['Date', 'Shift', 'Colleagues'];
            const rows = shifts.map(s => {
                const dayShifts = shifts.filter(ds => ds.date === s.date && ds.shift_type === s.shift_type && ds.user_id !== s.user_id);
                const colleagues = dayShifts.map(ds => ds.user_name).join('; ');
                return [s.date, s.shift_type, colleagues];
            });
            const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            downloadCSV(csvContent, `my_schedule_${format(currentDate, 'yyyy_MM')}.csv`);
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
                        <button
                            onClick={() => setViewType('table')}
                            className={clsx(
                                "p-2 rounded-lg transition-all flex items-center gap-2",
                                viewType === 'table' ? "bg-[rgb(var(--bg-secondary))] text-[rgb(var(--accent-primary))] shadow-sm" : "text-[rgb(var(--text-secondary))]"
                            )}
                            title="Table View"
                        >
                            <Grid3x3 size={18} />
                            <span className="text-xs font-medium md:hidden">Table</span>
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

                    <div className="flex items-center gap-2">
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

                        <button
                            onClick={handleExportCSV}
                            disabled={shifts.length === 0}
                            className="p-2 md:px-4 md:py-2 bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border-color))] text-[rgb(var(--text-primary))] rounded-lg hover:bg-[rgb(var(--bg-tertiary))] transition-colors flex items-center gap-2 disabled:opacity-50"
                            title="Export CSV"
                        >
                            <Loader2 size={18} className={loading ? "animate-spin" : "hidden"} />
                            {!loading && <CalIcon size={18} />}
                            <span className="hidden md:inline">Export CSV</span>
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
                            {calendarDays.map((date: Date) => {
                                const dayShifts = shifts.filter(s => isSameDay(new Date(s.date), date));
                                const isCurrentMonth = isSameMonth(date, currentDate);
                                const isToday = isSameDay(date, new Date());
                                const { AM, PM, NT } = getShiftsByType(dayShifts);

                                // Personal View Logic
                                if (viewMode === 'personal') {
                                    const myShift = dayShifts.find(s => String(s.user_id) === String(user?.id));
                                    const shiftType = myShift?.shift_type;
                                    // Robust colleague filter: same date, same type, different user
                                    const colleagues = shiftType
                                        ? dayShifts.filter(s => s.shift_type === shiftType && String(s.user_id) !== String(user?.id))
                                        : [];

                                    return (
                                        <div key={date.toISOString()} className={clsx(
                                            "min-h-[80px] md:min-h-[160px] p-1.5 md:p-2 flex flex-col transition-all relative group border-2 overflow-hidden",
                                            getPersonalCellStyles(shiftType),
                                            !isCurrentMonth && "opacity-40 grayscale-[50%]",
                                            shiftType ? "border-transparent" : "border-dashed border-[rgb(var(--border-color))]"
                                        )}>
                                            <div className="flex justify-between items-start mb-1 md:mb-2">
                                                <span className={clsx("text-xs md:text-sm font-bold", isToday && "underline decoration-2 underline-offset-4 font-black text-[rgb(var(--accent-primary))]")}>
                                                    {format(date, 'd')}
                                                </span>
                                                {shiftType && (
                                                    <span className="text-[8px] md:text-xs font-black opacity-60 uppercase tracking-tighter bg-white/20 px-1 py-0.5 rounded">{shiftType}</span>
                                                )}
                                            </div>

                                            {myShift ? (
                                                <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                                                    {/* Colleagues list for Personal View */}
                                                    {colleagues.length > 0 && (
                                                        <div className="flex-1 flex flex-col pt-1">
                                                            <div className="flex flex-col gap-1 md:gap-1.5">
                                                                {colleagues.slice(0, 4).map((col: any) => (
                                                                    <div key={col.id} className="text-[10px] md:text-sm bg-white/70 dark:bg-black/40 px-2 py-1 rounded-lg border border-black/10 dark:border-white/10 font-bold whitespace-normal break-words text-[rgb(var(--text-primary))] shadow-sm" title={col.user_name}>
                                                                        {col.user_name}
                                                                    </div>
                                                                ))}
                                                                {colleagues.length > 4 && (
                                                                    <span className="text-[9px] md:text-xs font-black opacity-80 px-2 py-0.5 bg-white/40 dark:bg-white/10 rounded-full self-start mt-0.5">
                                                                        +{colleagues.length - 4} more
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex-1 flex items-center justify-center">
                                                    <span className="text-[10px] md:text-xs text-gray-400 font-medium italic opacity-40">OFF</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                // Team View Logic - Calendar grid view
                                // For calendar grid view, show simplified day cells
                                return (
                                    <div key={date.toISOString()} className={clsx(
                                        "min-h-[100px] md:min-h-[140px] flex flex-col transition-colors relative group",
                                        isCurrentMonth ? "bg-[rgb(var(--bg-secondary))]" : "bg-[rgb(var(--bg-tertiary))]/30 opacity-60",
                                        isToday && "bg-[rgb(var(--accent-light))]/5"
                                    )}>
                                        <div className="flex items-center justify-between p-1 px-2 border-b border-[rgb(var(--border-color))]">
                                            <span className={clsx(
                                                "text-xs font-medium w-5 h-5 inline-flex items-center justify-center rounded-full",
                                                isToday ? "bg-[rgb(var(--accent-primary))] text-white" : "text-[rgb(var(--text-secondary))]"
                                            )}>
                                                {format(date, 'd')}
                                            </span>
                                        </div>

                                        <div className="flex-1 flex flex-wrap lg:grid lg:grid-cols-3 bg-[rgb(var(--border-color))] overflow-visible">
                                            {/* AM: Top Left (50% on mobile, 1 col on lg) */}
                                            <div className={clsx("w-1/2 lg:w-auto p-1.5 space-y-1.5 min-h-[60px] lg:min-h-auto border-r border-black/5 dark:border-white/5", getShiftBackground('AM'))}>
                                                <div className="text-[9px] font-black text-center text-green-600 dark:text-green-400 uppercase mb-1 opacity-80 border-b border-black/5 dark:border-white/5 pb-0.5">AM</div>
                                                <div className="flex flex-col gap-1">
                                                    {AM.map((s: any) => (
                                                        <div key={s.id} className={clsx("text-[10px] lg:text-xs px-2 py-1 rounded border shadow-sm font-bold whitespace-normal break-words leading-tight", getStaffColor(s.user_name || ''))} title={s.user_name}>
                                                            {s.user_name}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* PM: Top Right (50% on mobile, 1 col on lg) */}
                                            <div className={clsx("w-1/2 lg:w-auto p-1.5 space-y-1.5 min-h-[60px] lg:min-h-auto", getShiftBackground('PM'))}>
                                                <div className="text-[9px] font-black text-center text-red-600 dark:text-red-400 uppercase mb-1 opacity-80 border-b border-black/5 dark:border-white/5 pb-0.5">PM</div>
                                                <div className="flex flex-col gap-1">
                                                    {PM.map((s: any) => (
                                                        <div key={s.id} className={clsx("text-[10px] lg:text-xs px-2 py-1 rounded border shadow-sm font-bold whitespace-normal break-words leading-tight", getStaffColor(s.user_name || ''))} title={s.user_name}>
                                                            {s.user_name}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* NT: Bottom (100% on mobile, 1 col on lg) */}
                                            <div className={clsx("w-full lg:w-auto p-1.5 space-y-1.5 min-h-[60px] lg:min-h-auto border-t border-black/5 dark:border-white/5 lg:border-t-0", getShiftBackground('NT'))}>
                                                <div className="text-[9px] font-black text-center text-blue-600 dark:text-blue-400 uppercase mb-1 opacity-80 border-b border-black/5 dark:border-white/5 pb-0.5">NT</div>
                                                <div className="flex flex-col gap-1">
                                                    {NT.map((s: any) => (
                                                        <div key={s.id} className={clsx("text-[10px] lg:text-xs px-2 py-1 rounded border shadow-sm font-bold whitespace-normal break-words leading-tight", getStaffColor(s.user_name || ''))} title={s.user_name}>
                                                            {s.user_name}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* LIST VIEW */}
                {viewType === 'list' && (
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="max-w-3xl mx-auto space-y-4">
                            {calendarDays.filter((d: Date) => isSameMonth(d, currentDate)).map((date: Date) => {
                                const dayShifts = shifts.filter(s => isSameDay(new Date(s.date), date));
                                if (dayShifts.length === 0) return null;
                                const { AM, PM, NT } = getShiftsByType(dayShifts);

                                return (
                                    <div key={date.toISOString()} className="bg-[rgb(var(--bg-primary))] rounded-xl border border-[rgb(var(--border-color))] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                        <div className="p-3 border-b border-[rgb(var(--border-color))] flex justify-between items-center bg-[rgb(var(--bg-tertiary))]">
                                            <div className="font-bold flex items-baseline gap-2 text-[rgb(var(--text-primary))]">
                                                <span className="text-xl">{format(date, 'd')}</span>
                                                <span className="text-sm uppercase text-[rgb(var(--text-secondary))]">{format(date, 'EEEE')}</span>
                                            </div>
                                        </div>
                                        <div className="p-3 grid gap-2">
                                            {[...AM, ...PM, ...NT].map((s: any) => (
                                                <div key={s.id} className={clsx("flex items-center justify-between p-3 rounded-lg border transition-colors",
                                                    s.shift_type === 'AM' ? 'bg-amber-50/50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-800/30' :
                                                        s.shift_type === 'PM' ? 'bg-rose-50/50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-800/30' :
                                                            'bg-indigo-50/50 border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-800/30'
                                                )}>
                                                    <div className="flex items-center gap-3">
                                                        <span className={clsx("font-bold text-xs px-2 py-1 rounded",
                                                            s.shift_type === 'AM' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                                                                s.shift_type === 'PM' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' :
                                                                    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                                                        )}>
                                                            {s.shift_type}
                                                        </span>
                                                        <span className="font-medium text-sm text-[rgb(var(--text-primary))]">{s.user_name}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* TABLE VIEW - Admin Style */}
                {viewType === 'table' && viewMode === 'team' && (() => {
                    // Get unique staff members
                    const uniqueStaff = useMemo(() => {
                        const staffSet = new Map<string, string>();
                        shifts.forEach(s => staffSet.set(s.user_id.toString(), s.user_name));
                        return Array.from(staffSet.entries())
                            .map(([id, name]) => ({ id, name }))
                            .sort((a, b) => a.name.localeCompare(b.name));
                    }, [shifts]);

                    // Get dates for the current month
                    const monthDates = calendarDays.filter((d: Date) => isSameMonth(d, currentDate));

                    return (
                        <div className="flex-1 overflow-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr>
                                        <th className="sticky left-0 z-20 bg-[rgb(var(--bg-tertiary))] p-3 text-left font-semibold text-[rgb(var(--text-primary))] border-b border-[rgb(var(--border-color))] border-r min-w-[120px]">
                                            Date
                                        </th>
                                        {uniqueStaff.map(emp => (
                                            <th key={emp.id} className="p-2 text-center border-b border-[rgb(var(--border-color))] min-w-[100px] bg-[rgb(var(--bg-tertiary))]">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-xs font-bold text-[rgb(var(--text-primary))] truncate max-w-[90px]">{emp.name}</span>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[rgb(var(--border-color))]">
                                    {monthDates.map((date: Date) => {
                                        const dayShifts = shifts.filter(s => isSameDay(new Date(s.date), date));
                                        const isToday = isSameDay(date, new Date());

                                        return (
                                            <tr key={date.toISOString()} className="hover:bg-[rgb(var(--bg-tertiary))]/30 transition-colors">
                                                <td className="sticky left-0 z-10 bg-[rgb(var(--bg-secondary))] p-3 border-r border-[rgb(var(--border-color))] font-medium text-[rgb(var(--text-primary))]">
                                                    <div className="flex items-baseline gap-2">
                                                        <span className={clsx("text-sm font-bold default-nums", isToday && "text-[rgb(var(--accent-primary))]")}>{format(date, 'dd')}</span>
                                                        <span className="text-xs text-[rgb(var(--text-secondary))] uppercase">{format(date, 'EEE')}</span>
                                                    </div>
                                                </td>

                                                {uniqueStaff.map(emp => {
                                                    const shift = dayShifts.find(s => s.user_id.toString() === emp.id);
                                                    const type = shift?.shift_type || 'OFF';

                                                    return (
                                                        <td
                                                            key={emp.id}
                                                            className="p-1 border-r border-[rgb(var(--border-color))] last:border-r-0"
                                                        >
                                                            <div className={clsx(
                                                                "text-xs font-bold py-1.5 text-center rounded transition-all mx-1",
                                                                type === 'AM' ? 'bg-white text-green-600 border-l-[0.5px] border-green-500 font-bold' :
                                                                    type === 'PM' ? 'bg-white text-red-600 border-l-[0.5px] border-red-500 font-bold' :
                                                                        type === 'NT' ? 'bg-white text-blue-600 border-l-[0.5px] border-blue-500 font-bold' :
                                                                            'bg-gray-50 text-gray-400 border-gray-100 dark:bg-gray-800/20 dark:text-gray-500 dark:border-gray-800/50'
                                                            )}>
                                                                {type}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    );
                })()}
            </div>
        </div >
    );
};
