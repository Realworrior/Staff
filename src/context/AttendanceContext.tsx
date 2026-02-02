import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { attendanceAPI } from '../services/api';

export interface AttendanceRecord {
    id: string;
    userId: string;
    date: string;
    clockIn: string;
    clockOut: string | null;
    location: string;
    latitude?: number;
    longitude?: number;
    status: 'present' | 'absent' | 'late' | 'half-day';
    userName?: string;
    userRole?: string;
}

const DEFAULT_OFFICE = { lat: 40.785091, lng: -73.968285 };

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

interface AttendanceSummary {
    totalStaff: number;
    presentToday: number;
    avgHoursWorked: string;
    lateArrivals: number;
}

interface AttendanceContextType {
    records: AttendanceRecord[];
    allStaffRecords: AttendanceRecord[];
    isCheckedIn: boolean;
    currentSession: AttendanceRecord | null;
    clockIn: () => Promise<boolean>;
    clockOut: () => Promise<boolean>;
    loading: boolean;
    userLocation: { lat: number; lng: number } | null;
    distanceToOffice: number | null;
    isWithinRange: boolean;
    officeLocation: { lat: number; lng: number };
    updateOfficeLocation: (lat: number, lng: number) => void;
    summary: AttendanceSummary | null;
    refreshData: () => Promise<void>;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export const useAttendance = () => {
    const context = useContext(AttendanceContext);
    if (!context) throw new Error('useAttendance must be used within an AttendanceProvider');
    return context;
};

export const AttendanceProvider = ({ children }: { children: ReactNode }) => {
    const { user, selectedBranch } = useAuth();
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [allStaffRecords, setAllStaffRecords] = useState<AttendanceRecord[]>([]);
    const [summary, setSummary] = useState<AttendanceSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [distanceToOffice, setDistanceToOffice] = useState<number | null>(null);
    const [officeLocation, setOfficeLocation] = useState<{ lat: number, lng: number }>(() => {
        const saved = localStorage.getItem('officeLocation');
        return saved ? JSON.parse(saved) : DEFAULT_OFFICE;
    });

    const mapRecord = (apiRecord: any): AttendanceRecord => ({
        id: apiRecord.id.toString(),
        userId: apiRecord.user_id.toString(),
        date: apiRecord.date,
        clockIn: apiRecord.clock_in,
        clockOut: apiRecord.clock_out,
        location: apiRecord.location,
        latitude: apiRecord.latitude,
        longitude: apiRecord.longitude,
        status: apiRecord.status,
        userName: apiRecord.user_name,
        userRole: apiRecord.user_role
    });

    const refreshData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            if (user.role === 'admin') {
                const params = { branch: selectedBranch };
                const [allRes, summRes] = await Promise.all([
                    attendanceAPI.getAll(params),
                    attendanceAPI.getSummary(params)
                ]);
                setAllStaffRecords(allRes.data.map(mapRecord));
                setSummary(summRes.data);
            } else {
                const res = await attendanceAPI.getMyRecords();
                setRecords(res.data.map(mapRecord));
            }
        } catch (error) {
            console.error('Failed to fetch attendance data:', error);
        } finally {
            setLoading(false);
        }
    }, [user, selectedBranch]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const updateOfficeLocation = (lat: number, lng: number) => {
        const newLoc = { lat, lng };
        setOfficeLocation(newLoc);
        localStorage.setItem('officeLocation', JSON.stringify(newLoc));
    };

    // Geolocation Effect
    useEffect(() => {
        if ("geolocation" in navigator) {
            const watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setUserLocation({ lat: latitude, lng: longitude });
                    const dist = calculateDistance(latitude, longitude, officeLocation.lat, officeLocation.lng);
                    setDistanceToOffice(dist);
                },
                (error) => console.error("Loc Error", error),
                { enableHighAccuracy: true }
            );
            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, [officeLocation]);

    const isWithinRange = distanceToOffice !== null && distanceToOffice <= 20;
    const currentSession = records.find(r => r.clockOut === null);

    const clockIn = async () => {
        if (!user || user.role === 'admin') return false;
        if (!userLocation) { alert("Location needed."); return false; }

        try {
            setLoading(true);
            await attendanceAPI.clockIn('Office HQ', userLocation.lat, userLocation.lng);
            await refreshData();
            return true;
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to clock in');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const clockOut = async () => {
        if (!user || !currentSession) return false;
        try {
            setLoading(true);
            await attendanceAPI.clockOut();
            await refreshData();
            return true;
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to clock out');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return (
        <AttendanceContext.Provider value={{
            records,
            allStaffRecords,
            isCheckedIn: !!currentSession,
            currentSession: currentSession || null,
            clockIn,
            clockOut,
            loading,
            userLocation,
            distanceToOffice,
            isWithinRange,
            officeLocation,
            updateOfficeLocation,
            summary,
            refreshData
        }}>
            {children}
        </AttendanceContext.Provider>
    );
};
