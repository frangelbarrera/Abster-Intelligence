"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Polygon, useMapEvents, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Layers, Map as MapIcon, ShieldAlert, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { LocationModal } from './LocationModal';
import { useAbsterStore } from '../store/absterStore';

// Fix Leaflet default icon issue
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

function MapResizer({ isSidebarOpen, isRightPanelOpen }: { isSidebarOpen: boolean, isRightPanelOpen: boolean }) {
  const map = useMap();
  useEffect(() => {
    // Wait for the CSS transition to complete before invalidating size
    const timeout = setTimeout(() => {
      map.invalidateSize();
    }, 300);
    return () => clearTimeout(timeout);
  }, [map, isSidebarOpen, isRightPanelOpen]);
  return null;
}

const BASE_LAYERS = [
  { id: 'dark', name: 'DARK MATTER (CARTO)', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attribution: '&copy; CARTO' },
  { id: 'satellite', name: 'SATELLITE (ESRI)', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: '&copy; Esri' },
  { id: 'streets', name: 'STREETS (VOYAGER)', url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', attribution: '&copy; CARTO' }
];

const COLOR_MAP: Record<string, string> = {
  red: '#ef4444', blue: '#3b82f6', green: '#22c55e', yellow: '#eab308',
  purple: '#a855f7', orange: '#f97316', cyan: '#06b6d4', white: '#ffffff'
};

function MapEvents({ drawingMode, onMapClick }: { drawingMode: string | null, onMapClick: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      if (drawingMode) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
}

export default function GeoIntMap({ onClose }: { onClose?: () => void }) {
  const { entities: allEntities, activeCaseId, currentUser, addEntity, addCase, setActiveCase } = useAbsterStore();
  const entities = useMemo(() => (allEntities || []).filter(e => e.caseId === activeCaseId), [allEntities, activeCaseId]);
  
  const [activeLayer, setActiveLayer] = useState(BASE_LAYERS[0]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  
  const [showEarthquakes, setShowEarthquakes] = useState(false);
  const [earthquakeData, setEarthquakeData] = useState<{ features: any[] } | null>(null);
  const [showFlights, setShowFlights] = useState(false);
  const [flightDensity, setFlightDensity] = useState<25 | 50 | 100>(25);
  const [flightsData, setFlightsData] = useState<{ lat: number; lon: number; flight?: string; hex: string; alt_baro?: number; gs?: number }[]>([]);
  const [showWildfires, setShowWildfires] = useState(false);
  const [wildfiresData, setWildfiresData] = useState<{ id: string; title: string; geometry: { coordinates: number[] }[] }[]>([]);
  const [showStorms, setShowStorms] = useState(false);
  const [stormsData, setStormsData] = useState<{ id: string; title: string; geometry: { coordinates: any }[] }[]>([]);

  const [drawingMode, setDrawingMode] = useState<'polygon' | 'marker' | null>(null);
  const [activePolygonPoints, setActivePolygonPoints] = useState<L.LatLng[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clickCoords, setClickCoords] = useState({ lat: 0, lng: 0 });
  
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'feed' | 'assets'>('assets');

  interface FeedEvent {
    id: string;
    timestamp: string;
    type: 'system' | 'user' | 'alert';
    message: string;
    lat?: number;
    lng?: number;
    bounds?: L.LatLngBoundsExpression;
  }
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([
    { id: 'init', timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }), type: 'system', message: '2D Tactical Map initialized. Memory load optimal.' }
  ]);

  const addFeedEvent = (type: FeedEvent['type'], message: string, location?: { lat?: number, lng?: number, bounds?: L.LatLngBoundsExpression }) => {
    setFeedEvents(prev => {
      const newEvent: FeedEvent = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        type,
        message,
        ...location
      };
      return [newEvent, ...prev].slice(0, 50);
    });
  };

  // Fetch Earthquakes
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    const fetchEq = () => {
      fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson')
        .then(res => res.json())
        .then(data => {
          setEarthquakeData(data);
          if (data.features) {
            const significant = data.features.filter((f: any) => f.properties.mag >= 5.0).slice(0, 3);
            significant.forEach((eq: any) => {
              addFeedEvent('alert', `Seismic Alert: Mag ${eq.properties.mag} - ${eq.properties.place}`, {
                lat: eq.geometry.coordinates[1],
                lng: eq.geometry.coordinates[0]
              });
            });
          }
        })
        .catch(err => console.error(err));
    };
    if (showEarthquakes) {
      fetchEq();
      interval = setInterval(fetchEq, 60000);
    } else {
      setEarthquakeData(null);
    }
    return () => clearInterval(interval);
  }, [showEarthquakes]);

  // Fetch Flights (Using local proxy to Flightradar24 for global coverage)
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    let errorShown = false;
    const fetchFlights = async () => {
      try {
        const res = await fetch(`/api/flights?limit=${flightDensity}`);
        if (!res.ok) {
          throw new Error("External service unavailable");
        }
        const data = await res.json();
        if (data && Array.isArray(data.ac)) {
          setFlightsData(data.ac);
          errorShown = false; // reset flag on success
        }
      } catch (err) {
        setFlightsData([]);
        if (!errorShown) {
          addFeedEvent('alert', 'Flights tracking service unavailable (External API block).', { lat: 0, lng: 0 });
          errorShown = true;
        }
      }
    };
    if (showFlights) {
      fetchFlights();
      interval = setInterval(fetchFlights, 15000); // Update every 15s
    } else {
      setFlightsData([]);
      errorShown = false;
    }
    return () => clearInterval(interval);
  }, [showFlights, flightDensity]);

  // Wildfires now rely entirely on the global NASA GIBS TileLayer for international coverage
  // EONET markers were removed as they are often US-centric
  useEffect(() => {
    if (showWildfires) {
      // No need to fetch EONET data anymore, TileLayer handles it
      setWildfiresData([]);
    }
  }, [showWildfires]);

  // Fetch Storms
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    const fetchStorms = () => {
      fetch('https://eonet.gsfc.nasa.gov/api/v3/events?category=severeStorms&status=open&days=7')
        .then(res => res.json())
        .then(data => setStormsData(data.events || []))
        .catch(err => console.error(err));
    };
    if (showStorms) {
      fetchStorms();
      interval = setInterval(fetchStorms, 300000);
    } else {
      setStormsData([]);
    }
    return () => clearInterval(interval);
  }, [showStorms]);

  const handleMapClick = (latlng: L.LatLng) => {
    if (drawingMode === 'marker') {
      setClickCoords({ lat: latlng.lat, lng: latlng.lng });
      setIsModalOpen(true);
      setDrawingMode(null);
    } else if (drawingMode === 'polygon') {
      setActivePolygonPoints([...activePolygonPoints, latlng]);
    }
  };

  const handleFinishPolygon = () => {
    if (activePolygonPoints.length >= 3) {
      const lats = activePolygonPoints.map(p => p.lat);
      const lngs = activePolygonPoints.map(p => p.lng);
      const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
      const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
      
      setClickCoords({ lat: centerLat, lng: centerLng });
      setIsModalOpen(true);
      addFeedEvent('user', `Tactical area delimited.`, { bounds: L.latLngBounds(activePolygonPoints) });
    }
    setDrawingMode(null);
  };

  const handleLocateAsset = (entity: { id: string; lat?: number; lng?: number; polygon?: { lat: number; lng: number }[]; metadata?: any; name?: string }) => {
    if (!mapInstance) return;
    
    const attrs = entity.metadata || {};
    const polygon = entity.polygon || attrs.polygon;
    const geojson = attrs.geojson;
    const lat = entity.lat !== undefined ? entity.lat : attrs.lat;
    const lng = entity.lng !== undefined ? entity.lng : attrs.lng;

    if (geojson) {
      try {
        const geoJsonLayer = L.geoJSON(geojson);
        mapInstance.flyToBounds(geoJsonLayer.getBounds(), { duration: 1.5, padding: [50, 50] });
      } catch (e) {
        console.error(e);
      }
    } else if (polygon && polygon.length >= 3) {
      const bounds = L.latLngBounds(polygon);
      mapInstance.flyToBounds(bounds, { duration: 1.5, padding: [50, 50] });
    } else if (lat !== undefined && lng !== undefined) {
      mapInstance.flyTo([lat, lng], 8, { duration: 1.5 });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#000] text-[#fff] overflow-hidden font-mono selection:bg-white/20">
      <style>{`
        .leaflet-container { background: #000; font-family: inherit; }
        .leaflet-control-attribution { background: rgba(0, 0, 0, 0.5) !important; color: #a0a0a0 !important; }
        .leaflet-control-attribution a { color: #a0a0a0 !important; }
        .leaflet-popup-content-wrapper { background: #0a0a0a; color: white; border: 1px solid #1a1a1a; border-radius: 6px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
        .leaflet-popup-tip { background: #0a0a0a; border: 1px solid #1a1a1a; }
      `}</style>

      {/* TopAppBar */}
      <header className="fixed top-0 left-0 w-full z-[1000] flex justify-between items-center px-6 h-12 bg-[#000] border-b border-[#1a1a1a] shadow-none">
        <div className="flex items-center gap-6">
          {onClose && (
            <button 
              onClick={onClose}
              className="flex items-center gap-2 text-[10px] font-medium tracking-widest text-[#a0a0a0] hover:text-white transition-colors px-3 py-1.5 border border-[#1a1a1a] rounded bg-transparent hover:border-[#333]"
            >
              <ChevronLeft className="w-3 h-3" /> BACK
            </button>
          )}
          {!onClose && (
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="w-6 h-6 flex items-center justify-center relative overflow-hidden">
                <ShieldAlert className="w-4 h-4 text-[#fff]" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold tracking-[0.15em] text-[#fff] text-[11px] leading-none">ABSTER</span>
                <span className="text-[9px] tracking-widest text-[#a0a0a0]">GEO INT</span>
              </div>
            </div>
          )}
          <nav className="hidden md:flex items-center gap-1">
            <button className="px-4 py-2 text-[10px] font-medium tracking-widest text-[#fff] border-b border-[#fff] bg-transparent">MAP</button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] font-medium text-[#fff] uppercase">{currentUser?.displayName || 'OPERATIVE'}</div>
            <div className="text-[9px] text-[#a0a0a0] tracking-widest">CLEARANCE: LEVEL_05</div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-12 relative z-0 min-h-0 overflow-hidden">
        {/* Left Sidebar */}
        <div className={`transition-all duration-300 ease-in-out border-r border-[#1a1a1a] bg-[#000] flex flex-col z-[1000] h-full ${isSidebarOpen ? 'w-[260px] shrink-0' : 'w-0 overflow-hidden shrink-0'}`}>
          <div className="px-4 py-4 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6 w-[260px]">
            
            {/* Tactical Data Layers */}
            <div className="bg-transparent p-0">
              <h2 className="text-[10px] font-medium tracking-widest text-[#525252] uppercase mb-3">Tactical Layers</h2>
              <div className="flex flex-col gap-1">
                <div className="flex flex-col">
                  <div onClick={() => {
                    setShowFlights(!showFlights);
                    addFeedEvent('system', `Air Traffic layer ${!showFlights ? 'activated' : 'deactivated'}.`);
                  }} className={`flex items-center justify-between py-2 border-b border-[#1a1a1a] cursor-pointer transition-all`}>
                    <div className="flex items-center gap-2">
                       <span className="material-symbols-outlined text-[14px] text-[#a0a0a0]">flight</span>
                      <span className={`text-[11px] uppercase ${showFlights ? 'text-[#fff]' : 'text-[#a0a0a0]'}`}>Air Traffic</span>
                    </div>
                    <div className={`w-6 h-3 rounded-full ${showFlights ? 'bg-[#fff]' : 'bg-[#1a1a1a]'} relative transition-colors`}>
                      <div className={`absolute top-0.5 w-2 h-2 rounded-full transition-all ${showFlights ? 'right-0.5 bg-[#000]' : 'left-0.5 bg-[#525252]'}`}></div>
                    </div>
                  </div>
                  {showFlights && (
                    <div className="flex items-center justify-between py-2 px-1 border-b border-[#1a1a1a]">
                      <span className="text-[9px] text-[#525252] tracking-wider">DENSITY</span>
                      <div className="flex gap-1">
                        {[25, 50, 100].map((val) => (
                          <button
                            key={val}
                            onClick={() => {
                              setFlightDensity(val as 25 | 50 | 100);
                              addFeedEvent('system', `Air Traffic density set to ${val}%.`);
                            }}
                            className={`text-[9px] px-2 py-0.5 rounded transition-colors ${flightDensity === val ? 'bg-[#fff] text-[#000]' : 'bg-transparent text-[#a0a0a0] border border-[#1a1a1a] hover:border-[#333] hover:text-[#fff]'}`}
                          >
                            {val}%
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div onClick={() => {
                  setShowEarthquakes(!showEarthquakes);
                  addFeedEvent('system', `Seismic Activity layer ${!showEarthquakes ? 'activated' : 'deactivated'}.`);
                }} className={`flex items-center justify-between py-2 border-b border-[#1a1a1a] cursor-pointer transition-all`}>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-[#a0a0a0]">monitor_heart</span>
                    <span className={`text-[11px] uppercase ${showEarthquakes ? 'text-[#fff]' : 'text-[#a0a0a0]'}`}>Seismic Data</span>
                  </div>
                  <div className={`w-6 h-3 rounded-full ${showEarthquakes ? 'bg-[#fff]' : 'bg-[#1a1a1a]'} relative transition-colors`}>
                    <div className={`absolute top-0.5 w-2 h-2 rounded-full transition-all ${showEarthquakes ? 'right-0.5 bg-[#000]' : 'left-0.5 bg-[#525252]'}`}></div>
                  </div>
                </div>
                
                <div onClick={() => {
                  setShowWildfires(!showWildfires);
                  addFeedEvent('system', `FIRMS Hotspots layer ${!showWildfires ? 'activated' : 'deactivated'}.`);
                }} className={`flex items-center justify-between py-2 border-b border-[#1a1a1a] cursor-pointer transition-all`}>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-[#a0a0a0]">local_fire_department</span>
                    <span className={`text-[11px] uppercase ${showWildfires ? 'text-[#fff]' : 'text-[#a0a0a0]'}`}>FIRMS Hotspots</span>
                  </div>
                  <div className={`w-6 h-3 rounded-full ${showWildfires ? 'bg-[#fff]' : 'bg-[#1a1a1a]'} relative transition-colors`}>
                    <div className={`absolute top-0.5 w-2 h-2 rounded-full transition-all ${showWildfires ? 'right-0.5 bg-[#000]' : 'left-0.5 bg-[#525252]'}`}></div>
                  </div>
                </div>
                
                <div onClick={() => {
                  setShowStorms(!showStorms);
                  addFeedEvent('system', `Severe Storms layer ${!showStorms ? 'activated' : 'deactivated'}.`);
                }} className={`flex items-center justify-between py-2 border-b border-[#1a1a1a] cursor-pointer transition-all`}>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-[#a0a0a0]">cyclone</span>
                    <span className={`text-[11px] uppercase ${showStorms ? 'text-[#fff]' : 'text-[#a0a0a0]'}`}>Severe Storms</span>
                  </div>
                  <div className={`w-6 h-3 rounded-full ${showStorms ? 'bg-[#fff]' : 'bg-[#1a1a1a]'} relative transition-colors`}>
                    <div className={`absolute top-0.5 w-2 h-2 rounded-full transition-all ${showStorms ? 'right-0.5 bg-[#000]' : 'left-0.5 bg-[#525252]'}`}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Map Controls */}
            <div className="bg-transparent p-0">
              <h2 className="text-[10px] font-medium tracking-widest text-[#525252] uppercase mb-3">Map Controls</h2>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setDrawingMode(drawingMode === 'marker' ? null : 'marker')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 border rounded ${drawingMode === 'marker' ? 'border-[#fff] bg-[#fff] text-[#000]' : 'border-[#1a1a1a] bg-transparent text-[#a0a0a0] hover:border-[#333] hover:text-[#fff]'} transition-colors text-[10px] font-medium tracking-wider`}
                >
                  <MapIcon className="w-3 h-3" /> MARKER
                </button>
                <button 
                  onClick={() => {
                    if (drawingMode === 'polygon') {
                      handleFinishPolygon();
                    } else {
                      setDrawingMode('polygon');
                      setActivePolygonPoints([]);
                    }
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 border rounded ${drawingMode === 'polygon' ? 'border-[#fff] bg-[#fff] text-[#000]' : 'border-[#1a1a1a] bg-transparent text-[#a0a0a0] hover:border-[#333] hover:text-[#fff]'} transition-colors text-[10px] font-medium tracking-wider`}
                >
                  <Layers className="w-3 h-3" /> {drawingMode === 'polygon' ? 'FINISH' : 'POLYGON'}
                </button>
              </div>
              {drawingMode && (
                <div className="mt-2 text-[9px] text-[#a0a0a0] text-center italic animate-pulse">
                  {drawingMode === 'marker' ? 'Click on map to place marker' : 'Click on map to draw polygon points'}
                </div>
              )}
            </div>

            {/* Base Layers */}
            <div className="bg-transparent p-0">
              <h2 className="text-[10px] font-medium tracking-widest text-[#525252] uppercase mb-3">Base Layers</h2>
              <div className="flex flex-col gap-1.5">
                {BASE_LAYERS.map(layer => (
                  <button
                    key={layer.id}
                    onClick={() => {
                      setActiveLayer(layer);
                      addFeedEvent('system', `Base layer changed to ${layer.name}.`);
                    }}
                    className={`w-full text-left px-3 py-2 text-[10px] font-medium tracking-wider border rounded transition-colors ${activeLayer.id === layer.id ? 'border-[#fff] text-[#fff] bg-[#111]' : 'border-[#1a1a1a] bg-transparent text-[#a0a0a0] hover:border-[#333] hover:text-[#fff]'}`}
                  >
                    {layer.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Sidebar Button */}
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`absolute top-1/2 -translate-y-1/2 z-[1001] bg-[#000] border border-[#1a1a1a] border-l-0 py-2 px-1.5 rounded-r text-[#a0a0a0] hover:text-[#fff] transition-all duration-300 ${isSidebarOpen ? 'left-[260px]' : 'left-0'}`}>
          {isSidebarOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        {/* Toggle Right Panel Button */}
        <button onClick={() => setIsRightPanelOpen(!isRightPanelOpen)} className={`absolute top-1/2 -translate-y-1/2 z-[1001] bg-[#000] border border-[#1a1a1a] border-r-0 py-2 px-1.5 rounded-l text-[#a0a0a0] hover:text-[#fff] transition-all duration-300 ${isRightPanelOpen ? 'right-[260px]' : 'right-0'}`}>
          {isRightPanelOpen ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>

        {/* Main Map Area */}
        <div className="flex-1 relative bg-[#000] z-0">
          <MapContainer 
            center={[20, 0]} 
            zoom={3} 
            minZoom={3}
            maxBounds={[[-90, -180], [90, 180]]}
            maxBoundsViscosity={1.0}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
            zoomControl={false}
            attributionControl={false}
            ref={setMapInstance}
          >
            <MapResizer isSidebarOpen={isSidebarOpen} isRightPanelOpen={isRightPanelOpen} />
            <TileLayer url={activeLayer.url} attribution={activeLayer.attribution} noWrap={true} />
            <MapEvents drawingMode={drawingMode} onMapClick={handleMapClick} />

            {/* Entities from Store */}
            {entities.map(entity => {
              const attrs = entity.metadata || {};
              const polygon = (entity as any).polygon || attrs.polygon;
              const isPolygon = polygon && polygon.length >= 3;
              const geojson = attrs.geojson;
              const riskLevel = attrs.riskLevel;
              const lat = entity.lat !== undefined ? entity.lat : attrs.lat;
              const lng = entity.lng !== undefined ? entity.lng : attrs.lng;
              const color = entity.color || attrs.color || 'red';
              const name = entity.name || (entity as any).title || (entity as any).id;
              
              if (geojson) {
                let riskColor = 'gray';
                if (riskLevel === 'bajo' || riskLevel === 'low') riskColor = 'green';
                else if (riskLevel === 'medio' || riskLevel === 'medium') riskColor = 'yellow';
                else if (riskLevel === 'alto' || riskLevel === 'high') riskColor = 'red';
                else if (riskLevel === 'critico' || riskLevel === 'critical') riskColor = 'purple';
                
                const hexColor = COLOR_MAP[riskColor] || COLOR_MAP.red;
                
                return (
                  <GeoJSON 
                    key={`${entity.id}-geojson`} 
                    data={geojson} 
                    pathOptions={{ color: hexColor, fillColor: hexColor, fillOpacity: 0.2, weight: 2 }}
                  >
                    <Popup>
                      <h3 className="font-bold text-[#81ecff]">{name}</h3>
                      <p className="text-xs mt-1">{entity.description}</p>
                    </Popup>
                  </GeoJSON>
                );
              } else if (isPolygon) {
                const positions = polygon.map((p: { lat: number; lng: number }) => new L.LatLng(p.lat, p.lng));
                return (
                  <Polygon 
                    key={entity.id} 
                    positions={positions} 
                    pathOptions={{ color: COLOR_MAP[color] || COLOR_MAP.red, fillColor: COLOR_MAP[color] || COLOR_MAP.red, fillOpacity: 0.2, weight: 2 }}
                  >
                    <Popup>
                      <h3 className="font-bold text-[#81ecff]">{name}</h3>
                      <p className="text-xs mt-1">{entity.description}</p>
                    </Popup>
                  </Polygon>
                );
              } else if (lat !== undefined && lng !== undefined) {
                return (
                  <CircleMarker 
                    key={entity.id} 
                    center={[lat, lng]} 
                    radius={6}
                    pathOptions={{ color: '#ffffff', fillColor: COLOR_MAP[color] || COLOR_MAP.red, fillOpacity: 0.8, weight: 2 }}
                  >
                    <Popup>
                      <h3 className="font-bold text-[#81ecff]">{name}</h3>
                      <p className="text-xs mt-1">{entity.description}</p>
                    </Popup>
                  </CircleMarker>
                );
              }
              return null;
            })}

            {/* Active Polygon being drawn */}
            {activePolygonPoints.length > 0 && (
              <Polygon positions={activePolygonPoints} pathOptions={{ color: '#81ecff', fillColor: '#81ecff', fillOpacity: 0.2, weight: 2, dashArray: '5, 5' }} />
            )}
            {activePolygonPoints.map((pt, i) => (
              <CircleMarker key={i} center={pt} radius={4} pathOptions={{ color: '#000', fillColor: '#81ecff', fillOpacity: 1, weight: 1 }} />
            ))}

            {/* Earthquakes */}
            {showEarthquakes && earthquakeData?.features?.map((eq: { id: string; geometry: { coordinates: [number, number] }; properties: { mag: number; title: string; place: string } }) => {
              const [lng, lat] = eq.geometry.coordinates;
              const mag = eq.properties.mag;
              return (
                <CircleMarker key={eq.id} center={[lat, lng]} radius={Math.max(mag * 2, 3)} pathOptions={{ color: 'transparent', fillColor: '#ef4444', fillOpacity: 0.6 }}>
                  <Popup><div className="text-xs"><strong>{eq.properties.title}</strong><br/>Magnitude: {mag}</div></Popup>
                </CircleMarker>
              );
            })}

            {/* Flights */}
            {showFlights && flightsData.map((flight) => {
              if (!flight.lat || !flight.lon) return null;
              return (
                <CircleMarker key={flight.hex} center={[flight.lat, flight.lon]} radius={3} pathOptions={{ color: 'transparent', fillColor: '#ffffff', fillOpacity: 0.8 }}>
                  <Popup>
                    <div className="text-xs">
                      <strong>Callsign: {flight.flight || 'UNKNOWN'}</strong><br/>
                      Altitude: {flight.alt_baro ? `${flight.alt_baro} ft` : 'N/A'}<br/>
                      Speed: {flight.gs ? `${flight.gs} kts` : 'N/A'}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            {/* Wildfires (NASA GIBS Global Overlay) */}
            {showWildfires && (
              <TileLayer 
                url={`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_Thermal_Anomalies_375m_All/default/${new Date(Date.now() - 86400000).toISOString().split('T')[0]}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`}
                attribution="&copy; NASA GIBS"
                opacity={0.7}
                maxZoom={8}
                noWrap={true}
              />
            )}
            {showWildfires && wildfiresData.map((fire) => {
              const coords = fire.geometry[0].coordinates;
              if (!Array.isArray(coords) || coords.length < 2) return null;
              const [lng, lat] = coords;
              return (
                <CircleMarker key={fire.id} center={[lat, lng]} radius={4} pathOptions={{ color: '#ef4444', fillColor: '#f97316', fillOpacity: 0.8, weight: 1 }}>
                  <Popup><div className="text-xs"><strong>{fire.title}</strong></div></Popup>
                </CircleMarker>
              );
            })}

            {/* Severe Storms */}
            {showStorms && stormsData.map((storm) => {
              const coords = storm.geometry[0].coordinates;
              let lng: number, lat: number;
              if (Array.isArray(coords[0])) { [lng, lat] = coords[0]; } else { [lng, lat] = coords; }
              if (typeof lng !== 'number' || typeof lat !== 'number') return null;
              return (
                <CircleMarker key={storm.id} center={[lat, lng]} radius={5} pathOptions={{ color: '#ffffff', fillColor: '#06b6d4', fillOpacity: 0.8, weight: 1 }}>
                  <Popup><div className="text-xs"><strong>{storm.title}</strong></div></Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
          
          {drawingMode === 'polygon' && activePolygonPoints.length >= 3 && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-[1000]">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleFinishPolygon();
                }}
                className="px-5 py-2 bg-[#fff] text-[#000] font-medium rounded-full shadow-lg hover:bg-[#f0f0f0] transition-colors flex items-center gap-2 text-[11px] tracking-wider"
              >
                <Check className="w-3 h-3" /> SAVE POLYGON
              </button>
            </div>
          )}

          {/* scanline removed for minimalistic feel, or kept very subtle */}
          <div className="absolute inset-0 pointer-events-none z-[400] mix-blend-overlay opacity-5 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0)_0%,rgba(0,0,0,1)_100%)]"></div>
        </div>

        {/* Right Intel Feed / Asset Manager */}
        <div className={`transition-all duration-300 ease-in-out bg-[#000] flex flex-col z-[1000] h-full ${isRightPanelOpen ? 'w-[260px] border-l border-[#1a1a1a] shrink-0' : 'w-0 overflow-hidden border-none shrink-0'}`}>
          <div className="flex flex-col w-[260px] h-full">
            <div className="flex border-b border-[#1a1a1a] bg-[#000]">
            <button 
              onClick={() => setRightPanelTab('assets')}
              className={`flex-1 py-3 text-[9px] font-medium tracking-widest transition-colors ${rightPanelTab === 'assets' ? 'text-[#fff] border-b border-[#fff] bg-[#050505]' : 'text-[#a0a0a0] hover:text-[#fff]'}`}
            >
              ASSETS
            </button>
            <button 
              onClick={() => setRightPanelTab('feed')}
              className={`flex-1 py-3 text-[9px] font-medium tracking-widest transition-colors ${rightPanelTab === 'feed' ? 'text-[#fff] border-b border-[#fff] bg-[#050505]' : 'text-[#a0a0a0] hover:text-[#fff]'}`}
            >
              LIVE FEED
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
            {rightPanelTab === 'feed' && (
              <div className="space-y-4">
                {feedEvents.map(event => (
                  <div 
                    key={event.id} 
                    onClick={() => {
                      if (!mapInstance) return;
                      if (event.bounds) mapInstance.flyToBounds(event.bounds, { duration: 1.5, padding: [50, 50] });
                      else if (event.lat !== undefined && event.lng !== undefined) mapInstance.flyTo([event.lat, event.lng], 6, { duration: 1.5 });
                    }}
                    className={`pl-3 border-l ${event.lat || event.bounds ? 'cursor-pointer hover:bg-[#050505] transition-colors -ml-1 pl-4 py-1' : ''} ${
                      event.type === 'alert' ? 'border-[#ff4444]' : 
                      event.type === 'user' ? 'border-[#a0a0a0]' : 
                      'border-[#333]'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-0.5">
                      <span className={`text-[9px] font-medium tracking-wider ${
                        event.type === 'alert' ? 'text-[#ff4444]' : 
                        event.type === 'user' ? 'text-[#fff]' : 
                        'text-[#a0a0a0]'
                      }`}>
                        {event.type === 'alert' ? 'CRITICAL_ALERT' : event.type === 'user' ? 'USER_ACTION' : 'SYSTEM_LOG'}
                      </span>
                      <span className="text-[9px] text-[#525252]">{event.timestamp}</span>
                    </div>
                    <p className="text-[10px] text-[#a0a0a0]">{event.message}</p>
                  </div>
                ))}
              </div>
            )}

            {rightPanelTab === 'assets' && (
              <div className="space-y-2">
                {entities.length === 0 ? (
                  <div className="text-[10px] text-[#525252] text-center mt-10">
                    No tactical assets marked in this operation.
                  </div>
                ) : (
                  entities.map((entity) => {
                    const attrs = entity.metadata || {};
                    const isPolygon = (entity.polygon && entity.polygon.length >= 3) || (attrs.polygon && attrs.polygon.length >= 3) || attrs.geojson;
                    const name = entity.name || (entity as any).title || 'Unknown Asset';
                    
                    return (
                      <div 
                        key={entity.id}
                        onClick={() => handleLocateAsset(entity)}
                        className="group flex flex-col gap-2 p-3 bg-transparent border border-[#1a1a1a] hover:border-[#333] rounded cursor-pointer transition-all"
                      >
                        <div className="flex items-start gap-2">
                          <div className={`mt-0.5 w-4 h-4 rounded-sm flex items-center justify-center bg-[#111] transition-colors`}>
                            {isPolygon ? <Layers className="w-2.5 h-2.5 text-[#a0a0a0]" /> : <MapIcon className="w-2.5 h-2.5 text-[#a0a0a0]" />}
                          </div>
                          <div className="flex flex-col flex-1">
                            <span className="text-[11px] font-medium text-[#fff] truncate max-w-[170px] leading-tight">{name}</span>
                            <span className="text-[9px] text-[#525252] uppercase tracking-wider">{isPolygon ? 'Area/Polygon' : 'Point Marker'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
          <div className="p-4 border-t border-[#1a1a1a] bg-[#000]">
            <div className="flex justify-between text-[9px] text-[#525252] tracking-widest">
              <div className="flex flex-col gap-0.5">
                <span>PROC</span>
                <span className="text-[#a0a0a0] font-medium">OPT</span>
              </div>
              <div className="flex flex-col gap-0.5 text-center">
                <span>MEM</span>
                <span className="text-[#a0a0a0] font-medium">STABLE</span>
              </div>
              <div className="flex flex-col gap-0.5 text-right">
                <span>NET</span>
                <span className="text-[#a0a0a0] font-medium">SECURE</span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {isModalOpen && (
        <LocationModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setActivePolygonPoints([]);
          }}
          lat={clickCoords.lat}
          lng={clickCoords.lng}
          onAddLocation={async (data) => {
            let caseId = activeCaseId;
            if (!caseId) {
              caseId = crypto.randomUUID();
              await addCase({
                id: caseId,
                codeName: "OP-GEOINT",
                title: "Global GeoInt Operations",
                description: "Auto-generated case for global geographic intelligence.",
                status: "active",
                priority: "medium",
                classification: "CONFIDENTIAL",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                leadInvestigator: currentUser?.displayName || "OPERATIVE",
                team: [],
                stats: { entityCount: 0, locationCount: 0, eventCount: 0, toolResultsCount: 0, evidenceCount: 0 },
                tags: ["geoint", "global"],
                activityLog: []
              });
              setActiveCase(caseId);
            }
            
            addEntity({
              id: crypto.randomUUID(),
              caseId: caseId,
              type: 'LOCATION',
              name: data.name,
              description: data.description,
              lat: data.lat,
              lng: data.lng,
              color: data.color,
              polygon: activePolygonPoints.length >= 3 ? activePolygonPoints.map(p => ({ lat: p.lat, lng: p.lng })) : undefined
            });
            setActivePolygonPoints([]);
          }}
          onMarkCountry={async (data) => {
            let caseId = activeCaseId;
            if (!caseId) {
              caseId = crypto.randomUUID();
              await addCase({
                id: caseId,
                codeName: "OP-GEOINT",
                title: "Global GeoInt Operations",
                description: "Auto-generated case for global geographic intelligence.",
                status: "active",
                priority: "medium",
                classification: "CONFIDENTIAL",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                leadInvestigator: currentUser?.displayName || "OPERATIVE",
                team: [],
                stats: { entityCount: 0, locationCount: 0, eventCount: 0, toolResultsCount: 0, evidenceCount: 0 },
                tags: ["geoint", "global"],
                activityLog: []
              });
              setActiveCase(caseId);
            }

            addEntity({
              id: crypto.randomUUID(),
              caseId: caseId,
              type: 'LOCATION',
              name: data.name,
              description: `Risk Level: ${data.riskLevel} (${data.riskScore}/10)`,
              lat: data.lat,
              lng: data.lng,
              metadata: {
                countryCode: data.code,
                riskLevel: data.riskLevel,
                riskScore: data.riskScore,
                geojson: data.geojson
              }
            });
            setActivePolygonPoints([]);
          }}
        />
      )}
    </div>
  );
}
