import { useState, useEffect } from 'react';

export const useClock = () => {
  const [date, setDate] = useState<Date>(new Date());

  useEffect(() => {
    // Align update with the next second for smoother ticking
    const now = new Date();
    const delay = 1000 - now.getMilliseconds();

    let intervalId: ReturnType<typeof setInterval>;

    const timeoutId = setTimeout(() => {
      setDate(new Date());
      intervalId = setInterval(() => {
        setDate(new Date());
      }, 1000);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return { date };
};