import React, { useMemo, useState, useEffect } from 'react';
import { TimeZoneConfig } from '../types';
import { getWeatherLabel } from '../utils/weatherUtils';

interface CityCardProps {
  config: TimeZoneConfig;
  baseDate: Date;
}

export const CityCard: React.FC<CityCardProps> = ({ config, baseDate }) => {
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);

  // Time calculation logic
  const { time, dateDiff } = useMemo(() => {
    // 1. Get time string for target zone
    const timeFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: config.zone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    
    // 2. Calculate offset relative to local time
    const targetDateString = new Intl.DateTimeFormat('en-US', {
      timeZone: config.zone,
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false
    }).format(baseDate);

    const localDateString = new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false
    }).format(baseDate);

    const targetDateObj = new Date(targetDateString);
    const localDateObj = new Date(localDateString);
    
    const diffMs = targetDateObj.getTime() - localDateObj.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));

    let dayLabel = "TODAY";
    if (targetDateObj.getDate() !== localDateObj.getDate()) {
        if (diffHours > 0) dayLabel = "TOMORROW";
        if (diffHours < 0) dayLabel = "YESTERDAY";
    }

    const sign = diffHours > 0 ? "+" : ""; 
    const offsetString = diffHours === 0 ? "SAME TIME" : `${sign}${diffHours} HRS`;

    return {
      time: timeFormatter.format(baseDate),
      dateDiff: `${dayLabel}, ${offsetString}`
    };
  }, [config.zone, baseDate]);

  // Weather fetching logic
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${config.lat}&longitude=${config.lon}&current=temperature_2m,weather_code&timezone=auto`
        );
        const data = await res.json();
        if (data.current) {
          setWeather({
            temp: data.current.temperature_2m,
            code: data.current.weather_code,
          });
        }
      } catch (error) {
        // Silently fail for individual cards to keep UI clean
        console.error(`Weather fetch failed for ${config.label}`, error);
      }
    };

    fetchWeather();
    // Refresh weather every 30 minutes
    const intervalId = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [config.lat, config.lon, config.label]);

  // Severe weather check
  const isSevere = weather ? (
      weather.code >= 95 || // Thunderstorm
      (weather.code >= 66 && weather.code <= 67) || // Freezing Rain
      (weather.code >= 56 && weather.code <= 57) // Freezing Drizzle
  ) : false;

  return (
    <div className={`border p-3 flex flex-col justify-between h-28 md:h-32 relative group overflow-hidden rounded-sm transition-colors ${isSevere ? 'bg-red-950/20 border-red-900 hover:border-red-700' : 'bg-[#161616] border-[#2a2a2a] hover:border-[#3a3a3a]'}`}>
      
      {/* Header */}
      <div className="flex justify-between items-start z-10 w-full">
        <div className="flex flex-col">
            <h3 className="text-slate-300 font-sans font-bold text-base tracking-wider leading-none">
                {config.label}
            </h3>
            {config.subLabel && (
                <span className="text-[9px] text-slate-600 tracking-widest mt-0.5 font-mono">
                    {config.subLabel}
                </span>
            )}
        </div>
        
        {/* Weather Info (Mini) */}
        {weather ? (
            <div className="flex flex-col items-end text-right">
                <div className="flex items-center gap-1">
                    {isSevere && (
                        <span className="text-[8px] text-red-500 animate-pulse font-bold">⚠</span>
                    )}
                    <span className={`text-[9px] font-sans tracking-wider uppercase ${isSevere ? 'text-red-400' : 'text-cyan-400/80'}`}>
                        {getWeatherLabel(weather.code)}
                    </span>
                </div>
                <span className="text-[10px] text-slate-400 font-digital tracking-widest">
                    {weather.temp}°C
                </span>
            </div>
        ) : (
            <div className="h-6" /> /* Placeholder to prevent jump */
        )}
      </div>

      {/* Time */}
      <div className="flex justify-center items-center z-10 flex-grow">
         <div className="text-3xl lg:text-4xl font-digital text-white tracking-widest tabular-nums drop-shadow-md font-bold italic">
            {time}
         </div>
      </div>

      {/* Footer */}
      <div className="text-center text-slate-400 text-[10px] md:text-xs font-sans z-10 tracking-wide">
        {dateDiff}
      </div>
      
      {/* Subtle Overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none"></div>
    </div>
  );
};