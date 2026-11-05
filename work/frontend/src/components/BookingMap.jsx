import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix lỗi icon mặc định của Leaflet trong React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Các nguồn bản đồ tốc độ cao, không cần API Key
const MAP_STYLES = {
  googleStreets: {
    name: 'Google Maps',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=vi',
    attribution: '&copy; Google Maps'
  },
  cartoVoyager: {
    name: ' Bản đồ sáng',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  },
  googleHybrid: {
    name: 'Vệ tinh',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&hl=vi',
    attribution: '&copy; Google Satellite'
  }
};

function MapClickHandler({ serviceType, pickupCoords, setPickupCoords, dropoffCoords, setDropoffCoords, setDropoffAddress, reverseGeocode }) {
  useMapEvents({
    click(e) {
      if (serviceType === 'container') {
        setDropoffCoords(e.latlng);
        reverseGeocode(e.latlng.lat, e.latlng.lng, 'dropoff');
        return;
      }
      if (!pickupCoords) { 
        setPickupCoords(e.latlng); 
        reverseGeocode(e.latlng.lat, e.latlng.lng, 'pickup'); 
      }
      else if (!dropoffCoords) { 
        setDropoffCoords(e.latlng); 
        reverseGeocode(e.latlng.lat, e.latlng.lng, 'dropoff'); 
      }
      else { 
        setPickupCoords(e.latlng); 
        setDropoffCoords(null); 
        setDropoffAddress(''); 
        reverseGeocode(e.latlng.lat, e.latlng.lng, 'pickup'); 
      }
    },
  });
  return null;
}

function MapUpdater({ pickupCoords, dropoffCoords, waypoints = [] }) {
  const map = useMap();

  // Khắc phục triệt để lỗi bản đồ bị xám khi mới render hoặc đổi kích thước khung
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  useEffect(() => {
    map.invalidateSize();
    const validWaypoints = waypoints.filter(w => w.coords).map(w => [w.coords.lat, w.coords.lng]);
    const allPoints = [
      pickupCoords ? [pickupCoords.lat, pickupCoords.lng] : null,
      ...validWaypoints,
      dropoffCoords ? [dropoffCoords.lat, dropoffCoords.lng] : null
    ].filter(Boolean);

    if (allPoints.length >= 2) {
      map.fitBounds(L.latLngBounds(allPoints), { padding: [45, 45], maxZoom: 16 });
    } else if (allPoints.length === 1) {
      map.setView(allPoints[0], 15, { animate: true });
    }
  }, [pickupCoords, dropoffCoords, waypoints, map]);

  return null;
}

export default function BookingMap({
  serviceType,
  pickupCoords, setPickupCoords,
  dropoffCoords, setDropoffCoords,
  setDropoffAddress,
  waypoints = [],
  reverseGeocode,
  routePolyline = []
}) {
  const [mapStyle, setMapStyle] = useState('googleStreets');
  const currentTile = MAP_STYLES[mapStyle];

  return (
    <div style={{ height: '100%', width: '100%', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e5e9ee', position: 'relative' }}>
      {/* Nút chuyển đổi giao diện bản đồ (Google Maps / Bản đồ sáng / Vệ tinh) */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 1000,
          display: 'flex',
          gap: 4,
          background: 'rgba(255,255,255,0.92)',
          padding: 4,
          borderRadius: 8,
          boxShadow: '0 2px 10px rgba(0,0,0,0.12)'
        }}
      >
        {Object.entries(MAP_STYLES).map(([key, item]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMapStyle(key)}
            style={{
              border: 'none',
              borderRadius: 6,
              padding: '4px 8px',
              fontSize: 10,
              fontWeight: 700,
              cursor: 'pointer',
              background: mapStyle === key ? '#ff782e' : 'transparent',
              color: mapStyle === key ? '#fff' : '#475569'
            }}
          >
            {item.name}
          </button>
        ))}
      </div>

      <MapContainer center={[10.7626, 106.6601]} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          key={mapStyle}
          url={currentTile.url}
          attribution={currentTile.attribution}
          maxZoom={20}
        />
        
        <MapClickHandler 
          serviceType={serviceType}
          pickupCoords={pickupCoords} setPickupCoords={setPickupCoords} 
          dropoffCoords={dropoffCoords} setDropoffCoords={setDropoffCoords} 
          setDropoffAddress={setDropoffAddress} reverseGeocode={reverseGeocode} 
        />
        <MapUpdater pickupCoords={pickupCoords} dropoffCoords={dropoffCoords} waypoints={waypoints} />
        
        {pickupCoords && (
          <Marker position={[pickupCoords.lat, pickupCoords.lng]}>
            <Popup>📍 Điểm lấy hàng {serviceType === 'container' ? '(Cảng)' : ''}</Popup>
          </Marker>
        )}
        {waypoints.map((wp, idx) => wp.coords && (
          <Marker key={idx} position={[wp.coords.lat, wp.coords.lng]}>
            <Popup>📦 Điểm giao phụ #{idx + 1}: {wp.address}</Popup>
          </Marker>
        ))}
        {dropoffCoords && (
          <Marker position={[dropoffCoords.lat, dropoffCoords.lng]}>
            <Popup>🚩 Điểm giao hàng cuối</Popup>
          </Marker>
        )}
        {routePolyline.length > 0 && (
          <Polyline positions={routePolyline} color="#ff7e35" weight={5} opacity={0.85} dashArray="10, 10" />
        )}
      </MapContainer>
    </div>
  );
}