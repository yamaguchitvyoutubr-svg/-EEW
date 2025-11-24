import { TimeZoneConfig } from './types';

export const WORLD_ZONES: TimeZoneConfig[] = [
  {
    id: 'jp',
    label: 'TYO',
    subLabel: 'TOKYO',
    zone: 'Asia/Tokyo',
    lat: 35.6895,
    lon: 139.6917,
  },
  {
    id: 'uk',
    label: 'LON',
    subLabel: 'LONDON',
    zone: 'Europe/London',
    lat: 51.5074,
    lon: -0.1278,
  },
  {
    id: 'de',
    label: 'BER',
    subLabel: 'BERLIN',
    zone: 'Europe/Berlin',
    lat: 52.5200,
    lon: 13.4050,
  },
  {
    id: 'ru-omsk',
    label: 'OMS',
    subLabel: 'OMSK',
    zone: 'Asia/Omsk',
    lat: 54.9885,
    lon: 73.3242,
  },
  {
    id: 'sg',
    label: 'SGP',
    subLabel: 'SINGAPORE',
    zone: 'Asia/Singapore',
    lat: 1.3521,
    lon: 103.8198,
  }
];