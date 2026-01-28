export type ShiftType = 'AM' | 'PM' | 'NT' | 'OFF';

export interface RotaEmployee {
    id: string;
    name: string;
    role: string;
    avatar?: string;
    preferredShift?: ShiftType;
}

export interface ShiftAssignment {
    date: string; // ISO Date "YYYY-MM-DD"
    employeeId: string;
    shiftType: ShiftType;
}

export interface RotaSettings {
    startDate: Date;
    daysToGenerate: number; // usually 30 or 31
    minStaff: {
        AM: number;
        PM: number;
        NT: number;
    };
}

export interface DailySchedule {
    date: string;
    assignments: {
        AM: RotaEmployee[];
        PM: RotaEmployee[];
        NT: RotaEmployee[];
        OFF: RotaEmployee[];
    };
    warnings: string[];
}
