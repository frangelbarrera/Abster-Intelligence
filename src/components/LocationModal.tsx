import React, { useState, useEffect } from 'react';
import { X, MapPin, Globe, Check, AlertTriangle } from 'lucide-react';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lng: number;
  onAddLocation: (data: any) => void;
  onMarkCountry: (data: any) => void;
}

const MARKER_COLORS = [
  { id: 'red', label: 'Target / High Risk', color: 'bg-red-500' },
  { id: 'blue', label: 'Ally / Witness', color: 'bg-blue-500' },
  { id: 'green', label: 'Point of Interest', color: 'bg-emerald-500' },
  { id: 'yellow', label: 'Alert', color: 'bg-amber-500' },
  { id: 'purple', label: 'Safe / Base', color: 'bg-purple-500' },
  { id: 'gray', label: 'Generic', color: 'bg-slate-500' },
];

const RISK_LEVELS = [
  { id: 'bajo', label: 'Low', color: 'bg-emerald-500' },
  { id: 'medio', label: 'Medium', color: 'bg-amber-500' },
  { id: 'alto', label: 'High', color: 'bg-red-500' },
  { id: 'critico', label: 'Critical', color: 'bg-purple-500' },
];

export function LocationModal({ isOpen, onClose, lat, lng, onAddLocation, onMarkCountry }: LocationModalProps) {
  const [activeTab, setActiveTab] = useState<'location' | 'country'>('location');
  
  // Location State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [markerColor, setMarkerColor] = useState('gray');
  
  // Country State
  const [countryData, setCountryData] = useState<any>(null);
  const [loadingCountry, setLoadingCountry] = useState(false);
  const [riskLevel, setRiskLevel] = useState('medio');
  const [riskScore, setRiskScore] = useState(5);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setMarkerColor('gray');
      setRiskLevel('medio');
      setRiskScore(5);
      setActiveTab('location');
      
      // Fetch country data
      const fetchCountry = async () => {
        setLoadingCountry(true);
        try {
          let countryCode = null;
          let geojson = null;
          let countryName = '';

          // 1. Get Country Code, Name, and simplified GeoJSON directly from Nominatim Reverse Geocoding
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            const nomRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&polygon_geojson=1&zoom=3&polygon_threshold=0.01`, {
              signal: controller.signal,
              headers: { 'Accept-Language': 'en' } // Remove custom user-agent for browser
            });
            clearTimeout(timeoutId);
            const nomData = await nomRes.json();
            if (nomData && nomData.address && nomData.address.country_code) {
              countryCode = nomData.address.country_code;
              geojson = nomData.geojson || null;
              countryName = nomData.address.country || nomData.name || '';
            }
          } catch (e) {
            console.warn("Nominatim reverse geocode failed", e);
          }

          // 2. Fallback to BigDataCloud ONLY IF Nominatim failed
          if (!countryCode) {
            try {
              const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
              if (geoRes.ok) {
                const geoData = await geoRes.json();
                countryCode = geoData.countryCode;
              }
            } catch (e) {
              console.warn("BigDataCloud fallback failed", e);
            }
          }

          if (!countryCode) {
            setCountryData(null);
            setLoadingCountry(false);
            return;
          }

          // 3. Get detailed Country info from RestCountries
          let countryDetails = null;
          try {
            const restRes = await fetch(`https://restcountries.com/v3.1/alpha/${countryCode}`);
            if (restRes.ok) {
              const restData = await restRes.json();
              countryDetails = restData[0];
            }
          } catch(e) {
            console.warn("RestCountries fetch failed", e);
          }

          // 4. If Nominatim Reverse didn't give geojson, try search with countryCode and q
          if (!geojson && countryDetails) {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 6000);
              const queryStr = encodeURIComponent(countryDetails.name.common || countryName);
              const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${queryStr}&countrycodes=${countryCode}&format=json&polygon_geojson=1&limit=1&polygon_threshold=0.01`, {
                signal: controller.signal,
                headers: { 'Accept-Language': 'en' }
              });
              clearTimeout(timeoutId);
              const nomData = await nomRes.json();
              if (nomData && nomData.length > 0 && nomData[0].geojson) {
                geojson = nomData[0].geojson;
              }
            } catch (e) {
              console.warn("Nominatim fallback search failed", e);
            }
          }

          setCountryData({
            name: countryDetails?.translations?.eng?.common || countryDetails?.name?.common || countryName || countryCode.toUpperCase(),
            capital: countryDetails?.capital?.[0] || 'N/A',
            population: countryDetails?.population || 0,
            code: countryCode,
            geojson: geojson
          });
        } catch (e) {
          console.error("Error fetching country:", e);
          setCountryData(null);
        } finally {
          setLoadingCountry(false);
        }
      };
      
      fetchCountry();
    }
  }, [isOpen, lat, lng]);

  if (!isOpen) return null;

  const formatPopulation = (pop: number) => {
    if (pop >= 1000000) return (pop / 1000000).toFixed(1) + 'M';
    if (pop >= 1000) return (pop / 1000).toFixed(1) + 'K';
    return pop.toString();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111111] border border-white/10 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        
        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button 
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'location' ? 'bg-white/5 text-white border-b-2 border-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
            onClick={() => setActiveTab('location')}
          >
            <MapPin className="w-4 h-4" />
            Add Location
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'country' ? 'bg-white/5 text-white border-b-2 border-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
            onClick={() => setActiveTab('country')}
          >
            <Globe className="w-4 h-4" />
            Mark Country
          </button>
          <button onClick={onClose} className="p-3 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[80vh]">
          {activeTab === 'location' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., Limassol" 
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Relevant information about this location..." 
                  rows={3}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Latitude <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    readOnly 
                    value={lat?.toFixed(6) || ''} 
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Longitude <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    readOnly 
                    value={lng?.toFixed(6) || ''} 
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Marker Color</label>
                <div className="grid grid-cols-2 gap-2">
                  {MARKER_COLORS.map(color => (
                    <button
                      key={color.id}
                      onClick={() => setMarkerColor(color.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all ${markerColor === color.id ? 'bg-white/10 border-white/20 text-white' : 'bg-[#0a0a0a] border-white/5 text-slate-400 hover:border-white/10 hover:bg-white/5'}`}
                    >
                      <div className={`w-3 h-3 rounded-full ${color.color}`} />
                      <span className="truncate">{color.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {loadingCountry ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              ) : countryData ? (
                <>
                  <div className="flex items-center gap-2 text-xl font-bold text-white">
                    <Globe className="w-5 h-5 text-slate-400" />
                    {countryData.name}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#0a0a0a] border border-white/5 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                        <MapPin className="w-3.5 h-3.5" /> Capital
                      </div>
                      <div className="font-semibold text-white">{countryData.capital}</div>
                    </div>
                    <div className="bg-[#0a0a0a] border border-white/5 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                        <Globe className="w-3.5 h-3.5" /> Population
                      </div>
                      <div className="font-semibold text-white">{formatPopulation(countryData.population)}</div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-slate-300 mb-3">
                      <AlertTriangle className="w-4 h-4" /> AML Risk Level
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {RISK_LEVELS.map(level => (
                        <button
                          key={level.id}
                          onClick={() => setRiskLevel(level.id)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-all ${riskLevel === level.id ? 'bg-white/10 border-white/20 text-white' : 'bg-[#0a0a0a] border-white/5 text-slate-400 hover:border-white/10 hover:bg-white/5'}`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${level.color}`} />
                            {level.label}
                          </div>
                          {riskLevel === level.id && <Check className="w-4 h-4 text-slate-300" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#0a0a0a] border border-white/5 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm text-slate-300">Risk Score</span>
                      <span className="text-amber-500 font-bold">{riskScore}/10</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      value={riskScore}
                      onChange={e => setRiskScore(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Could not identify the country at this location.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#0a0a0a] flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-white/10 text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          {activeTab === 'location' ? (
            <button 
              onClick={() => {
                if (!name) return;
                onAddLocation({ name, description, lat, lng, color: markerColor });
                onClose();
              }}
              disabled={!name}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-sm font-medium text-white hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Add Location
            </button>
          ) : (
            <button 
              onClick={() => {
                if (!countryData) return;
                onMarkCountry({ ...countryData, riskLevel, riskScore, lat, lng });
                onClose();
              }}
              disabled={!countryData}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-sm font-medium text-white hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Mark Country
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
