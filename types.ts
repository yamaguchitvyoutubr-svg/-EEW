export interface TimeZoneConfig {
  id: string;
  label: string;
  subLabel?: string;
  zone: string;
  lat: number;
  lon: number;
  colorClass?: string; // Tailwind text color class
}