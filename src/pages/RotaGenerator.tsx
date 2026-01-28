import { useState, useEffect, useMemo } from 'react';
import { Download, RefreshCw, AlertCircle, CheckCircle, Save, Loader2 } from 'lucide-react';
import { generateRota } from '../utils/rotaGenerator';
import type { RotaEmployee, DailySchedule, ShiftType } from '../types/rota';
import { format, startOfMonth, addMonths, endOfMonth, eachDayOfInterval } from 'date-fns';
import { clsx } from 'clsx';
import { useAuth, type User } from '../context/AuthContext';
import { schedulesAPI } from '../services/api';

export const RotaGenerator = () => {
    const { users } = useAuth();
    const [employees, setEmployees] = useState<RotaEmployee[]>([]);
    const [schedule, setSchedule] = useState<DailySchedule[]>([]);
    const [startDate, setStartDate] = useState(format(startOfMonth(addMonths(new Date(), 1)), 'yyyy-MM-dd'));
    const [generated, setGenerated] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Sync employees with users from AuthContext
    useEffect(() => {
        const staffUsers = users
            .filter((u: User) => u.role !== 'admin' && u.role !== 'supervisor') // Strict exclusion
            .map((u: User) => ({
                id: u.id,
                name: u.name,
                role: 'Support Agent', // Force role display
                avatar: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=10B981&color=fff`
            }));
        setEmployees(staffUsers);
    }, [users]);

    const handleGenerate = () => {
        if (employees.length === 0) {
            alert("No staff members found to generate a rota for.");
            return;
        }
        const start = new Date(startDate);
        const end = endOfMonth(start);
        const days = eachDayOfInterval({ start, end });

        const newSchedule = generateRota(employees, start, days.length);
        setSchedule(newSchedule);
        setGenerated(true);
        setSaveSuccess(false);
    };

    // Load existing Rota from DB on Mount/Month Change
    useEffect(() => {
        const fetchExistingRota = async () => {
            if (employees.length === 0) return;

            setSaving(true); // Reusing saving spinner state for loading
            try {
                const start = new Date(startDate);
                const end = endOfMonth(start);
                const params = {
                    start_date: format(start, 'yyyy-MM-dd'),
                    end_date: format(end, 'yyyy-MM-dd')
                };

                const response = await schedulesAPI.getAll(params);
                const existingShifts = response.data;

                if (existingShifts.length > 0) {
                    // Reconstruct DailySchedule[] from flat shifts
                    const days = eachDayOfInterval({ start, end });
                    const reconstructed: DailySchedule[] = days.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const dayShifts = existingShifts.filter((s: any) => s.date === dateStr);

                        const assignments = {
                            AM: dayShifts.filter((s: any) => s.shift_type === 'AM').map((s: any) =>
                                employees.find(e => e.id.toString() === s.user_id.toString()) || { id: s.user_id, name: s.user_name, role: 'Staff', avatar: '' }
                            ),
                            PM: dayShifts.filter((s: any) => s.shift_type === 'PM').map((s: any) =>
                                employees.find(e => e.id.toString() === s.user_id.toString()) || { id: s.user_id, name: s.user_name, role: 'Staff', avatar: '' }
                            ),
                            NT: dayShifts.filter((s: any) => s.shift_type === 'NT').map((s: any) =>
                                employees.find(e => e.id.toString() === s.user_id.toString()) || { id: s.user_id, name: s.user_name, role: 'Staff', avatar: '' }
                            ),
                            OFF: [] as RotaEmployee[] // We don't track OFF explicitly in DB, so we populate anyone NOT in assignments as OFF below
                        };

                        // Populate OFF
                        const assignedIds = new Set([...assignments.AM, ...assignments.PM, ...assignments.NT].map((e: any) => e.id.toString()));
                        assignments.OFF = employees.filter(e => !assignedIds.has(e.id.toString()));

                        return {
                            date: dateStr,
                            assignments,
                            warnings: []
                        };
                    });

                    setSchedule(reconstructed);
                    setGenerated(true);
                    setSaveSuccess(true); // It's already saved effectively
                } else {
                    // No data, reset
                    setSchedule([]);
                    setGenerated(false);
                    setSaveSuccess(false);
                }
            } catch (error) {
                console.error("Failed to load existing rota", error);
            } finally {
                setSaving(false);
            }
        };

        const timeoutId = setTimeout(() => {
            fetchExistingRota();
        }, 500); // Debounce slightly to let employees load

        return () => clearTimeout(timeoutId);

    }, [startDate, employees.length]); // Depend on employees being loaded

    const handleSave = async () => {
        if (schedule.length === 0) return;

        // Confirmation for overwrite
        if (!window.confirm("This will overwrite any existing schedule for this month. Continue?")) return;

        setSaving(true);
        setSaveSuccess(false);
        try {
            // 1. Clear existing for range
            // Get min and max date from schedule
            const dates = schedule.map(d => new Date(d.date).getTime());
            const minDate = new Date(Math.min(...dates));
            const maxDate = new Date(Math.max(...dates));

            await schedulesAPI.deleteRange({
                start_date: format(minDate, 'yyyy-MM-dd'),
                end_date: format(maxDate, 'yyyy-MM-dd')
            });

            // 2. Insert New
            const apiSchedules: any[] = [];
            schedule.forEach(day => {
                const date = day.date;
                // Helper to push schedule
                const pushShift = (list: RotaEmployee[], type: string, start: string, end: string) => {
                    list.forEach(emp => {
                        apiSchedules.push({
                            user_id: Number(emp.id),
                            date,
                            start_time: start,
                            end_time: end,
                            shift_type: type,
                            notes: 'Generated Rota'
                        });
                    });
                };

                pushShift(day.assignments.AM, 'AM', '07:30:00', '15:30:00');
                pushShift(day.assignments.PM, 'PM', '15:30:00', '22:30:00');
                pushShift(day.assignments.NT, 'NT', '22:30:00', '07:30:00');
            });

            await schedulesAPI.bulkCreate(apiSchedules);
            setSaveSuccess(true);
            alert("Monthly schedule saved to database successfully!");
        } catch (error: any) {
            console.error('Failed to save schedule:', error);
            alert("Failed to save schedule to database.");
        } finally {
            setSaving(false);
        }
    };

    const getShiftColor = (type: string) => {
        switch (type) {
            case 'AM': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900/50';
            case 'PM': return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-900/50';
            case 'NT': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-900/50';
            default: return 'bg-[rgb(var(--bg-tertiary))] text-[rgb(var(--text-tertiary))] border-[rgb(var(--border-color))]';
        }
    };

    // ------------------------------------------------------------------
    // Stats Calculations
    // ------------------------------------------------------------------
    const stats = useMemo(() => {
        const staffStats = new Map<string, { AM: number, PM: number, NT: number, OFF: number, Total: number }>();

        employees.forEach(emp => {
            staffStats.set(emp.id, { AM: 0, PM: 0, NT: 0, OFF: 0, Total: 0 });
        });

        const dailyStats = schedule.map(day => ({
            date: day.date,
            AM: day.assignments.AM.length,
            PM: day.assignments.PM.length,
            NT: day.assignments.NT.length,
            OFF: day.assignments.OFF.length
        }));

        schedule.forEach(day => {
            day.assignments.AM.forEach((e: RotaEmployee) => { const s = staffStats.get(e.id)!; s.AM++; s.Total++; });
            day.assignments.PM.forEach((e: RotaEmployee) => { const s = staffStats.get(e.id)!; s.PM++; s.Total++; });
            day.assignments.NT.forEach((e: RotaEmployee) => { const s = staffStats.get(e.id)!; s.NT++; s.Total++; });
            day.assignments.OFF.forEach((e: RotaEmployee) => { const s = staffStats.get(e.id)!; s.OFF++; });
        });

        // Calculate variance (fairness)
        const totalShifts = Array.from(staffStats.values()).map(s => s.Total);
        const minShifts = Math.min(...totalShifts);
        const maxShifts = Math.max(...totalShifts);
        const varianceOK = (maxShifts - minShifts) <= 2;

        return { staffStats, dailyStats, varianceOK, minShifts, maxShifts };
    }, [schedule, employees]);

    // ------------------------------------------------------------------
    // Interaction
    // ------------------------------------------------------------------
    const handleCellClick = (dayIndex: number, employeeId: string) => {
        const newSchedule = [...schedule];
        const day = newSchedule[dayIndex];
        const emp = employees.find(e => e.id === employeeId);
        if (!emp) return;

        // Current Shift?
        let currentType: ShiftType = 'OFF';
        if (day.assignments.AM.find(e => e.id === employeeId)) currentType = 'AM';
        else if (day.assignments.PM.find(e => e.id === employeeId)) currentType = 'PM';
        else if (day.assignments.NT.find(e => e.id === employeeId)) currentType = 'NT';

        // Cycle: OFF -> AM -> PM -> NT -> OFF
        const nextTypeMap: Record<string, ShiftType> = {
            'OFF': 'AM',
            'AM': 'PM',
            'PM': 'NT',
            'NT': 'OFF'
        };
        const nextType = nextTypeMap[currentType as string];

        // Remove from current
        if (currentType !== 'OFF') day.assignments[currentType as keyof typeof day.assignments] = (day.assignments[currentType as keyof typeof day.assignments] as RotaEmployee[]).filter(e => e.id !== employeeId);
        else day.assignments.OFF = day.assignments.OFF.filter(e => e.id !== employeeId);

        // Add to next
        if (nextType !== 'OFF') (day.assignments[nextType as keyof typeof day.assignments] as RotaEmployee[]).push(emp);
        else day.assignments.OFF.push(emp);

        setSchedule(newSchedule);
        setSaveSuccess(false);
    };

    return (
        <div className="space-y-6 max-w-[1800px] mx-auto p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))]">Rota Generator</h1>
                    <p className="text-[rgb(var(--text-secondary))]">Automated 5-2 cycle generation with fairness balancing</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border-color))] text-[rgb(var(--text-primary))] rounded-lg hover:bg-[rgb(var(--bg-tertiary))] transition-colors">
                        <Download size={18} />
                        <span>Export CSV</span>
                    </button>
                    {generated && (
                        <button
                            onClick={handleSave}
                            disabled={saving || saveSuccess}
                            className={clsx(
                                "flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all shadow-sm",
                                saveSuccess
                                    ? "bg-green-600 text-white"
                                    : "bg-[rgb(var(--accent-primary))] hover:bg-[rgb(var(--accent-hover))] text-white"
                            )}
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : saveSuccess ? <CheckCircle size={18} /> : <Save size={18} />}
                            <span>{saving ? 'Saving...' : saveSuccess ? 'Saved to DB' : 'Save to Database'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="bg-[rgb(var(--bg-secondary))] p-6 rounded-2xl border border-[rgb(var(--border-color))] shadow-sm flex flex-col md:flex-row gap-6 items-end">
                <div className="w-full md:w-64">
                    <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">Month Starting</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-4 py-2 border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-primary))] rounded-xl focus:ring-2 focus:ring-[rgb(var(--accent-primary))] outline-none"
                    />
                </div>

                <div className="flex-1">
                    <div className="flex flex-wrap gap-4 text-sm text-[rgb(var(--text-secondary))] mb-2">
                        <span className="flex items-center gap-1"><CheckCircle size={14} className="text-green-500" /> {employees.length} Staff Loaded</span>
                        <span className="flex items-center gap-1"><CheckCircle size={14} className="text-green-500" /> Pattern: 5-On 2-Off</span>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={saving}
                        className="flex items-center gap-2 bg-[rgb(var(--accent-primary))] text-white px-8 py-2.5 rounded-xl font-bold hover:bg-[rgb(var(--accent-hover))] transition-all w-full md:w-auto justify-center shadow-lg shadow-emerald-200 dark:shadow-none"
                    >
                        <RefreshCw size={20} className={generated ? "" : "animate-spin-slow"} />
                        Generate For {format(new Date(startDate), 'MMMM yyyy')}
                    </button>
                </div>
            </div>

            {/* Transposed Grid */}
            {generated && (
                <div className="bg-[rgb(var(--bg-secondary))] rounded-2xl border border-[rgb(var(--border-color))] shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="sticky left-0 z-20 bg-[rgb(var(--bg-tertiary))] p-3 text-left font-semibold text-[rgb(var(--text-primary))] border-b border-[rgb(var(--border-color))] border-r min-w-[120px]">
                                        Date
                                    </th>
                                    {employees.map(emp => (
                                        <th key={emp.id} className="p-2 text-center border-b border-[rgb(var(--border-color))] min-w-[100px] bg-[rgb(var(--bg-tertiary))]">
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 overflow-hidden shadow-sm">
                                                    <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover" />
                                                </div>
                                                <span className="text-xs font-bold text-[rgb(var(--text-primary))] truncate max-w-[90px]">{emp.name}</span>
                                            </div>
                                        </th>
                                    ))}
                                    {/* Daily Stats Column Header */}
                                    <th className="sticky right-0 z-20 bg-[rgb(var(--bg-tertiary))] p-2 border-b border-l border-[rgb(var(--border-color))] min-w-[180px]">
                                        <div className="text-xs font-bold text-[rgb(var(--text-secondary))] uppercase tracking-wider text-center">Daily Coverage</div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[rgb(var(--border-color))]">
                                {schedule.map((day, i) => (
                                    <tr key={i} className="hover:bg-[rgb(var(--bg-tertiary))]/30 transition-colors">
                                        {/* Date Row Header */}
                                        <td className="sticky left-0 z-10 bg-[rgb(var(--bg-secondary))] p-3 border-r border-[rgb(var(--border-color))] font-medium text-[rgb(var(--text-primary))]">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-sm font-bold default-nums">{format(new Date(day.date), 'dd')}</span>
                                                <span className="text-xs text-[rgb(var(--text-secondary))] uppercase">{format(new Date(day.date), 'EEE')}</span>
                                            </div>
                                        </td>

                                        {/* Staff Cells */}
                                        {employees.map(emp => {
                                            let type: ShiftType = 'OFF';
                                            if (day.assignments.AM.find(e => e.id === emp.id)) type = 'AM';
                                            else if (day.assignments.PM.find(e => e.id === emp.id)) type = 'PM';
                                            else if (day.assignments.NT.find(e => e.id === emp.id)) type = 'NT';

                                            return (
                                                <td
                                                    key={emp.id}
                                                    onClick={() => handleCellClick(i, emp.id)}
                                                    className="p-1 border-r border-[rgb(var(--border-color))] last:border-r-0 cursor-pointer hover:bg-[rgb(var(--bg-tertiary))]"
                                                >
                                                    <div className={clsx(
                                                        "text-xs font-bold py-1.5 text-center rounded transition-all select-none mx-1",
                                                        getShiftColor(type)
                                                    )}>
                                                        {type}
                                                    </div>
                                                </td>
                                            );
                                        })}

                                        {/* Daily Stats Cell */}
                                        <td className="sticky right-0 z-10 bg-[rgb(var(--bg-secondary))] p-2 border-l border-[rgb(var(--border-color))]">
                                            <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                                                <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">A:{stats.dailyStats[i].AM}</span>
                                                <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">P:{stats.dailyStats[i].PM}</span>
                                                <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">N:{stats.dailyStats[i].NT}</span>
                                                <span className="text-gray-400">O:{stats.dailyStats[i].OFF}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-[rgb(var(--bg-tertiary))] border-t-2 border-[rgb(var(--border-color))]">
                                <tr>
                                    <td className="sticky left-0 z-20 bg-[rgb(var(--bg-tertiary))] p-3 border-r border-[rgb(var(--border-color))] font-bold text-xs text-[rgb(var(--text-primary))]">
                                        TOTALS
                                    </td>
                                    {employees.map(emp => {
                                        const s = stats.staffStats.get(emp.id)!;
                                        return (
                                            <td key={emp.id} className="p-2 border-r border-[rgb(var(--border-color))] align-top">
                                                <div className="flex flex-col gap-1 text-[10px] font-mono text-center">
                                                    <div className="font-bold text-[rgb(var(--text-primary))] border-b border-gray-300 pb-1 mb-1">{s.Total} Shifts</div>
                                                    <span className="text-blue-600">AM: {s.AM}</span>
                                                    <span className="text-orange-600">PM: {s.PM}</span>
                                                    <span className="text-purple-600">NT: {s.NT}</span>
                                                    <span className="text-gray-400">OFF: {s.OFF}</span>
                                                </div>
                                            </td>
                                        );
                                    })}
                                    <td className="sticky right-0 z-20 bg-[rgb(var(--bg-tertiary))] p-2 border-l border-[rgb(var(--border-color))]">
                                        <div className="text-xs text-center">
                                            {stats.varianceOK ? (
                                                <span className="text-green-600 font-bold flex flex-col items-center">
                                                    <CheckCircle size={16} />
                                                    Balanced
                                                </span>
                                            ) : (
                                                <span className="text-red-500 font-bold flex flex-col items-center">
                                                    <AlertCircle size={16} />
                                                    Unbalanced
                                                    <span className="text-[9px] font-normal">Range: {stats.minShifts}-{stats.maxShifts}</span>
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
