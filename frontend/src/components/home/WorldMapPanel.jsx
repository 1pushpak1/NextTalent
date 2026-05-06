import { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography, Marker, Sphere } from 'react-simple-maps';
import worldAtlas from 'world-atlas/countries-110m.json';
import Reveal from './Reveal';

const COUNTRY_IDS = {
  'United States': '840',
  Germany: '276',
  Poland: '616',
  Austria: '040',
  Switzerland: '756',
  'United Kingdom': '826',
  Spain: '724',
  Italy: '380',
};

const ACTIVE_REGION_NAMES = ['United States', 'Germany', 'Poland', 'Austria', 'Switzerland'];

const UPCOMING_REGION_NAMES = ['United Kingdom', 'Spain', 'Italy'];

const projectionConfig = {
  scale: 165,
  center: [8, 43],
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

  const activeRegionIds = useMemo(
    () => new Set(activeRegions.map((region) => COUNTRY_IDS[region.name])),
    [activeRegions],
  );

  const upcomingRegionIds = useMemo(
    () => new Set(upcomingRegions.map((region) => COUNTRY_IDS[region.name])),
    [upcomingRegions],
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
          </defs>

          <Sphere fill="rgba(255,255,255,0.02)" stroke="rgba(200,169,107,0.18)" strokeWidth={0.8} />

          <Geographies geography={worldAtlas}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const countryId = String(geo.id).padStart(3, '0');
                const isActiveRegion = activeRegionIds.has(countryId);
                const isUpcomingRegion = upcomingRegionIds.has(countryId);
                const isFocused = activeCountry ? COUNTRY_IDS[activeCountry] === countryId : false;

                let fill = 'rgba(255,255,255,0.04)';
                let stroke = 'rgba(200,169,107,0.16)';
                let opacity = 0.58;
                let strokeWidth = 0.7;

                if (isActiveRegion) {
                  fill = 'url(#nst-active-fill)';
                  stroke = isFocused ? 'rgba(255,245,219,0.98)' : 'rgba(244,223,178,0.86)';
                  opacity = isFocused ? 1 : 0.9;
                  strokeWidth = isFocused ? 1.5 : 1.05;
                }

                if (isUpcomingRegion) {
                  fill = 'url(#nst-upcoming-fill)';
                  stroke = isFocused ? 'rgba(233,212,164,0.9)' : 'rgba(200,169,107,0.54)';
                  opacity = isFocused ? 0.93 : 0.72;
                  strokeWidth = 0.95;
                }

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => {
                      const linked = allRegions.find((region) => COUNTRY_IDS[region.name] === countryId);
                      if (linked) handleEnter(linked.name);
                    }}
                    onMouseLeave={handleLeave}
                    onClick={() => {
                      const linked = allRegions.find((region) => COUNTRY_IDS[region.name] === countryId);
                      if (linked) handleEnter(linked.name);
                    }}
                    style={{
                      default: {
                        fill,
                        stroke,
                        opacity,
                        strokeWidth,
                        outline: 'none',
                        transition: 'all 260ms ease',
                        filter: isFocused ? 'url(#nst-country-glow)' : 'none',
                      },
                      hover: {
                        fill,
                        stroke,
                        opacity,
                        strokeWidth,
                        outline: 'none',
                        filter: isFocused ? 'url(#nst-country-glow)' : 'none',
                      },
                      pressed: {
                        fill,
                        stroke,
                        opacity,
                        strokeWidth,
                        outline: 'none',
                        filter: isFocused ? 'url(#nst-country-glow)' : 'none',
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

            return (
              <Marker
                key={region.name}
                coordinates={[region.lng, region.lat]}
                onMouseEnter={() => handleEnter(region.name)}
                onMouseLeave={handleLeave}
                onClick={() => handleEnter(region.name)}
              >
                <g
                  style={{
                    cursor: 'pointer',
                    transition: 'transform 240ms ease',
                    transform: `scale(${isFocused ? 1.2 : 1})`,
                    transformOrigin: 'center',
                  }}
                >
                  <title>{region.name}</title>
                  <circle
                    r={isFocused ? 17 : 13}
                    fill={isUpcoming ? 'rgba(200,169,107,0.12)' : 'rgba(200,169,107,0.24)'}
                    stroke={isUpcoming ? 'rgba(200,169,107,0.35)' : 'rgba(244,223,178,0.82)'}
                    strokeWidth={isUpcoming ? 1 : 1.4}
                    strokeDasharray={isUpcoming ? '2 3' : '0'}
                    style={{
                      filter: isFocused ? 'drop-shadow(0 0 16px rgba(244,223,178,0.66))' : 'none',
                    }}
                  />
                  <circle
                    r={isUpcoming ? 4.2 : 5}
                    fill={isUpcoming ? 'rgba(224,197,145,0.72)' : '#f4dfb2'}
                  />
                  <circle
                    r={isFocused ? 12 : isUpcoming ? 8.4 : 9.4}
                    fill="none"
                    stroke={isUpcoming ? 'rgba(200,169,107,0.44)' : 'rgba(244,223,178,0.95)'}
                    strokeWidth={isUpcoming ? 0.95 : 1.15}
                    strokeDasharray={isUpcoming ? '3 3' : '0'}
                    opacity={isUpcoming ? 0.75 : 0.92}
                  >
                    <animate
                      attributeName="r"
                      values={isFocused ? '9.2;16.5;9.2' : isUpcoming ? '8;11.5;8' : '9.4;14.5;9.4'}
                      dur={isUpcoming ? '2.8s' : '2.1s'}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values={isUpcoming ? '0.72;0.32;0.72' : '0.95;0.3;0.95'}
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
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {activeRegions.map((region, index) => {
              const isFocused = activeCountry === region.name;
              return (
                <button
                  key={region.name}
                  type="button"
                  onMouseEnter={() => handleEnter(region.name)}
                  onMouseLeave={handleLeave}
                  onClick={() => handleEnter(region.name)}
                  className={`nst-map-card text-left rounded-2xl border px-4 py-4 transition duration-300 ${
                    isFocused
                      ? 'border-[rgba(244,223,178,0.86)] bg-[rgba(200,169,107,0.13)] shadow-[0_0_24px_rgba(200,169,107,0.24)]'
                      : 'border-[rgba(200,169,107,0.25)] bg-[rgba(255,255,255,0.02)]'
                  }`}
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="nst-display text-[1.45rem] leading-none text-white">{region.name}</span>
                    <span className="rounded-full border border-[rgba(244,223,178,0.72)] bg-[rgba(200,169,107,0.2)] px-2.5 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-[#f4dfb2]">
                      Active
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </Reveal>

        <Reveal className="rounded-[1.6rem] border border-[rgba(200,169,107,0.18)] bg-[rgba(255,255,255,0.015)] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#bca57a]">Upcoming Regions</p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {upcomingRegions.map((region, index) => {
              const isFocused = activeCountry === region.name;
              return (
                <button
                  key={region.name}
                  type="button"
                  onMouseEnter={() => handleEnter(region.name)}
                  onMouseLeave={handleLeave}
                  onClick={() => handleEnter(region.name)}
                  className={`nst-map-card text-left rounded-2xl border px-4 py-4 transition duration-300 ${
                    isFocused
                      ? 'border-[rgba(210,184,132,0.7)] bg-[rgba(200,169,107,0.09)] shadow-[0_0_18px_rgba(200,169,107,0.16)]'
                      : 'border-[rgba(200,169,107,0.16)] bg-[rgba(255,255,255,0.015)] opacity-90'
                  }`}
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="nst-display text-[1.4rem] leading-none text-[#e9ddc3]">{region.name}</span>
                    <span className="rounded-full border border-[rgba(200,169,107,0.45)] bg-[rgba(200,169,107,0.12)] px-2.5 py-1 text-[0.56rem] font-semibold uppercase tracking-[0.2em] text-[#d7bf92]">
                      Upcoming
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
