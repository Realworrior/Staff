import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation } from 'lucide-react';

// Fix for default marker icon in React-Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

interface MapLocationPickerProps {
    latitude: number;
    longitude: number;
    onLocationChange: (lat: number, lng: number) => void;
}

// Component to handle map clicks
function LocationMarker({ position, onLocationChange }: {
    position: [number, number];
    onLocationChange: (lat: number, lng: number) => void;
}) {
    useMapEvents({
        click(e) {
            onLocationChange(e.latlng.lat, e.latlng.lng);
        },
    });

    return <Marker position={position} />;
}

export const MapLocationPicker = ({ latitude, longitude, onLocationChange }: MapLocationPickerProps) => {
    const [position, setPosition] = useState<[number, number]>([latitude, longitude]);
    const [gettingLocation, setGettingLocation] = useState(false);

    useEffect(() => {
        setPosition([latitude, longitude]);
    }, [latitude, longitude]);

    const handleLocationChange = (lat: number, lng: number) => {
        setPosition([lat, lng]);
        onLocationChange(lat, lng);
    };

    const getCurrentLocation = () => {
        if ("geolocation" in navigator) {
            setGettingLocation(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    handleLocationChange(latitude, longitude);
                    setGettingLocation(false);
                },
                (error) => {
                    console.error("Error getting location:", error);
                    alert("Unable to get your current location. Please ensure location permissions are enabled.");
                    setGettingLocation(false);
                },
                { enableHighAccuracy: true }
            );
        } else {
            alert("Geolocation is not supported by your browser.");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]">
                    <MapPin size={16} className="text-[rgb(var(--accent-primary))]" />
                    <span>Click anywhere on the map to set office location</span>
                </div>
                <button
                    onClick={getCurrentLocation}
                    disabled={gettingLocation}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[rgb(var(--bg-tertiary))] text-[rgb(var(--text-primary))] rounded-lg hover:bg-[rgb(var(--bg-secondary))] transition-colors border border-[rgb(var(--border-color))] disabled:opacity-50"
                >
                    <Navigation size={14} />
                    {gettingLocation ? 'Getting Location...' : 'Use My Location'}
                </button>
            </div>

            <div className="rounded-xl overflow-hidden border-2 border-[rgb(var(--border-color))] shadow-lg">
                <MapContainer
                    center={position}
                    zoom={15}
                    style={{ height: '400px', width: '100%' }}
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker position={position} onLocationChange={handleLocationChange} />
                </MapContainer>
            </div>

            <div className="p-4 bg-[rgb(var(--bg-tertiary))] rounded-lg border border-[rgb(var(--border-color))]">
                <p className="text-xs font-semibold text-[rgb(var(--text-secondary))] mb-2">Selected Coordinates:</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                        <span className="text-[rgb(var(--text-secondary))]">Latitude:</span>
                        <span className="ml-2 font-mono text-[rgb(var(--text-primary))]">{position[0].toFixed(6)}</span>
                    </div>
                    <div>
                        <span className="text-[rgb(var(--text-secondary))]">Longitude:</span>
                        <span className="ml-2 font-mono text-[rgb(var(--text-primary))]">{position[1].toFixed(6)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
