export const getWeatherLabel = (code: number): string => {
  if (code === 0) return 'CLEAR SKY';
  if (code === 1) return 'MAINLY CLEAR';
  if (code === 2) return 'PARTLY CLOUDY';
  if (code === 3) return 'OVERCAST';
  if (code >= 45 && code <= 48) return 'FOG';
  if (code >= 51 && code <= 55) return 'DRIZZLE';
  if (code >= 56 && code <= 57) return 'FREEZING DRIZZLE';
  if (code >= 61 && code <= 65) return 'RAIN';
  if (code >= 66 && code <= 67) return 'FREEZING RAIN';
  if (code >= 71 && code <= 77) return 'SNOW';
  if (code >= 80 && code <= 82) return 'RAIN SHOWERS';
  if (code >= 85 && code <= 86) return 'SNOW SHOWERS';
  if (code >= 95) return 'THUNDERSTORM';
  if (code >= 96 && code <= 99) return 'THUNDERSTORM/HAIL';
  return 'UNKNOWN';
};