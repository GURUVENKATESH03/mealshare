import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Donation, PickupTracking } from '../types/index.ts';
import { useStore } from '../domain/store.tsx';
import { calculateDistanceKm, getExpiryRemaining } from '../domain/rules.ts';
import { Filter, Layers, Navigation } from 'lucide-react';

interface MapViewProps {
  onSelectDonation: (donation: Donation) => void;
  activeTracking?: PickupTracking | null;
}

export const MapView: React.FC<MapViewProps> = ({ onSelectDonation, activeTracking }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const circleLayerRef = useRef<L.Circle | null>(null);

  const { currentUser, donations, categories } = useStore();
  const [selectedRadiusKm, setSelectedRadiusKm] = useState<number>(10);
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');

  // Default coordinate: user's location or downtown SF
  const userLat = currentUser?.latitude || 37.7749;
  const userLng = currentUser?.longitude || -122.4194;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [userLat, userLng],
      zoom: 13,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Warm, clean OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers & Radius Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    // 1. User Location Marker
    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `
        <div style="background-color: #2D6A4F; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
          <div style="background-color: white; width: 6px; height: 6px; border-radius: 50%;"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    L.marker([userLat, userLng], { icon: userIcon, title: 'Your Location' })
      .bindPopup(
        `<div style="font-family: Karla, sans-serif; font-size: 13px; font-weight: 600; color: #1E1611;">
          📍 Your Current Location
          <div style="font-size: 11px; font-weight: 400; color: #7E7063;">Radius center (${selectedRadiusKm} km)</div>
        </div>`
      )
      .addTo(markersLayer);

    // 2. Draw Radius Circle
    if (circleLayerRef.current) {
      circleLayerRef.current.remove();
    }
    circleLayerRef.current = L.circle([userLat, userLng], {
      radius: selectedRadiusKm * 1000,
      color: '#D97706',
      fillColor: '#D97706',
      fillOpacity: 0.05,
      weight: 1.5,
      dashArray: '4, 4',
    }).addTo(map);

    // 3. Filter Donations
    const availableDonations = donations.filter((d) => {
      if (d.status !== 'AVAILABLE' && d.status !== 'RESERVED') return false;
      if (filterCategoryId !== 'all' && d.category_id !== filterCategoryId) return false;
      const dist = calculateDistanceKm(
        { latitude: userLat, longitude: userLng },
        { latitude: d.latitude, longitude: d.longitude }
      );
      return dist <= selectedRadiusKm;
    });

    // 4. Place Donation Markers
    availableDonations.forEach((donation) => {
      const category = categories.find((c) => c.id === donation.category_id);
      const isReserved = donation.status === 'RESERVED';
      const pinColor = isReserved ? '#7E7063' : donation.is_emergency ? '#BA181B' : '#D97706';

      const donationIcon = L.divIcon({
        className: 'custom-donation-marker',
        html: `
          <div style="
            background-color: ${pinColor};
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-family: Karla, sans-serif;
            font-size: 11px;
            font-weight: 700;
            box-shadow: 0 3px 8px rgba(0,0,0,0.25);
            border: 2px solid white;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
          ">
            <span>🥗</span>
            <span>${donation.quantity}</span>
          </div>
        `,
        iconSize: [60, 26],
        iconAnchor: [30, 13],
      });

      const dist = calculateDistanceKm(
        { latitude: userLat, longitude: userLng },
        { latitude: donation.latitude, longitude: donation.longitude }
      );
      const expiry = getExpiryRemaining(donation.expiry_time);

      const marker = L.marker([donation.latitude, donation.longitude], {
        icon: donationIcon,
      }).addTo(markersLayer);

      const popupContent = document.createElement('div');
      popupContent.style.fontFamily = 'Karla, sans-serif';
      popupContent.style.width = '200px';
      popupContent.innerHTML = `
        <div style="font-weight: 700; font-size: 14px; color: #1E1611; margin-bottom: 4px;">${donation.title}</div>
        <div style="font-size: 11px; color: #7E7063; margin-bottom: 8px;">
          ${category?.name || 'Surplus'} · ${dist} km away
        </div>
        <div style="font-size: 12px; color: ${expiry.isUrgent ? '#BA181B' : '#2D6A4F'}; font-weight: 600; margin-bottom: 10px;">
          ⏰ ${expiry.label}
        </div>
        <button id="view-don-${donation.id}" style="
          width: 100%;
          background-color: #2D6A4F;
          color: white;
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        ">
          View Details & Claim
        </button>
      `;

      popupContent.querySelector(`#view-don-${donation.id}`)?.addEventListener('click', () => {
        onSelectDonation(donation);
      });

      marker.bindPopup(popupContent);
    });

    // 5. Active Tracking Receiver Marker (if en route)
    if (
      activeTracking &&
      activeTracking.pickup_status === 'EN_ROUTE' &&
      activeTracking.receiver_latitude &&
      activeTracking.receiver_longitude
    ) {
      const transitIcon = L.divIcon({
        className: 'custom-transit-marker',
        html: `
          <div style="
            background-color: #2563EB;
            color: white;
            padding: 4px 10px;
            border-radius: 14px;
            font-size: 11px;
            font-weight: 700;
            border: 2px solid white;
            box-shadow: 0 4px 12px rgba(37,99,235,0.4);
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <span>🚚</span>
            <span>Receiver In Transit</span>
          </div>
        `,
        iconSize: [120, 28],
        iconAnchor: [60, 14],
      });

      L.marker([activeTracking.receiver_latitude, activeTracking.receiver_longitude], {
        icon: transitIcon,
      })
        .bindPopup(
          `<div style="font-family: Karla, sans-serif; font-size: 12px;">
            <b>${activeTracking.pickup_person_name}</b> is en route.
            <div style="color: #7E7063; font-size: 11px;">ETA: ${activeTracking.planned_pickup_time}</div>
          </div>`
        )
        .addTo(markersLayer);
    }
  }, [donations, selectedRadiusKm, filterCategoryId, userLat, userLng, activeTracking]);

  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[500px] rounded-2xl overflow-hidden border border-[#E8DEC9] bg-[#FAF7F2]">
      {/* Floating Radius & Category Filter Bar */}
      <div className="absolute top-4 left-4 z-[1000] bg-white/95 backdrop-blur-md p-3 rounded-xl border border-[#E8DEC9] shadow-md flex flex-wrap items-center gap-3">
        {/* Radius selector */}
        <div className="flex items-center gap-1.5 text-xs font-medium text-[#4E4035]">
          <Navigation className="w-3.5 h-3.5 text-[#D97706]" />
          <span>Radius:</span>
          <select
            value={selectedRadiusKm}
            onChange={(e) => setSelectedRadiusKm(Number(e.target.value))}
            className="bg-[#FAF7F2] border border-[#E8DEC9] rounded-md px-2 py-1 text-xs font-semibold text-[#1E1611] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
          >
            <option value={3}>Within 3 km</option>
            <option value={5}>Within 5 km</option>
            <option value={10}>Within 10 km</option>
            <option value={25}>Within 25 km</option>
          </select>
        </div>

        <div className="h-4 w-px bg-[#E8DEC9]" />

        {/* Category filter */}
        <div className="flex items-center gap-1.5 text-xs font-medium text-[#4E4035]">
          <Filter className="w-3.5 h-3.5 text-[#2D6A4F]" />
          <span>Category:</span>
          <select
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
            className="bg-[#FAF7F2] border border-[#E8DEC9] rounded-md px-2 py-1 text-xs font-semibold text-[#1E1611] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />
    </div>
  );
};
