import React from 'react';
import { WORLD_ZONES } from '../constants';
import { CityCard } from './CityCard';

interface WorldGridProps {
  date: Date;
}

export const WorldGrid: React.FC<WorldGridProps> = ({ date }) => {
  return (
    // Adjusted grid:
    // md: 2 columns
    // lg: 3 columns (3 top, 2 bottom centered by grid flow? No, grid items will align left. To center last row, flex is better, but grid is more rigid)
    // xl: 5 columns (all in one row)
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 w-full">
      {WORLD_ZONES.map((zone) => (
        <CityCard key={zone.id} config={zone} baseDate={date} />
      ))}
    </div>
  );
};