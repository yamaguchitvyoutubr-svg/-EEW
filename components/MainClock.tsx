import React, { useMemo } from 'react';

interface MainClockProps {
  date: Date;
}

export const MainClock: React.FC<MainClockProps> = ({ date }) => {
  const timeString = useMemo(() => {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
  }, [date]);

  const dateString = useMemo(() => {
    // Format: NOVEMBER 22, 2025 (SAT)
    const datePart = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
    
    const dayPart = new Intl.DateTimeFormat('en-US', {
        weekday: 'short'
    }).format(date).toUpperCase();

    return `${datePart.toUpperCase()} (${dayPart})`;
  }, [date]);

  return (
    <div className="flex flex-col items-center select-none">
        <div className="text-slate-400 text-base md:text-lg mb-2 font-light tracking-wider">
            CURRENT TIME
        </div>
        
        <div className="font-digital text-7xl md:text-[8rem] leading-none tracking-widest text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] tabular-nums font-bold italic">
            {timeString}
        </div>
        
        <div className="mt-4 text-slate-400 text-lg md:text-xl font-light tracking-widest uppercase">
            {dateString}
        </div>
    </div>
  );
};