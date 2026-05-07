import { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography, Marker, Sphere } from 'react-simple-maps';
import worldAtlas from 'world-atlas/countries-110m.json';
import Reveal from './Reveal';

const REGION_CONFIG = {
  'United States': {
    isoA2: 'US',
    isoA3: 'USA',
    isoN3: '840',
    aliases: ['United States', 'United States of America', 'USA'],
    coordinates: [-98.5795, 39.8283],
  },
  Germany: {
    isoA2: 'DE',
    isoA3: 'DEU',
    isoN3: '276',
    aliases: ['Germany', 'Federal Republic of Germany'],
    coordinates: [10.4515, 51.1657],
  },
  Poland: {
    isoA2: 'PL',
    isoA3: 'POL',
    isoN3: '616',
    aliases: ['Poland', 'Republic of Poland'],
    coordinates: [19.1451, 51.9194],
  },
  Austria: {
    isoA2: 'AT',
    isoA3: 'AUT',
    isoN3: '040',
    aliases: ['Austria', 'Republic of Austria'],
    coordinates: [14.5501, 47.5162],
  },
  Switzerland: {
    isoA2: 'CH',
    isoA3: 'CHE',
    isoN3: '756',
    aliases: ['Switzerland', 'Swiss Confederation'],
    coordinates: [8.2275, 46.8182],
  },
  'United Kingdom': {
    isoA2: 'GB',
    isoA3: 'GBR',
    isoN3: '826',
    aliases: ['United Kingdom', 'United Kingdom of Great Britain and Northern Ireland', 'Great Britain'],
    coordinates: [-3.436, 55.3781],
  },
  Spain: {
    isoA2: 'ES',
    isoA3: 'ESP',
    isoN3: '724',
    aliases: ['Spain', 'Kingdom of Spain'],
    coordinates: [-3.7492, 40.4637],
  },
  Italy: {
    isoA2: 'IT',
    isoA3: 'ITA',
    isoN3: '380',
    aliases: ['Italy', 'Italian Republic'],
    coordinates: [12.5674, 41.8719],
  },
};

const ACTIVE_REGION_NAMES = ['United States', 'Germany', 'Poland', 'Austria', 'Switzerland'];

const UPCOMING_REGION_NAMES = ['United Kingdom', 'Spain', 'Italy'];

const projectionConfig = {
  scale: 165,
  center: [8, 43],
};

const readGeoProperties = (geo) => ({
  id: String(geo.id || '').padStart(3, '0'),
  name: String(
    geo.properties?.name ||
    geo.properties?.NAME ||
    geo.properties?.NAME_LONG ||
    geo.properties?.ADMIN ||
    ''
  ),
  isoA2: String(geo.properties?.ISO_A2 || geo.properties?.iso_a2 || ''),
  isoA3: String(geo.properties?.ISO_A3 || geo.properties?.iso_a3 || ''),
});

const regionMatchesGeo = (regionName, geo) => {
  const config = REGION_CONFIG[regionName];
  if (!config) return false;

  const props = readGeoProperties(geo);
  const normalizedName = props.name.trim().toLowerCase();

  return (
    props.id === config.isoN3 ||
    props.isoA2.toUpperCase() === config.isoA2 ||
    props.isoA3.toUpperCase() === config.isoA3 ||
    config.aliases.some((alias) => alias.toLowerCase() === normalizedName)
  );
};

export default function WorldMapPanel({ regions }) {
  const [activeCountry, setActiveCountry] = useState(null);

  const activeRegions = useMemo(
    () => regions.filter((region) => ACTIVE_REGION_NAMES.includes(region.name)),
    [regions],
  );

  const upcomingRegions = useMemo(
    () => regions.filter((region) => UPCOMING_REGION_NAMES.includes(region.name)),
    [regions],
  );

  const allRegions = useMemo(() => [...activeRegions, ...upcomingRegions], [activeRegions, upcomingRegions]);

  const handleEnter = (countryName) => setActiveCountry(countryName);
  const handleLeave = () => setActiveCountry(null);

  return (
    <div className="space-y-10">
      <Reveal className="relative overflow-hidden rounded-[2rem] border border-[rgba(200,169,107,0.32)] bg-[radial-gradient(circle_at_50%_45%,rgba(200,169,107,0.18),transparent_36%),linear-gradient(165deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01))] p-4 backdrop-blur-xl md:p-8">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:34px_34px] opacity-20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(200,169,107,0.1),transparent_48%)]" />
        <div className="pointer-events-none absolute -left-28 top-16 h-56 w-56 rounded-full bg-[rgba(200,169,107,0.1)] blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-10 h-60 w-60 rounded-full bg-[rgba(168,142,86,0.1)] blur-3xl" />

        <ComposableMap
          projection="geoMercator"
          projectionConfig={projectionConfig}
          width={1000}
          height={520}
          className="relative z-10 h-full w-full"
          role="img"
          aria-label="World map showing active and upcoming NextStep Talent regions"
        >
          <defs>
            <linearGradient id="nst-active-fill" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#f4dfb2" />
              <stop offset="100%" stopColor="#c8a96b" />
            </linearGradient>
            <linearGradient id="nst-upcoming-fill" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(200,169,107,0.22)" />
              <stop offset="100%" stopColor="rgba(200,169,107,0.08)" />
            </linearGradient>
            <filter id="nst-country-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="nst-country-glow-strong" x="-70%" y="-70%" width="240%" height="240%">
              <feGaussianBlur stdDeviation="8" result="blurStrong" />
              <feMerge>
                <feMergeNode in="blurStrong" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <Sphere fill="rgba(255,255,255,0.02)" stroke="rgba(200,169,107,0.18)" strokeWidth={0.8} />

          <Geographies geography={worldAtlas}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const matchedRegion = allRegions.find((region) => regionMatchesGeo(region.name, geo));
                const isActiveRegion = Boolean(matchedRegion && matchedRegion.status === 'active');
                const isUpcomingRegion = Boolean(matchedRegion && matchedRegion.status === 'upcoming');
                const isFocused = activeCountry ? matchedRegion?.name === activeCountry : false;

                let fill = 'rgba(255,255,255,0.04)';
                let stroke = 'rgba(200,169,107,0.16)';
                let opacity = 0.58;
                let strokeWidth = 0.7;
                let filter = 'none';

                if (isActiveRegion) {
                  fill = 'url(#nst-active-fill)';
                  stroke = isFocused ? 'rgba(255,245,219,0.98)' : 'rgba(244,223,178,0.86)';
                  opacity = isFocused ? 1 : 0.9;
                  strokeWidth = isFocused ? 1.55 : 1.05;
                  filter = isFocused ? 'url(#nst-country-glow-strong)' : 'url(#nst-country-glow)';
                }

                if (isUpcomingRegion) {
                  fill = 'url(#nst-upcoming-fill)';
                  stroke = isFocused ? 'rgba(233,212,164,0.9)' : 'rgba(200,169,107,0.54)';
                  opacity = isFocused ? 0.93 : 0.72;
                  strokeWidth = isFocused ? 1.08 : 0.95;
                  filter = isFocused ? 'url(#nst-country-glow)' : 'none';
                }

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => {
                      if (matchedRegion) handleEnter(matchedRegion.name);
                    }}
                    onMouseLeave={handleLeave}
                    onClick={() => {
                      if (matchedRegion) handleEnter(matchedRegion.name);
                    }}
                    style={{
                      default: {
                        fill,
                        stroke,
                        opacity,
                        strokeWidth,
                        outline: 'none',
                        transition: 'opacity 240ms ease, fill 240ms ease, stroke 240ms ease, stroke-width 240ms ease, filter 240ms ease',
                        filter,
                      },
                      hover: {
                        fill,
                        stroke,
                        opacity,
                        strokeWidth,
                        outline: 'none',
                        filter,
                      },
                      pressed: {
                        fill,
                        stroke,
                        opacity,
                        strokeWidth,
                        outline: 'none',
                        filter,
                      },
                    }}
                  />
                );
              })
            }
          </Geographies>

          {allRegions.map((region) => {
            const isUpcoming = region.status === 'upcoming';
            const isFocused = activeCountry === region.name;
            const markerCoordinates = REGION_CONFIG[region.name]?.coordinates || [region.lng, region.lat];

            return (
              <Marker
                key={region.name}
                coordinates={markerCoordinates}
                onMouseEnter={() => handleEnter(region.name)}
                onMouseLeave={handleLeave}
                onClick={() => handleEnter(region.name)}
              >
                <g style={{ cursor: 'pointer' }}>
                  <title>{region.name}</title>
                  <circle
                    r={isUpcoming ? 12 : 13}
                    fill={isUpcoming ? 'rgba(200,169,107,0.12)' : 'rgba(200,169,107,0.24)'}
                    stroke={isUpcoming ? (isFocused ? 'rgba(220,194,142,0.72)' : 'rgba(200,169,107,0.35)') : (isFocused ? 'rgba(255,245,219,1)' : 'rgba(244,223,178,0.82)')}
                    strokeWidth={isUpcoming ? (isFocused ? 1.15 : 1) : (isFocused ? 1.65 : 1.4)}
                    strokeDasharray={isUpcoming ? '2 3' : '0'}
                    style={{
                      transition: 'stroke 220ms ease, stroke-width 220ms ease, fill 220ms ease, filter 220ms ease, opacity 220ms ease',
                      filter: isFocused
                        ? `drop-shadow(0 0 ${isUpcoming ? 12 : 18}px rgba(244,223,178,0.72))`
                        : isUpcoming
                          ? 'drop-shadow(0 0 6px rgba(200,169,107,0.24))'
                          : 'drop-shadow(0 0 10px rgba(200,169,107,0.36))',
                    }}
                  />
                  <circle
                    r={isUpcoming ? 4.2 : 5}
                    fill={isUpcoming ? (isFocused ? 'rgba(241,221,181,0.94)' : 'rgba(224,197,145,0.72)') : (isFocused ? '#fff4da' : '#f4dfb2')}
                    style={{
                      transition: 'fill 220ms ease, filter 220ms ease, opacity 220ms ease',
                      filter: isFocused ? 'drop-shadow(0 0 8px rgba(255,244,218,0.88))' : 'none',
                    }}
                  />
                  <circle
                    r={isUpcoming ? 8.4 : 9.4}
                    fill="none"
                    stroke={isUpcoming ? (isFocused ? 'rgba(233,212,164,0.7)' : 'rgba(200,169,107,0.44)') : (isFocused ? 'rgba(255,245,219,0.98)' : 'rgba(244,223,178,0.92)')}
                    strokeWidth={isUpcoming ? (isFocused ? 1.1 : 0.95) : (isFocused ? 1.3 : 1.15)}
                    strokeDasharray={isUpcoming ? '3 3' : '0'}
                    opacity={isUpcoming ? (isFocused ? 0.88 : 0.62) : (isFocused ? 1 : 0.88)}
                    style={{
                      transition: 'stroke 220ms ease, stroke-width 220ms ease, opacity 220ms ease',
                    }}
                  >
                    <animate
                      attributeName="r"
                      values={isFocused ? (isUpcoming ? '8.4;12;8.4' : '9.4;15.25;9.4') : isUpcoming ? '8.4;10.2;8.4' : '9.4;12.4;9.4'}
                      dur={isUpcoming ? '2.8s' : '2.1s'}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values={isFocused ? (isUpcoming ? '0.88;0.44;0.88' : '1;0.36;1') : isUpcoming ? '0.62;0.24;0.62' : '0.88;0.28;0.88'}
                      dur={isUpcoming ? '2.8s' : '2.1s'}
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              </Marker>
            );
          })}
        </ComposableMap>
      </Reveal>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Reveal className="rounded-[1.6rem] border border-[rgba(200,169,107,0.22)] bg-[rgba(255,255,255,0.02)] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#d8bd86]">Active Regions</p>
          <div className="mt-5 grid grid-cols-1 border-t border-[rgba(200,169,107,0.18)] md:grid-cols-2 xl:grid-cols-3">
            {activeRegions.map((region, index) => {
              const isFocused = activeCountry === region.name;
              return (
                <button
                  key={region.name}
                  type="button"
                  onMouseEnter={() => handleEnter(region.name)}
                  onMouseLeave={handleLeave}
                  onClick={() => handleEnter(region.name)}
                  className={`group relative border-b border-[rgba(200,169,107,0.14)] px-5 py-6 text-left transition duration-500 md:border-r ${
                    isFocused
                      ? 'bg-[rgba(200,169,107,0.12)] shadow-[0_0_24px_rgba(200,169,107,0.18)]'
                      : 'bg-transparent hover:bg-[rgba(255,255,255,0.02)]'
                  }`}
                >
                  <div className={`absolute inset-x-0 top-0 h-px origin-left bg-[#c8a96b] transition duration-500 ${isFocused ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
                  <div className="text-[0.72rem] uppercase tracking-[0.35em] text-[#8f8469]">{String(index + 1).padStart(2, '0')}</div>
                  <h3 className="mt-8 nst-display text-[1.85rem] leading-[1.05] text-white">{region.name}</h3>
                </button>
              );
            })}
          </div>
        </Reveal>

        <Reveal className="rounded-[1.6rem] border border-[rgba(200,169,107,0.18)] bg-[rgba(255,255,255,0.015)] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#bca57a]">Upcoming Regions</p>
          <div className="mt-5 grid grid-cols-1 border-t border-[rgba(200,169,107,0.16)] md:grid-cols-2 xl:grid-cols-3">
            {upcomingRegions.map((region, index) => {
              const isFocused = activeCountry === region.name;
              return (
                <button
                  key={region.name}
                  type="button"
                  onMouseEnter={() => handleEnter(region.name)}
                  onMouseLeave={handleLeave}
                  onClick={() => handleEnter(region.name)}
                  className={`group relative border-b border-[rgba(200,169,107,0.12)] px-5 py-6 text-left transition duration-500 md:border-r ${
                    isFocused
                      ? 'bg-[rgba(200,169,107,0.08)] shadow-[0_0_18px_rgba(200,169,107,0.12)]'
                      : 'bg-transparent opacity-90 hover:bg-[rgba(255,255,255,0.015)]'
                  }`}
                >
                  <div className={`absolute inset-x-0 top-0 h-px origin-left bg-[rgba(200,169,107,0.72)] transition duration-500 ${isFocused ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
                  <div className="text-[0.72rem] uppercase tracking-[0.35em] text-[#8f8469]">{String(index + 1).padStart(2, '0')}</div>
                  <h3 className="mt-8 nst-display text-[1.8rem] leading-[1.05] text-[#e9ddc3]">{region.name}</h3>
                </button>
              );
            })}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
