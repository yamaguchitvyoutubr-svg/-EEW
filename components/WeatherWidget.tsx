import React, { useState, useEffect, useRef } from 'react';
import { getWeatherLabel } from '../utils/weatherUtils';

interface WeatherData {
  temperature: number;
  weatherCode: number;
}

export const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{lat: number, lon: number} | null>(null);
  const [testMode, setTestMode] = useState(false);
  
  // Search State
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchWeatherData = (lat: number, lon: number) => {
    setLoading(true);
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`)
      .then(res => res.json())
      .then(data => {
        if (data.current) {
          setWeather({
            temperature: data.current.temperature_2m,
            weatherCode: data.current.weather_code
          });
          setError(null);
        } else {
          console.warn('Weather data missing structure:', data);
          setError('DATA UNAVAILABLE');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Weather fetch error:', err);
        setError('FETCH FAILED');
        setLoading(false);
      });
  };

  const handleRefresh = () => {
    if (coords) {
        fetchWeatherData(coords.lat, coords.lon);
    }
  };
  
  const handleSearch = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchQuery.trim()) return;
      
      setLoading(true);
      try {
          const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=1&language=en&format=json`);
          const data = await res.json();
          
          if (data.results && data.results.length > 0) {
              const { latitude, longitude, name, country } = data.results[0];
              const newCoords = { lat: latitude, lon: longitude };
              setCoords(newCoords);
              setSearchQuery(`${name}, ${country || ''}`);
              fetchWeatherData(latitude, longitude);
              setIsSearching(false);
          } else {
              setError('LOCATION NOT FOUND');
              setLoading(false);
          }
      } catch (err) {
          setError('SEARCH FAILED');
          setLoading(false);
      }
  };

  // Focus input when searching starts
  useEffect(() => {
      if (isSearching) {
          searchInputRef.current?.focus();
      }
  }, [isSearching]);

  useEffect(() => {
    setLoading(true);
    if (!navigator.geolocation) {
      setError('GPS UNSUPPORTED');
      setLoading(false);
      return;
    }

    const geoOptions = {
        enableHighAccuracy: false, // Set false for better compatibility/speed on mobile
        timeout: 10000,
        maximumAge: 60000
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lon: longitude });
        
        // Initial Fetch
        fetchWeatherData(latitude, longitude);

        // Set Interval for 15 minutes
        const intervalId = setInterval(() => {
            fetchWeatherData(latitude, longitude);
        }, 15 * 60 * 1000);

        return () => clearInterval(intervalId);
      },
      (err) => {
        console.warn("Geo Error", err);
        setError('GPS SIGNAL LOST');
        setLoading(false);
        // Don't clear interval as it wasn't set yet
      },
      geoOptions
    );
  }, []);

  // Determine display data (Real or Test)
  let displayWeather = weather;
  
  if (testMode) {
      displayWeather = { temperature: 35.5, weatherCode: 95 }; // Simulated Thunderstorm
  }

  // WMO Code interpretation for alerts
  const isSevere = displayWeather ? (
      displayWeather.weatherCode >= 95 || // Thunderstorm
      (displayWeather.weatherCode >= 66 && displayWeather.weatherCode <= 67) || // Freezing Rain
      (displayWeather.weatherCode >= 56 && displayWeather.weatherCode <= 57) // Freezing Drizzle
  ) : false;

  const alertLabel = isSevere ? "WARNING: SEVERE WEATHER" : "";

  // If loading initially without data
  if (loading && !displayWeather && !error) {
    return (
      <div className="text-cyan-500/50 text-xs font-mono tracking-widest mt-6 animate-pulse">
        ACQUIRING SATELLITE LOCK...
      </div>
    );
  }

  // Allow rendering even with error so user can search
  const showContent = displayWeather || error;
  if (!showContent && !testMode && !isSearching) return null;

  return (
    <div className="flex flex-col items-center mt-6 animate-[fadeIn_1s_ease-out] w-full max-w-2xl relative">
      
      {/* Controls Container */}
      <div className="w-full flex justify-end items-center gap-2 mb-1 px-1">
        <button 
            onClick={() => setTestMode(!testMode)}
            className={`text-[10px] tracking-widest px-2 py-0.5 border rounded-sm transition-colors ${testMode ? 'bg-orange-900/50 border-orange-500 text-orange-200' : 'border-slate-800 text-slate-600 hover:text-slate-400'}`}
        >
            {testMode ? 'END TEST' : 'TEST SYSTEM'}
        </button>
      </div>

      <div className={`w-full flex items-center justify-between gap-4 md:gap-8 border px-6 py-2 rounded-sm backdrop-blur-sm relative group transition-colors duration-500 ${isSevere ? 'bg-red-950/30 border-red-800 shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'bg-slate-900/40 border-slate-800'}`}>
        
        {/* Alert Indicator */}
        {isSevere && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-sm tracking-widest animate-pulse whitespace-nowrap shadow-md z-20">
                {alertLabel}
            </div>
        )}

        {/* Location / Search Area */}
        <div className="flex flex-col items-end border-r border-slate-700 pr-4 relative min-w-[140px]">
            <span className="text-[10px] text-slate-500 tracking-widest mb-0.5">TARGET LOCATION</span>
            
            {isSearching ? (
                <form onSubmit={handleSearch} className="flex items-center w-full">
                    <input 
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="CITY NAME..."
                        className="bg-black/50 text-cyan-400 text-xs font-mono border-b border-cyan-500 outline-none w-full uppercase tracking-wider p-1"
                        onBlur={() => !searchQuery && setIsSearching(false)}
                    />
                </form>
            ) : (
                <div className="flex items-center gap-2 group/loc">
                    <button 
                        onClick={() => setIsSearching(true)}
                        className={`text-xs font-digital tracking-wider hover:text-cyan-400 transition-colors border-b border-transparent hover:border-cyan-500/50 ${error ? 'text-red-400' : 'text-slate-300'}`}
                        title="Click to manually search location"
                    >
                        {testMode ? 'SIMULATION' : (error ? 'MANUAL OVERRIDE REQ.' : (coords ? `${coords.lat.toFixed(2)} / ${coords.lon.toFixed(2)}` : '---'))}
                    </button>
                    
                    {!error && !testMode && (
                        <button 
                            onClick={handleRefresh}
                            disabled={loading}
                            className={`text-slate-600 hover:text-cyan-400 transition-colors focus:outline-none ${loading ? 'animate-spin' : ''}`}
                            title="Refresh Data"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 4v6h-6"></path>
                                <path d="M1 20v-6h6"></path>
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                            </svg>
                        </button>
                    )}
                </div>
            )}
        </div>

        {/* Condition */}
        <div className="flex flex-col items-center flex-1 relative">
            <span className="text-[10px] text-slate-500 tracking-widest mb-0.5">CONDITION</span>
            <span className={`text-lg font-sans tracking-widest uppercase text-center whitespace-nowrap ${isSevere ? 'text-red-200 drop-shadow-[0_0_5px_rgba(220,38,38,0.5)]' : 'text-cyan-100 drop-shadow-[0_0_5px_rgba(34,211,238,0.3)]'}`}>
                {displayWeather ? getWeatherLabel(displayWeather.weatherCode) : (error ? 'NO SIGNAL' : '---')}
            </span>
        </div>

        {/* Temperature */}
        <div className="flex flex-col items-start border-l border-slate-700 pl-4 min-w-[80px]">
            <span className="text-[10px] text-slate-500 tracking-widest mb-0.5">TEMP</span>
            <span className="text-xl text-white font-digital tracking-widest font-bold italic drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
                {displayWeather ? displayWeather.temperature : '--'}<span className="text-sm ml-1 text-slate-400">°C</span>
            </span>
        </div>
      </div>
      
      <div className="w-full flex justify-between mt-1">
        <div className="text-[10px] text-slate-600 tracking-[0.3em] uppercase font-light">
            Local Meteorological Sensor
        </div>
        {error && !isSearching && (
             <button onClick={() => setIsSearching(true)} className="text-[9px] text-red-400/80 tracking-wider hover:text-red-300 animate-pulse">
                [CLICK COORDS TO SEARCH]
             </button>
        )}
      </div>
    </div>
  );
};