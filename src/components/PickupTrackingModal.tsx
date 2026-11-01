import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { useStore } from '../domain/store.tsx';
import { isOtpExpired, calculateDistanceKm } from '../domain/rules.ts';
import { ModalShell } from './ModalShell.tsx';
import {
  X,
  ShieldCheck,
  Truck,
  MapPin,
  Clock,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Navigation,
  RefreshCw,
  KeyRound,
  Bike,
  Play,
  Pause,
  Zap,
  Radio,
  Building2,
  Home,
} from 'lucide-react';

interface PickupTrackingModalProps {
  trackingId: string | null;
  onClose: () => void;
}

export const PickupTrackingModal: React.FC<PickupTrackingModalProps> = ({
  trackingId,
  onClose,
}) => {
  const {
    currentUser,
    trackingRecords,
    donations,
    claims,
    verifyHandover,
    updateReceiverLocation,
    regenerateHandoverOtp,
  } = useStore();

  const [enteredCode, setEnteredCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSimulatingLiveTransit, setIsSimulatingLiveTransit] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState<1 | 2 | 4>(1);
  const [nowMs, setNowMs] = useState(Date.now());

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const runnerMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  const tracking = trackingRecords.find((t) => t.id === trackingId);
  const donation = tracking ? donations.find((d) => d.id === tracking.donation_id) : null;
  const claim = tracking ? claims.find((c) => c.id === tracking.donation_request_id) : null;

  const isReceiver = currentUser?.id === tracking?.receiver_id;
  const isDonor = currentUser?.id === tracking?.donor_id || currentUser?.role === 'ADMIN';
  const isRunner = currentUser?.id === tracking?.otp_holder_id && currentUser?.id !== tracking?.receiver_id;
  const otpHolderId = tracking?.otp_holder_id || tracking?.receiver_id;
  const isOtpHolder = currentUser?.id === otpHolderId;
  const otpExpired = isOtpExpired(tracking?.otp_expires_at, nowMs);

  const minutesLeft = tracking?.otp_expires_at
    ? Math.max(0, Math.ceil((new Date(tracking.otp_expires_at).getTime() - nowMs) / 60000))
    : null;

  // Real-time clock tick for OTP countdown
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  // Compute live distance between current courier/receiver coordinate and target
  const courierLat = tracking?.receiver_latitude || 37.7695;
  const courierLng = tracking?.receiver_longitude || -122.4145;
  const targetLat = donation?.latitude || 37.7818;
  const targetLng = donation?.longitude || -122.4061;

  const distanceRemainingKm = calculateDistanceKm(
    { latitude: courierLat, longitude: courierLng },
    { latitude: targetLat, longitude: targetLng }
  );

  // Live Transit Simulation Loop
  useEffect(() => {
    if (!isSimulatingLiveTransit || !tracking || tracking.pickup_status !== 'EN_ROUTE' || !donation) return;

    const intervalMs = Math.max(800, 2400 / simulationSpeed);
    const interval = setInterval(() => {
      const curLat = tracking.receiver_latitude || 37.7695;
      const curLng = tracking.receiver_longitude || -122.4145;
      const destLat = donation.latitude;
      const destLng = donation.longitude;

      // Small nudge towards destination with realistic jitter
      const progressFactor = 0.08 * simulationSpeed;
      const deltaLat = (destLat - curLat) * progressFactor;
      const deltaLng = (destLng - curLng) * progressFactor;

      // If extremely close, hold at destination
      if (Math.abs(destLat - curLat) < 0.0002 && Math.abs(destLng - curLng) < 0.0002) {
        return;
      }

      updateReceiverLocation(tracking.id, curLat + deltaLat, curLng + deltaLng);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isSimulatingLiveTransit, simulationSpeed, tracking, donation, updateReceiverLocation]);

  // Initialize interactive Leaflet Live Map inside modal
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current || !tracking || !donation) return;

    const donorCoord: [number, number] = [donation.latitude, donation.longitude];
    const initialRunnerCoord: [number, number] = [courierLat, courierLng];

    const map = L.map(mapContainerRef.current, {
      center: [(donorCoord[0] + initialRunnerCoord[0]) / 2, (donorCoord[1] + initialRunnerCoord[1]) / 2],
      zoom: 14,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map);

    // 1. Donor Pickup Marker
    const donorIcon = L.divIcon({
      className: 'custom-donor-pin',
      html: `
        <div style="background-color: #D97706; color: white; padding: 4px 8px; border-radius: 10px; font-weight: 700; font-size: 11px; border: 2px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
          <span>🏪</span>
          <span>${donation.donor_org || donation.donor_name}</span>
        </div>
      `,
      iconSize: [120, 26],
      iconAnchor: [60, 26],
    });

    L.marker(donorCoord, { icon: donorIcon })
      .bindPopup(`<b>Pickup Location:</b><br/>${donation.pickup_address}`)
      .addTo(map);

    // 2. Receiver Destination Marker
    const receiverCoord: [number, number] = [37.7588, -122.4191]; // Hope community pantry
    const receiverIcon = L.divIcon({
      className: 'custom-dest-pin',
      html: `
        <div style="background-color: #2D6A4F; color: white; padding: 4px 8px; border-radius: 10px; font-weight: 700; font-size: 11px; border: 2px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
          <span>🏠</span>
          <span>Destination</span>
        </div>
      `,
      iconSize: [100, 26],
      iconAnchor: [50, 26],
    });

    L.marker(receiverCoord, { icon: receiverIcon })
      .bindPopup(`<b>Drop-off:</b><br/>${tracking.pickup_person_name}`)
      .addTo(map);

    // 3. Moving Courier / Transit Marker
    const runnerIcon = L.divIcon({
      className: 'custom-courier-pin',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(37,99,235,0.3); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="background-color: #2563EB; color: white; width: 26px; height: 26px; border-radius: 50%; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; position: relative; z-index: 2;">
            🚴
          </div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    const runnerMarker = L.marker(initialRunnerCoord, { icon: runnerIcon }).addTo(map);
    runnerMarkerRef.current = runnerMarker;

    // 4. Connecting Route Line
    const polyline = L.polyline([initialRunnerCoord, donorCoord], {
      color: '#2563EB',
      weight: 3.5,
      dashArray: '6, 6',
      opacity: 0.8,
    }).addTo(map);
    routeLineRef.current = polyline;

    mapInstanceRef.current = map;

    // Fit bounds smoothly
    try {
      const bounds = L.latLngBounds([donorCoord, initialRunnerCoord, receiverCoord]);
      map.fitBounds(bounds, { padding: [40, 40] });
    } catch {
      // ignore bounds error
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [tracking?.id, donation?.id]);

  // Update live runner marker and route line when coordinates change
  useEffect(() => {
    if (!runnerMarkerRef.current || !tracking || !donation) return;
    const newLatLng = L.latLng(courierLat, courierLng);
    runnerMarkerRef.current.setLatLng(newLatLng);

    if (routeLineRef.current) {
      routeLineRef.current.setLatLngs([newLatLng, L.latLng(donation.latitude, donation.longitude)]);
    }
  }, [courierLat, courierLng, donation]);

  if (!tracking || !donation) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsVerifying(true);

    const res = verifyHandover(tracking.id, enteredCode);
    setIsVerifying(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Verification failed.');
    }
  };

  return (
    <ModalShell
      onClose={onClose}
      labelledBy="live-tracking-title"
      maxWidth="max-w-3xl"
      panelClassName="overflow-hidden flex flex-col max-h-[92vh]"
    >
      {/* Header with Live Pulsing Badge & Clean Close Button */}
      <div className="px-6 py-4 bg-[#FAF7F2] border-b border-[#E8DEC9] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-[#2563EB] animate-ping opacity-75" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] absolute" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="live-tracking-title" className="font-display font-bold text-lg text-[#1E1611]">
                Live Dispatch & Handover Tracking
              </h2>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#EFF6FF] text-[#2563EB] border border-[#2563EB]/20">
                {tracking.pickup_status === 'VERIFIED' ? 'Completed' : 'Live En Route'}
              </span>
            </div>
            <p className="text-xs text-[#7E7063]">
              {donation.title} · Offered by {donation.donor_org || donation.donor_name}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-xl hover:bg-[#E8DEC9] text-[#7E7063] hover:text-[#1E1611] transition-colors"
          aria-label="Close tracking"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Container */}
      <div className="overflow-y-auto flex-1 p-6 space-y-5">
        {/* Live Interactive Map Box */}
        <div className="relative w-full h-[260px] sm:h-[300px] rounded-2xl overflow-hidden border border-[#E8DEC9] shadow-inner bg-[#FAF7F2]">
          <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />

          {/* Floating Live Telemetry Overlay */}
          <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-[#E8DEC9] shadow-md flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-[#1E1611]">
              <Radio className="w-3.5 h-3.5 text-[#2563EB] animate-pulse" />
              <span>{tracking.pickup_status === 'VERIFIED' ? 'Delivered' : `${distanceRemainingKm} km to pickup`}</span>
            </div>
            <span className="text-[#E8DEC9]">|</span>
            <span className="text-[11px] text-[#7E7063]">
              ETA: ~{Math.max(2, Math.round(distanceRemainingKm * 4))} mins
            </span>
          </div>

          {/* Simulation Controls Overlay */}
          <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-[#E8DEC9] shadow-md flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setIsSimulatingLiveTransit(!isSimulatingLiveTransit)}
              className="px-2 py-1 rounded-lg bg-[#FAF7F2] hover:bg-[#F3ECE1] text-[#1E1611] font-semibold flex items-center gap-1"
              title="Toggle Live Simulation Movement"
            >
              {isSimulatingLiveTransit ? (
                <>
                  <Pause className="w-3 h-3 text-[#D97706]" />
                  <span>Pause GPS</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-[#2D6A4F]" />
                  <span>Resume GPS</span>
                </>
              )}
            </button>

            <button
              onClick={() => setSimulationSpeed(simulationSpeed === 1 ? 2 : simulationSpeed === 2 ? 4 : 1)}
              className="px-2 py-1 rounded-lg bg-[#FAF7F2] hover:bg-[#F3ECE1] text-[#7E7063] font-mono text-[11px] font-bold"
              title="Change Simulation Speed"
            >
              {simulationSpeed}x Speed
            </button>
          </div>
        </div>

        {/* 5-Stage Live Dispatch Pipeline Stepper */}
        <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8DEC9]">
          <div className="flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-[#2D6A4F]">
              <span className="w-5 h-5 rounded-full bg-[#2D6A4F] text-white flex items-center justify-center text-[10px]">✓</span>
              <span>1. Approved</span>
            </div>
            <div className="h-px flex-1 bg-[#E8DEC9] mx-2" />
            <div className="flex items-center gap-1.5 text-[#2563EB]">
              <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-[10px]">
                {tracking.pickup_status === 'VERIFIED' ? '✓' : '2'}
              </span>
              <span>2. Courier Dispatched</span>
            </div>
            <div className="h-px flex-1 bg-[#E8DEC9] mx-2" />
            <div className={`flex items-center gap-1.5 ${tracking.pickup_status === 'VERIFIED' ? 'text-[#2D6A4F]' : 'text-[#7E7063]'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                tracking.pickup_status === 'VERIFIED' ? 'bg-[#2D6A4F] text-white' : 'bg-white border border-[#E8DEC9]'
              }`}>
                {tracking.pickup_status === 'VERIFIED' ? '✓' : '3'}
              </span>
              <span>3. Handover Complete</span>
            </div>
          </div>
        </div>

        {/* Live Status Content */}
        {tracking.pickup_status === 'VERIFIED' ? (
          <div className="p-6 rounded-2xl bg-[#E8F5EE] border border-[#2D6A4F]/20 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#2D6A4F] text-white flex items-center justify-center mx-auto mb-3 shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-xl text-[#1E1611]">
              Surplus Rescued & Verified!
            </h3>
            <p className="text-xs text-[#2D6A4F] mt-1.5 max-w-md mx-auto leading-relaxed">
              The single-use 6-digit OTP code was matched and permanently consumed. The surplus food has been safely transferred!
            </p>
            <div className="mt-3 text-xs text-[#7E7063] font-mono">
              Verified at {new Date(claim?.completed_at || Date.now()).toLocaleTimeString()}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Courier / Person Info Card */}
            <div className="p-4 rounded-2xl bg-white border border-[#E8DEC9] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-mono text-[#7E7063] font-bold">
                  {claim?.pickup_mode === 'RUNNER' ? 'Community Courier Partner' : 'Receiver Self-Pickup'}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#EFF6FF] text-[#2563EB]">
                  <Bike className="w-3.5 h-3.5" />
                  Eco Transport
                </span>
              </div>

              <div>
                <p className="font-display font-bold text-base text-[#1E1611]">
                  {tracking.pickup_person_name}
                </p>
                <p className="text-xs text-[#7E7063] flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  <span>{tracking.pickup_phone}</span>
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8DEC9] text-xs text-[#4E4035] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#7E7063]">Pickup Location:</span>
                  <span className="font-semibold text-right truncate max-w-[160px]">{donation.pickup_address}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#7E7063]">Planned Arrival:</span>
                  <span className="font-semibold text-[#D97706]">{tracking.planned_pickup_time}</span>
                </div>
              </div>
            </div>

            {/* Secure One-Time OTP Card */}
            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8DEC9] flex flex-col justify-between">
              {isOtpHolder ? (
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#D97706]">
                    <KeyRound className="w-4 h-4" />
                    <span>YOUR PRIVATE ONE-TIME OTP</span>
                  </div>

                  {otpExpired ? (
                    <div className="p-3 rounded-xl bg-[#FDF0ED] border border-[#BA181B]/20 text-xs text-[#BA181B]">
                      This OTP has expired. Please refresh below.
                    </div>
                  ) : (
                    <div className="py-2.5 px-6 rounded-2xl bg-white border-2 border-[#D97706] shadow-sm inline-block">
                      <span className="font-mono text-3xl font-extrabold tracking-widest text-[#1E1611]">
                        {tracking.verification_code}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2 text-[11px] text-[#7E7063]">
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-[#E8DEC9]">
                      SINGLE USE
                    </span>
                    <span>{otpExpired ? 'Expired' : `Valid for ${minutesLeft || 30}m`}</span>
                    {!tracking.is_locked && (
                      <button
                        type="button"
                        onClick={() => regenerateHandoverOtp(tracking.id)}
                        className="text-[#2D6A4F] hover:underline font-semibold flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Refresh
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-[#7E7063] leading-relaxed">
                    Show this 6-digit code to the donor upon collection. The code is permanently consumed immediately after verification.
                  </p>
                </div>
              ) : isDonor ? (
                <form onSubmit={handleVerify} className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E1611]">
                    <ShieldCheck className="w-4 h-4 text-[#D97706]" />
                    <span>Verify Handover Code</span>
                  </div>
                  <p className="text-xs text-[#7E7063]">
                    Ask {tracking.pickup_person_name} for their 6-digit code:
                  </p>

                  {errorMsg && (
                    <div className="p-2 rounded-lg bg-[#FDF0ED] border border-[#BA181B]/20 text-xs text-[#BA181B]">
                      {errorMsg}
                    </div>
                  )}

                  <input
                    type="text"
                    maxLength={6}
                    value={enteredCode}
                    onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6 digits"
                    disabled={tracking.is_locked || isVerifying}
                    className="w-full text-center tracking-widest font-mono text-xl font-bold py-2 px-3 rounded-xl border border-[#E8DEC9] bg-white text-[#1E1611] focus:ring-2 focus:ring-[#D97706] focus:outline-none"
                  />

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] text-[#7E7063] font-mono">
                      Attempts: {tracking.verification_attempts} / {tracking.max_attempts}
                    </span>
                    <button
                      type="submit"
                      disabled={tracking.is_locked || isVerifying || enteredCode.length !== 6}
                      className="px-4 py-2 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white font-semibold text-xs transition-colors disabled:opacity-50"
                    >
                      {isVerifying ? 'Verifying...' : 'Verify & Handover'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center p-3 text-xs text-[#7E7063]">
                  <Bike className="w-8 h-8 text-[#2563EB] mx-auto mb-2" />
                  <p className="font-semibold text-[#1E1611]">Rescue Courier Dispatched</p>
                  <p className="mt-1">
                    The courier holds the secure 6-digit code and will verify with the donor at pickup.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3.5 bg-[#FAF7F2] border-t border-[#E8DEC9] flex items-center justify-between shrink-0">
        <span className="text-[11px] text-[#7E7063]">
          Live GPS updates every 2 seconds · End-to-end verified surplus transfer
        </span>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 rounded-xl border border-[#E8DEC9] bg-white hover:bg-[#F3ECE1] text-xs font-semibold text-[#4E4035]"
        >
          Close Live Tracking
        </button>
      </div>
    </ModalShell>
  );
};
