import { useAttendance } from '../context/AttendanceContext';
import { useAuth } from '../context/AuthContext';
import { Clock, MapPin, Calendar, PlayCircle, StopCircle, History, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';

export const Attendance = () => {
    const { user, selectedBranch, users } = useAuth();
    const {
        isCheckedIn,
        clockIn,
        clockOut,
        records,
        allStaffRecords,
        loading,
        currentSession,
        distanceToOffice,
        isWithinRange,
        summary
    } = useAttendance();

    const isAdmin = user?.role === 'admin';

    const handleToggle = async () => {
        if (isAdmin) return;
        if (isCheckedIn) {
            await clockOut();
        } else {
            //@ts-ignore - we already check withinRange in clockIn if needed
            await clockIn();
        }
    };

    if (isAdmin) {
        // Filter records for the selected branch
        const filteredRecords = allStaffRecords.filter(record => {
            const recordUser = users.find(u => u.name === record.userName);
            return recordUser && recordUser.branch === selectedBranch;
        });

        return (
            <div className="space-y-6 max-w-6xl mx-auto">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))]">Attendance Overview</h1>
                        <p className="text-[rgb(var(--text-secondary))] underline decoration-accent-primary decoration-2 underline-offset-4">
                            Office: {selectedBranch === 'betfalme' ? 'Betfalme' : 'Sofa/Safi'}
                        </p>
                    </div>
                </div>

                {/* Admin Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-[rgb(var(--bg-secondary))] p-6 rounded-2xl shadow-sm border border-[rgb(var(--border-color))]">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                                <Users size={24} />
                            </div>
                            <span className="text-sm font-medium text-[rgb(var(--text-secondary))]">Total Staff</span>
                        </div>
                        <p className="text-3xl font-bold text-[rgb(var(--text-primary))]">{summary?.totalStaff || 0}</p>
                    </div>

                    <div className="bg-[rgb(var(--bg-secondary))] p-6 rounded-2xl shadow-sm border border-[rgb(var(--border-color))]">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400">
                                <PlayCircle size={24} />
                            </div>
                            <span className="text-sm font-medium text-[rgb(var(--text-secondary))]">Present Today</span>
                        </div>
                        <p className="text-3xl font-bold text-[rgb(var(--text-primary))]">{summary?.presentToday || 0}</p>
                    </div>

                    <div className="bg-[rgb(var(--bg-secondary))] p-6 rounded-2xl shadow-sm border border-[rgb(var(--border-color))]">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-[rgb(var(--accent-primary))]">
                                <TrendingUp size={24} />
                            </div>
                            <span className="text-sm font-medium text-[rgb(var(--text-secondary))]">Avg Hours</span>
                        </div>
                        <p className="text-3xl font-bold text-[rgb(var(--text-primary))]">{summary?.avgHoursWorked || '0.00'}h</p>
                    </div>

                    <div className="bg-[rgb(var(--bg-secondary))] p-6 rounded-2xl shadow-sm border border-[rgb(var(--border-color))]">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-xl text-red-600 dark:text-red-400">
                                <AlertCircle size={24} />
                            </div>
                            <span className="text-sm font-medium text-[rgb(var(--text-secondary))]">Late (30d)</span>
                        </div>
                        <p className="text-3xl font-bold text-[rgb(var(--text-primary))]">{summary?.lateArrivals || 0}</p>
                    </div>
                </div>

                {/* Staff Attendance Table */}
                <div className="bg-[rgb(var(--bg-secondary))] rounded-2xl shadow-sm border border-[rgb(var(--border-color))] overflow-hidden">
                    <div className="p-6 border-b border-[rgb(var(--border-color))] flex items-center justify-between">
                        <h3 className="font-semibold text-[rgb(var(--text-primary))]">Recent Staff Activity ({selectedBranch})</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[rgb(var(--bg-tertiary))] text-[rgb(var(--text-secondary))] text-sm">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Employee</th>
                                    <th className="px-6 py-4 font-medium">Date</th>
                                    <th className="px-6 py-4 font-medium">Clock In</th>
                                    <th className="px-6 py-4 font-medium">Clock Out</th>
                                    <th className="px-6 py-4 font-medium">Location</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[rgb(var(--border-color))]">
                                {filteredRecords.map((record) => (
                                    <tr key={record.id} className="hover:bg-[rgb(var(--bg-tertiary))] transition-colors">
                                        <td className="px-6 py-4 font-medium text-[rgb(var(--text-primary))]">{record.userName}</td>
                                        <td className="px-6 py-4 text-[rgb(var(--text-secondary))]">{record.date}</td>
                                        <td className="px-6 py-4 text-[rgb(var(--text-secondary))]">{record.clockIn}</td>
                                        <td className="px-6 py-4 text-[rgb(var(--text-secondary))]">{record.clockOut || '-'}</td>
                                        <td className="px-6 py-4 text-[rgb(var(--text-secondary))] text-sm">{record.location}</td>
                                        <td className="px-6 py-4">
                                            <span className={clsx(
                                                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                                                record.status === 'present' ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                            )}>
                                                {record.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))]">Time & Attendance</h1>
                    <p className="text-[rgb(var(--text-secondary))]">Manage your daily work hours and timesheets</p>
                </div>
                <div className="text-right hidden md:block">
                    <p className="text-2xl font-mono font-medium text-[rgb(var(--text-primary))]">
                        {format(new Date(), 'HH:mm:ss')}
                    </p>
                    <p className="text-sm text-[rgb(var(--text-secondary))]">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
                </div>
            </div>

            {/* Main Status Card */}
            <div className="bg-[rgb(var(--bg-secondary))] rounded-2xl shadow-sm border border-[rgb(var(--border-color))] p-8">
                <div className="flex flex-col items-center justify-center text-center space-y-6">

                    <div className={clsx(
                        "w-32 h-32 rounded-full flex items-center justify-center border-4 transition-all duration-500",
                        isCheckedIn ? "border-green-100 bg-green-50 dark:border-green-900/50 dark:bg-green-900/20" : "border-[rgb(var(--border-color))] bg-[rgb(var(--bg-tertiary))]"
                    )}>
                        <Clock size={48} className={isCheckedIn ? "text-green-600 dark:text-green-400" : "text-[rgb(var(--text-tertiary))]"} />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))]">
                            {isCheckedIn ? "You are clocked in" : "You are clocked out"}
                        </h2>
                        <p className="text-[rgb(var(--text-secondary))]">
                            {isCheckedIn
                                ? `Started at ${currentSession?.clockIn}`
                                : "Good morning! Ready to start your day?"}
                        </p>
                    </div>

                    <button
                        onClick={handleToggle}
                        disabled={loading || (!isWithinRange && !isCheckedIn)}
                        className={clsx(
                            "flex items-center gap-3 px-8 py-4 rounded-full font-semibold text-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg",
                            isCheckedIn
                                ? "bg-red-500 hover:bg-red-600 text-white shadow-red-200 dark:shadow-red-900/50"
                                : "bg-[rgb(var(--accent-primary))] hover:bg-[rgb(var(--accent-hover))] text-white",
                            (loading || (!isWithinRange && !isCheckedIn)) && "opacity-75 cursor-not-allowed transform-none scale-100"
                        )}
                    >
                        {loading ? (
                            <span>Processing...</span>
                        ) : isCheckedIn ? (
                            <>
                                <StopCircle size={24} />
                                Clock Out
                            </>
                        ) : (
                            <>
                                <PlayCircle size={24} />
                                Clock In
                            </>
                        )}
                    </button>

                    {isCheckedIn && (
                        <div className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))] bg-[rgb(var(--bg-tertiary))] px-4 py-2 rounded-full">
                            <MapPin size={16} />
                            <span>{currentSession?.location || "Locating..."}</span>
                        </div>
                    )}

                    {!isCheckedIn && (
                        <div className={clsx(
                            "flex items-center gap-2 text-sm px-4 py-2 rounded-full",
                            isWithinRange ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        )}>
                            <MapPin size={16} />
                            <span>
                                {distanceToOffice !== null
                                    ? `${Math.round(distanceToOffice)}m from Office`
                                    : "Acquiring Location..."}
                            </span>
                        </div>
                    )}

                    {!isWithinRange && distanceToOffice !== null && !isCheckedIn && (
                        <p className="text-xs text-red-500 dark:text-red-400 max-w-xs">
                            You must be within 20m of the office to clock in.
                        </p>
                    )}
                </div>
            </div>

            {/* History Table */}
            <div className="bg-[rgb(var(--bg-secondary))] rounded-xl shadow-sm border border-[rgb(var(--border-color))] flex flex-col">
                <div className="p-6 border-b border-[rgb(var(--border-color))] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <History className="text-[rgb(var(--accent-primary))]" size={20} />
                        <h3 className="font-semibold text-[rgb(var(--text-primary))]">My Attendance History</h3>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[rgb(var(--bg-tertiary))] text-[rgb(var(--text-secondary))] text-sm">
                                <th className="px-6 py-3 font-medium">Date</th>
                                <th className="px-6 py-3 font-medium">Clock In</th>
                                <th className="px-6 py-3 font-medium">Clock Out</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgb(var(--border-color))]">
                            {records.map((record) => (
                                <tr key={record.id} className="hover:bg-[rgb(var(--bg-tertiary))] transition-colors">
                                    <td className="px-6 py-4 flex items-center gap-3">
                                        <div className="bg-[rgb(var(--accent-light))] p-2 rounded-lg text-[rgb(var(--accent-primary))]">
                                            <Calendar size={16} />
                                        </div>
                                        <span className="text-[rgb(var(--text-primary))] font-medium">{record.date}</span>
                                    </td>
                                    <td className="px-6 py-4 text-[rgb(var(--text-secondary))]">{record.clockIn}</td>
                                    <td className="px-6 py-4 text-[rgb(var(--text-secondary))]">
                                        {record.clockOut || <span className="text-green-600 dark:text-green-400 italic">Active</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                            {record.status}
                                        </span>
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
