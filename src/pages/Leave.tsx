import { useState } from 'react';
import { Plus, CheckCircle, XCircle, Clock, Calendar, FileText } from 'lucide-react';
import { clsx } from 'clsx';

type LeaveStatus = 'pending' | 'approved' | 'rejected';

interface LeaveRequest {
    id: string;
    type: 'Annual' | 'Sick' | 'Personal' | 'Unpaid';
    startDate: string;
    endDate: string;
    days: number;
    reason: string;
    status: LeaveStatus;
}

const MOCK_REQUESTS: LeaveRequest[] = [
    {
        id: '1',
        type: 'Annual',
        startDate: '2025-02-10',
        endDate: '2025-02-14',
        days: 5,
        reason: 'Family vacation',
        status: 'approved',
    },
    {
        id: '2',
        type: 'Sick',
        startDate: '2025-01-15',
        endDate: '2025-01-16',
        days: 2,
        reason: 'Flu',
        status: 'rejected',
    },
    {
        id: '3',
        type: 'Personal',
        startDate: '2025-03-01',
        endDate: '2025-03-01',
        days: 1,
        reason: 'Doctor appointment',
        status: 'pending',
    },
];

export const Leave = () => {
    const [requests] = useState<LeaveRequest[]>(MOCK_REQUESTS);
    const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'history'>('all');

    const getStatusColor = (status: LeaveStatus) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-700';
            case 'rejected': return 'bg-red-100 text-red-700';
            case 'pending': return 'bg-yellow-100 text-yellow-700';
        }
    };

    const getStatusIcon = (status: LeaveStatus) => {
        switch (status) {
            case 'approved': return <CheckCircle size={16} />;
            case 'rejected': return <XCircle size={16} />;
            case 'pending': return <Clock size={16} />;
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))]">Leave Management</h1>
                    <p className="text-[rgb(var(--text-secondary))]">Request time off and check status</p>
                </div>
                <button className="flex items-center gap-2 bg-[rgb(var(--accent-primary))] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-[rgb(var(--accent-hover))] transition-colors shadow-sm">
                    <Plus size={20} />
                    <span>New Request</span>
                </button>
            </div>

            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-[rgb(var(--accent-primary))] to-emerald-600 p-6 rounded-2xl text-white shadow-lg">
                    <p className="text-emerald-100 font-medium mb-1">Annual Leave</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">12</span>
                        <span className="text-emerald-200">/ 20 days</span>
                    </div>
                    <div className="mt-4 h-1.5 bg-emerald-900/30 rounded-full overflow-hidden">
                        <div className="h-full bg-white/90 w-[60%] rounded-full" />
                    </div>
                </div>

                <div className="bg-[rgb(var(--bg-secondary))] p-6 rounded-2xl border border-[rgb(var(--border-color))] shadow-sm">
                    <p className="text-[rgb(var(--text-secondary))] font-medium mb-1">Sick Leave</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-[rgb(var(--text-primary))]">8</span>
                        <span className="text-[rgb(var(--text-tertiary))]">/ 10 days</span>
                    </div>
                    <div className="mt-4 h-1.5 bg-[rgb(var(--bg-tertiary))] rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 w-[20%] rounded-full" />
                    </div>
                </div>

                <div className="bg-[rgb(var(--bg-secondary))] p-6 rounded-2xl border border-[rgb(var(--border-color))] shadow-sm">
                    <p className="text-[rgb(var(--text-secondary))] font-medium mb-1">Pending Requests</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-[rgb(var(--text-primary))]">1</span>
                        <span className="text-[rgb(var(--text-tertiary))]">request</span>
                    </div>
                    <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-4 flex items-center gap-1">
                        <Clock size={14} />
                        Awaiting approval
                    </p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-[rgb(var(--border-color))]">
                <nav className="flex gap-6">
                    {(['all', 'pending', 'history'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={clsx(
                                "pb-4 text-sm font-medium capitalize transition-colors relative",
                                activeTab === tab
                                    ? "text-[rgb(var(--accent-primary))] border-b-2 border-[rgb(var(--accent-primary))]"
                                    : "text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))]"
                            )}
                        >
                            {tab} Requests
                        </button>
                    ))}
                </nav>
            </div>

            {/* Requests List */}
            <div className="bg-[rgb(var(--bg-secondary))] rounded-xl shadow-sm border border-[rgb(var(--border-color))] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[rgb(var(--bg-tertiary))] text-[rgb(var(--text-secondary))] text-sm border-b border-[rgb(var(--border-color))]">
                                <th className="px-6 py-4 font-medium">Leave Type</th>
                                <th className="px-6 py-4 font-medium">Duration</th>
                                <th className="px-6 py-4 font-medium">Days</th>
                                <th className="px-6 py-4 font-medium">Reason</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgb(var(--border-color))]">
                            {requests.map((request) => (
                                <tr key={request.id} className="hover:bg-[rgb(var(--bg-tertiary))]/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-[rgb(var(--bg-tertiary))] flex items-center justify-center text-[rgb(var(--text-secondary))]">
                                                <FileText size={20} />
                                            </div>
                                            <span className="font-medium text-[rgb(var(--text-primary))]">{request.type}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-[rgb(var(--text-secondary))]">
                                            <Calendar size={16} className="text-[rgb(var(--text-tertiary))]" />
                                            <span className="text-sm">{request.startDate} - {request.endDate}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[rgb(var(--text-primary))] font-medium">{request.days} days</span>
                                    </td>
                                    <td className="px-6 py-4 text-[rgb(var(--text-secondary))] text-sm max-w-xs truncate">
                                        {request.reason}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={clsx(
                                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
                                            getStatusColor(request.status)
                                        )}>
                                            {getStatusIcon(request.status)}
                                            <span className="capitalize">{request.status}</span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-[rgb(var(--text-tertiary))] hover:text-[rgb(var(--text-secondary))] opacity-0 group-hover:opacity-100 transition-all font-medium text-sm">
                                            Details
                                        </button>
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
