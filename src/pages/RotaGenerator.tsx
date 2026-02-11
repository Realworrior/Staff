import { useState, useEffect, useMemo, useRef } from 'react';
import { Download, RefreshCw, AlertCircle, CheckCircle, Save, Loader2, Upload } from 'lucide-react';
import { generateRota } from '../utils/rotaGenerator';
import type { RotaEmployee, DailySchedule, ShiftType } from '../types/rota';
import { format, startOfMonth, addMonths, endOfMonth, eachDayOfInterval } from 'date-fns';
import { clsx } from 'clsx';
import { useAuth, type User } from '../context/AuthContext';
import { schedulesAPI } from '../services/api';

export const RotaGenerator = () => {
    const { users, selectedBranch: globalBranch } = useAuth();
    const [employees, setEmployees] = useState<RotaEmployee[]>([]);
    const [schedule, setSchedule] = useState<DailySchedule[]>([]);
    const [startDate, setStartDate] = useState(format(startOfMonth(addMonths(new Date(), 1)), 'yyyy-MM-dd'));
    const [generated, setGenerated] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadingExisting, setLoadingExisting] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState<string>(globalBranch);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync local branch when global branch changes
    useEffect(() => {
        setSelectedBranch(globalBranch);
    }, [globalBranch]);
    // Sync employees with users from AuthContext
    useEffect(() => {
        const staffUsers = users
            .filter((u: User) => u.role !== 'admin' && u.role !== 'supervisor' && u.branch === selectedBranch) // Filter by branch
            .map((u: User) => ({
                id: u.id,
                name: u.name,
                role: 'Support Agent', // Force role display
                avatar: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=10B981&color=fff`
            }));
        setEmployees(staffUsers);
    }, [users, selectedBranch]);

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

            setLoadingExisting(true);
            try {
                const start = new Date(startDate);
                const end = endOfMonth(start);
                const params = {
                    start_date: format(start, 'yyyy-MM-dd'),
                    end_date: format(end, 'yyyy-MM-dd'),
                    branch: selectedBranch
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
                setLoadingExisting(false);
            }
        };

        const timeoutId = setTimeout(() => {
            fetchExistingRota();
        }, 500); // Debounce slightly to let employees load

        return () => clearTimeout(timeoutId);

    }, [startDate, employees.length, selectedBranch]); // Depend on branch change

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
                end_date: format(maxDate, 'yyyy-MM-dd'),
                branch: selectedBranch
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
                            branch: selectedBranch,
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

    const handleExportCSV = () => {
        if (schedule.length === 0) return;

        const staffNames = employees.map(e => e.name);
        const headers = ['Date', ...staffNames, 'Coverage (A/P/N)'];

        const rows = schedule.map(day => {
            const staffAssignments = staffNames.map(name => {
                const emp = employees.find(e => e.name === name);
                if (!emp) return 'OFF';

                if (day.assignments.AM.find(e => e.id === emp.id)) return 'AM';
                if (day.assignments.PM.find(e => e.id === emp.id)) return 'PM';
                if (day.assignments.NT.find(e => e.id === emp.id)) return 'NT';
                return 'OFF';
            });

            const coverage = `${day.assignments.AM.length}/${day.assignments.PM.length}/${day.assignments.NT.length}`;
            return [day.date, ...staffAssignments, coverage];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `rota_${selectedBranch}_${format(new Date(startDate), 'yyyy_MM')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;


        // Basic validation
        if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
            alert('Please upload an Excel or CSV file (.xlsx, .xls, .csv)');
            return;
        }


        setLoadingExisting(true);
        try {
            const response = await schedulesAPI.importRota(file, selectedBranch);
            const { message, stats } = response.data;

            alert(`${message}\n\nRunning Stats:\n✨ New Users Created: ${stats.newUsers}\n📅 Shifts Generated: ${stats.shiftsCreated}`);

            // Refresh view by reloading to ensure new users are fetched in AuthContext if needed
            window.location.reload();

        } catch (error: any) {
            console.error('Import failed:', error);
            const msg = error.response?.data?.error || error.message || 'Failed to populate rota from file.';
            alert(`Import Error: ${typeof msg === 'object' ? JSON.stringify(msg) : msg}`);
        } finally {
            setLoadingExisting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const getShiftColor = (type: string) => {
        switch (type) {
            case 'AM': return 'bg-white text-green-600 border-l-[0.5px] border-green-500 font-bold';
            case 'PM': return 'bg-white text-red-600 border-l-[0.5px] border-red-500 font-bold';
            case 'NT': return 'bg-white text-blue-600 border-l-[0.5px] border-blue-500 font-bold';
            case 'OFF': return 'bg-gray-50 text-gray-400 border-gray-100 dark:bg-gray-800/20 dark:text-gray-500 dark:border-gray-800/50';
            default: return 'bg-white text-gray-400 border-gray-100';
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
            day.assignments.AM.forEach((e: RotaEmployee) => { const s = staffStats.get(e.id); if (s) { s.AM++; s.Total++; } });
            day.assignments.PM.forEach((e: RotaEmployee) => { const s = staffStats.get(e.id); if (s) { s.PM++; s.Total++; } });
            day.assignments.NT.forEach((e: RotaEmployee) => { const s = staffStats.get(e.id); if (s) { s.NT++; s.Total++; } });
            day.assignments.OFF.forEach((e: RotaEmployee) => { const s = staffStats.get(e.id); if (s) { s.OFF++; } });
        });

        // Calculate variance (fairness)
        const totalShifts = Array.from(staffStats.values()).map(s => s.Total);
        const minShifts = Math.min(...totalShifts) || 0;
        const maxShifts = Math.max(...totalShifts) || 0;
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
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept=".xlsx, .xls, .csv"
                        onChange={handleImportExcel}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border-color))] text-[rgb(var(--text-primary))] rounded-lg hover:bg-[rgb(var(--bg-tertiary))] transition-colors"
                    >
                        <Upload size={18} />
                        <span>Import Excel</span>
                    </button>
                    <button
                        onClick={handleExportCSV}
                        disabled={schedule.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border-color))] text-[rgb(var(--text-primary))] rounded-lg hover:bg-[rgb(var(--bg-tertiary))] transition-colors disabled:opacity-50"
                    >
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
                        disabled={saving || loadingExisting}
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
                                            {format(new Date(day.date), 'EEE, MMM d')}
                                        </td>
                                        {employees.map(emp => {
                                            // Determine type
                                            let type = 'OFF';
                                            if (day.assignments.AM.find(e => e.id === emp.id)) type = 'AM';
                                            else if (day.assignments.PM.find(e => e.id === emp.id)) type = 'PM';
                                            else if (day.assignments.NT.find(e => e.id === emp.id)) type = 'NT';

                                            return (
                                                <td
                                                    key={emp.id}
                                                    onClick={() => handleCellClick(i, emp.id)}
                                                    className={clsx(
                                                        "p-1 border border-transparent text-center cursor-pointer transition-all hover:brightness-95",
                                                        getShiftColor(type)
                                                    )}
                                                >
                                                    <div className="py-2 text-sm">
                                                        {type === 'OFF' ? '-' : type}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                        {/* Daily Stats Column */}
                                        <td className="sticky right-0 z-10 bg-[rgb(var(--bg-secondary))] p-2 border-l border-[rgb(var(--border-color))]">
                                            <div className="flex items-center justify-center gap-2 text-xs font-bold">
                                                <span className="text-green-600 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded">A:{day.assignments.AM.length}</span>
                                                <span className="text-red-600 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">P:{day.assignments.PM.length}</span>
                                                <span className="text-blue-600 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">N:{day.assignments.NT.length}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Summary / Stats Footer if Generated */}
            {generated && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-[rgb(var(--bg-secondary))] p-4 rounded-xl border border-[rgb(var(--border-color))] shadow-sm">
                        <h3 className="text-sm font-bold text-[rgb(var(--text-secondary))] mb-2">Shift Distribution</h3>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between"><span>AM Shifts:</span> <span className="font-bold">{stats.dailyStats.reduce((a, b) => a + b.AM, 0)}</span></div>
                            <div className="flex justify-between"><span>PM Shifts:</span> <span className="font-bold">{stats.dailyStats.reduce((a, b) => a + b.PM, 0)}</span></div>
                            <div className="flex justify-between"><span>Night Shifts:</span> <span className="font-bold">{stats.dailyStats.reduce((a, b) => a + b.NT, 0)}</span></div>
                        </div>
                    </div>
                    <div className="bg-[rgb(var(--bg-secondary))] p-4 rounded-xl border border-[rgb(var(--border-color))] shadow-sm">
                        <h3 className="text-sm font-bold text-[rgb(var(--text-secondary))] mb-2">Fairness Check</h3>
                        <div className="flex items-center gap-2 mb-2">
                            {stats.varianceOK ? <CheckCircle className="text-green-500" size={20} /> : <AlertCircle className="text-yellow-500" size={20} />}
                            <span className={stats.varianceOK ? "text-green-600 font-bold" : "text-yellow-600 font-bold"}>
                                {stats.varianceOK ? "Balanced" : "High Variance"}
                            </span>
                        </div>
                        <p className="text-xs text-[rgb(var(--text-secondary))]">
                            Min Shifts: {stats.minShifts} | Max Shifts: {stats.maxShifts}
                            <br />
                            (Target diff ≤ 2)
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
