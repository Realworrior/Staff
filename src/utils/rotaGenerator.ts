import type { RotaEmployee, ShiftType, DailySchedule } from '../types/rota';
import { addDays, format } from 'date-fns';

// ------------------------------------------------------------------
// Types & Interfaces
// ------------------------------------------------------------------

// Cycle A: Night Cycle (7 Staff) -> Covers 7 Nights
// Pattern: 5 ON, 2 OFF (Includes 1 NT)
// Sequence: AM, AM, PM, PM, NT, OFF, OFF
const NIGHT_CYCLE: ShiftType[] = ['AM', 'AM', 'PM', 'PM', 'NT', 'OFF', 'OFF'];

// Cycle B: Day Cycle (2 Staff) -> Covers gaps
// Pattern: 5 ON, 2 OFF (No Night)
// Sequence: AM, AM, PM, PM, PM, OFF, OFF (or similar balanced)
const DAY_CYCLE: ShiftType[] = ['AM', 'AM', 'AM', 'PM', 'PM', 'OFF', 'OFF'];

// ------------------------------------------------------------------
// Main Generator
// ------------------------------------------------------------------

export const generateRota = (
    employees: RotaEmployee[],
    startDate: Date,
    days: number = 30
): DailySchedule[] => {
    const schedule: DailySchedule[] = [];

    // 1. Configuration Validation
    // We need exactly 9 staff for this specific logic to work perfectly.
    // If not 9, we fall back to a generic distribution, but try to obey constraints.
    // However, the prompt implies a specific setup for these 9 staff.

    // Split staff into Night Crew (7) and Day Crew (Rest, ideally 2)
    const nightCrew = employees.slice(0, 7);
    const dayCrew = employees.slice(7);

    // 2. Generate Days
    for (let d = 0; d < days; d++) {
        const currentDate = addDays(startDate, d);
        const dateStr = format(currentDate, 'yyyy-MM-dd');

        const dayAssignments: { AM: RotaEmployee[], PM: RotaEmployee[], NT: RotaEmployee[], OFF: RotaEmployee[] } = {
            AM: [], PM: [], NT: [], OFF: []
        };
        const warnings: string[] = [];

        // Assign Night Crew (Offsets 0-6 to ensure 1 NT per day)
        nightCrew.forEach((emp, index) => {
            // Actually, to get exactly 1 NT every day with 7 staff on 7-day cycle:
            // Staff 0 needs to be NT on Day 0? No.
            // Staff 0: Cycle Day X.
            // Staff 1: Cycle Day X+1...
            // If we have 7 staff, and each has 1 NT in 7 days, and they are offset by 1 day each,
            // Then exactly 1 staff is on NT each day.

            const cycleDay = (d + index) % 7;
            const shift = NIGHT_CYCLE[cycleDay];

            switch (shift) {
                case 'AM': dayAssignments.AM.push(emp); break;
                case 'PM': dayAssignments.PM.push(emp); break;
                case 'NT': dayAssignments.NT.push(emp); break;
                default: dayAssignments.OFF.push(emp); break;
            }
        });

        // Assign Day Crew (Fill gaps)
        // We use a 7-day offset too? Or just rotating 5-2.
        // Let's just use the DAY_CYCLE with offsets to avoid them fully overlapping being OFF together if possible.
        dayCrew.forEach((emp, index) => {
            const offset = (index * 3) % 7; // Spacing
            const cycleDay = (d + offset) % 7;
            const shift = DAY_CYCLE[cycleDay];

            switch (shift) {
                case 'AM': dayAssignments.AM.push(emp); break;
                case 'PM': dayAssignments.PM.push(emp); break;
                case 'NT': dayAssignments.NT.push(emp); break;
                default: dayAssignments.OFF.push(emp); break;
            }
        });

        // Validation Checks
        if (dayAssignments.NT.length !== 1) warnings.push(`Strict NT Violation: ${dayAssignments.NT.length} Staff`);
        if (dayAssignments.AM.length > 3) warnings.push("AM Overstaffed (>3)");
        if (dayAssignments.PM.length > 3) warnings.push("PM Overstaffed (>3)");
        // Note: Min 2 is "should", Max 3 is "must". 

        schedule.push({
            date: dateStr,
            assignments: dayAssignments,
            warnings
        });
    }

    return schedule;
};
