import { useState, useEffect } from 'react';
import { Save, MapPin, Map, Edit3 } from 'lucide-react';
import { useAttendance } from '../context/AttendanceContext';
import { useAuth } from '../context/AuthContext';
import { MapLocationPicker } from '../components/MapLocationPicker';

export const Settings = () => {
    const { officeLocation, updateOfficeLocation } = useAttendance();
    const { user } = useAuth();
    const activeRole = user?.role;

    // Local state for form inputs
    const [lat, setLat] = useState(officeLocation.lat.toString());
    const [lng, setLng] = useState(officeLocation.lng.toString());
    const [msg, setMsg] = useState('');
    const [useMapView, setUseMapView] = useState(true);

    useEffect(() => {
        setLat(officeLocation.lat.toString());
        setLng(officeLocation.lng.toString());
    }, [officeLocation]);

    const handleSave = () => {
        const numLat = parseFloat(lat);
        const numLng = parseFloat(lng);

        if (isNaN(numLat) || isNaN(numLng)) {
            setMsg('Invalid Coordinates');
            return;
        }

        updateOfficeLocation(numLat, numLng);
        setMsg('Office Location Updated Successfully!');
        setTimeout(() => setMsg(''), 3000);
    };

    const handleMapLocationChange = (newLat: number, newLng: number) => {
        setLat(newLat.toString());
        setLng(newLng.toString());
    };

    if (activeRole !== 'admin') {
        return <div className="p-8 text-center text-[rgb(var(--text-secondary))]">Access Denied. Admin only.</div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6 text-[rgb(var(--text-primary))] flex items-center gap-2">
                <MapPin className="text-[rgb(var(--accent-primary))]" />
                Admin Settings
            </h1>

            <div className="bg-[rgb(var(--bg-secondary))] rounded-xl shadow-sm border border-[rgb(var(--border-color))] p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-[rgb(var(--text-primary))]">Attendance Configuration</h2>
                    <button
                        onClick={() => setUseMapView(!useMapView)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[rgb(var(--bg-tertiary))] text-[rgb(var(--text-primary))] rounded-lg hover:bg-[rgb(var(--bg-primary))] transition-colors border border-[rgb(var(--border-color))]"
                    >
                        {useMapView ? (
                            <>
                                <Edit3 size={14} />
                                Manual Entry
                            </>
                        ) : (
                            <>
                                <Map size={14} />
                                Map View
                            </>
                        )}
                    </button>
                </div>

                <div className="space-y-4">
                    {useMapView ? (
                        <MapLocationPicker
                            latitude={parseFloat(lat) || officeLocation.lat}
                            longitude={parseFloat(lng) || officeLocation.lng}
                            onLocationChange={handleMapLocationChange}
                        />
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-1">Office Latitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={lat}
                                    onChange={e => setLat(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-primary))] focus:ring-2 focus:ring-[rgb(var(--accent-primary))] focus:border-[rgb(var(--accent-primary))] outline-none transition-all"
                                    placeholder="e.g. 40.785091"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-1">Office Longitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={lng}
                                    onChange={e => setLng(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-primary))] focus:ring-2 focus:ring-[rgb(var(--accent-primary))] focus:border-[rgb(var(--accent-primary))] outline-none transition-all"
                                    placeholder="e.g. -73.968285"
                                />
                            </div>
                        </>
                    )}

                    <div className="pt-2">
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[rgb(var(--accent-primary))] text-white rounded-lg hover:bg-[rgb(var(--accent-hover))] transition-colors font-medium"
                        >
                            <Save size={18} />
                            Save Configuration
                        </button>
                    </div>

                    {msg && (
                        <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${msg.includes('Success') ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                            {msg}
                        </div>
                    )}

                    <div className="mt-6 p-4 bg-[rgb(var(--bg-tertiary))] rounded-lg text-xs text-[rgb(var(--text-secondary))]">
                        <p className="font-semibold mb-1">Current Geofence Center:</p>
                        <p>Lat: {officeLocation.lat}</p>
                        <p>Lng: {officeLocation.lng}</p>
                        <p className="mt-2 text-[rgb(var(--accent-primary))]">Staff must be within 20m of these coordinates to clock in.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

