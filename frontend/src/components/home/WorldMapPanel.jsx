import { useMemo, useState } from 'react';
import { Annotation, ComposableMap, Geographies, Geography, Line, Marker, Sphere } from 'react-simple-maps';
import worldAtlas from 'world-atlas/countries-110m.json';
import Reveal from './Reveal';

const REGION_DATA = [
  {
    id: 'europe',
    title: 'EUROPE',
    type: 'active',
    coordinates: [10.4515, 51.1657],
    description:
      'Structured pathways across select European markets aligned to candidate profile, documentation readiness, and opportunity fit.',
    tooltip: [
      'Eligibility Requirements:',
      '• Professional profile alignment',
      '• English proficiency readiness',
      '• Documentation verification',
      '• International mobility readiness',
    ],
    isoA3: ['DEU', 'POL', 'AUT', 'CHE', 'FRA', 'NLD', 'BEL', 'SWE', 'DNK', 'NOR'],
  },
  {
    id: 'uk',
    title: 'UNITED KINGDOM',
    type: 'active',
    coordinates: [-3.436, 55.3781],
    description:
      'Focused support for candidates exploring UK pathways through profile alignment, process coordination, and international readiness.',
    tooltip: [
      'Eligibility Requirements:',
      '• Candidate profile assessment',
      '• Structured process readiness',
      '• Documentation alignment',
      '• Career pathway consultation',
    ],
    isoA3: ['GBR'],
  },
  {
    id: 'australia',
    title: 'AUSTRALIA',
    type: 'active',
    coordinates: [133.7751, -25.2744],
    description:
      'Targeted pathway mapping for candidates seeking career opportunities in Australia through a structured and selective process.',
    tooltip: [
      'Eligibility Requirements:',
      '• Skills and experience review',
      '• Documentation preparation',
      '• International opportunity fit',
      '• Process coordination readiness',
    ],
    isoA3: ['AUS'],
  },
  {
    id: 'us',
    title: 'UNITED STATES',
    type: 'upcoming',
    coordinates: [-98.5795, 39.8283],
    description: 'United States pathways are currently in development as part of our next expansion phase.',
    tooltip: [
      'Pathways currently under expansion review.',
      '',
      'Upcoming opportunities may include:',
      '• Specialized professional pathways',
      '• Structured profile evaluation',
      '• Future onboarding cycles',
    ],
    isoA3: ['USA'],
  },
];

const projectionConfig = {
  scale: 152,
  center: [14, 15],
};

const findRegionByGeo = (geo) => {
  const isoA3 = String(geo.properties?.ISO_A3 || geo.properties?.iso_a3 || '').toUpperCase();
  return REGION_DATA.find((region) => region.isoA3.includes(isoA3));
};

const getTooltipTranslate = (regionId) => {
  switch (regionId) {
    case 'europe':
      return 'translate(18px, -172px)';
    case 'uk':
      return 'translate(-6px, -178px)';
    case 'australia':
      return 'translate(-338px, -200px)';
    case 'us':
      return 'translate(26px, -192px)';
    default:
      return 'translate(20px, -178px)';
  }
};

export default function WorldMapPanel() {
  const [activeRegionId, setActiveRegionId] = useState(null);

  const activeRegion = useMemo(
    () => REGION_DATA.find((region) => region.id === activeRegionId) || null,
    [activeRegionId],
  );

  const handleEnter = (id) => setActiveRegionId(id);

  return (
    <div className="space-y-8">
      <Reveal className="relative overflow-hidden rounded-[2rem] border border-[rgba(200,169,107,0.3)] bg-[radial-gradient(circle_at_18%_18%,rgba(200,169,107,0.16),transparent_36%),radial-gradient(circle_at_85%_80%,rgba(186,151,81,0.11),transparent_42%),linear-gradient(160deg,#0f1013,#141518_50%,#101114)] p-4 md:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(200,169,107,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(200,169,107,0.08)_1px,transparent_1px)] bg-[size:36px_36px] opacity-20" />
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.16)_0.75px,transparent_0.75px)] [background-size:4px_4px]" />

        <div className="relative z-10 grid grid-cols-1 gap-5 xl:grid-cols-[1.32fr_0.88fr]">
          <div className="relative overflow-hidden rounded-[1.6rem] border border-[rgba(200,169,107,0.26)] bg-[radial-gradient(circle_at_50%_50%,rgba(200,169,107,0.06),transparent_56%),rgba(8,9,11,0.75)] p-2 md:p-4">
            <div className="pointer-events-none absolute -left-20 top-8 h-44 w-44 rounded-full bg-[rgba(200,169,107,0.1)] blur-3xl" />
            <div className="pointer-events-none absolute -right-12 bottom-10 h-48 w-48 rounded-full bg-[rgba(175,145,81,0.12)] blur-3xl" />

            <ComposableMap
              projection="geoMercator"
              projectionConfig={projectionConfig}
              width={1000}
              height={620}
              className="relative z-10 h-full w-full"
              aria-label="Global focus map"
            >
              <defs>
                <linearGradient id="nst-active-country" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f6e4bc" />
                  <stop offset="100%" stopColor="#c8a96b" />
                </linearGradient>
                <linearGradient id="nst-upcoming-country" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(205,174,112,0.42)" />
                  <stop offset="100%" stopColor="rgba(205,174,112,0.16)" />
                </linearGradient>
                <filter id="nst-region-glow" x="-70%" y="-70%" width="240%" height="240%">
                  <feGaussianBlur stdDeviation="8" result="g" />
                  <feMerge>
                    <feMergeNode in="g" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <Sphere fill="rgba(255,255,255,0.02)" stroke="rgba(200,169,107,0.17)" strokeWidth={0.8} />

              <Line
                from={REGION_DATA[0].coordinates}
                to={REGION_DATA[1].coordinates}
                stroke="rgba(200,169,107,0.35)"
                strokeWidth={activeRegionId === 'uk' || activeRegionId === 'europe' ? 1.45 : 1}
                strokeLinecap="round"
                style={{ transition: 'stroke-width 260ms ease, opacity 260ms ease', opacity: 0.8 }}
              />
              <Line
                from={REGION_DATA[0].coordinates}
                to={REGION_DATA[2].coordinates}
                stroke="rgba(200,169,107,0.28)"
                strokeWidth={activeRegionId === 'australia' || activeRegionId === 'europe' ? 1.35 : 0.9}
                strokeLinecap="round"
                style={{ transition: 'stroke-width 260ms ease, opacity 260ms ease', opacity: 0.65 }}
              />
              <Line
                from={REGION_DATA[0].coordinates}
                to={REGION_DATA[3].coordinates}
                stroke="rgba(200,169,107,0.24)"
                strokeWidth={activeRegionId === 'us' || activeRegionId === 'europe' ? 1.25 : 0.9}
                strokeLinecap="round"
                style={{ transition: 'stroke-width 260ms ease, opacity 260ms ease', opacity: 0.6 }}
              />

              <Geographies geography={worldAtlas}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const region = findRegionByGeo(geo);
                    const isActive = Boolean(region);
                    const isFocused = region?.id === activeRegionId;
                    const isUpcoming = region?.type === 'upcoming';

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onMouseEnter={() => region && handleEnter(region.id)}
                        style={{
                          default: {
                            fill: isActive
                              ? isUpcoming
                                ? 'url(#nst-upcoming-country)'
                                : 'url(#nst-active-country)'
                              : 'rgba(255,255,255,0.045)',
                            stroke: isFocused ? 'rgba(255,246,224,0.96)' : 'rgba(200,169,107,0.24)',
                            strokeWidth: isFocused ? 1.45 : isActive ? 1.1 : 0.72,
                            opacity: isFocused ? 1 : isActive ? 0.9 : 0.62,
                            outline: 'none',
                            filter: isFocused ? 'url(#nst-region-glow)' : 'none',
                            transition: 'all 260ms ease',
                          },
                          hover: { outline: 'none' },
                          pressed: { outline: 'none' },
                        }}
                      />
                    );
                  })
                }
              </Geographies>

              {REGION_DATA.map((region) => {
                const isFocused = region.id === activeRegionId;
                const isUpcoming = region.type === 'upcoming';

                return (
                  <Marker
                    key={region.id}
                    coordinates={region.coordinates}
                    onMouseEnter={() => handleEnter(region.id)}
                  >
                    <g style={{ cursor: 'pointer' }}>
                      <circle
                        r={isFocused ? 13 : 10.5}
                        fill={isUpcoming ? 'rgba(205,174,112,0.19)' : 'rgba(205,174,112,0.28)'}
                        stroke={isFocused ? 'rgba(255,244,218,1)' : 'rgba(205,174,112,0.8)'}
                        strokeWidth={isFocused ? 1.6 : 1.15}
                        style={{
                          transition: 'all 240ms ease',
                          filter: isFocused
                            ? 'drop-shadow(0 0 16px rgba(245,223,175,0.82))'
                            : 'drop-shadow(0 0 8px rgba(200,169,107,0.45))',
                        }}
                      />
                      <circle
                        r={isFocused ? 5.2 : 4.4}
                        fill={isFocused ? '#fff4de' : '#ebcd90'}
                        style={{ transition: 'all 240ms ease' }}
                      />
                      <circle
                        r={isFocused ? 15.5 : 12}
                        fill="none"
                        stroke={isFocused ? 'rgba(255,244,218,0.95)' : 'rgba(205,174,112,0.68)'}
                        strokeWidth={isFocused ? 1.2 : 1}
                        opacity={isFocused ? 1 : 0.8}
                      >
                        <animate attributeName="r" values="12;16.5;12" dur="2.4s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.85;0.3;0.85" dur="2.4s" repeatCount="indefinite" />
                      </circle>
                    </g>

                    {isFocused ? (
                      <foreignObject
                        width={320}
                        height={210}
                        style={{
                          transform: getTooltipTranslate(region.id),
                          pointerEvents: 'none',
                          transition: 'opacity 240ms ease',
                          opacity: 1,
                          overflow: 'visible',
                        }}
                      >
                        <div className="rounded-2xl border border-[rgba(216,183,118,0.6)] bg-[linear-gradient(150deg,rgba(20,20,24,0.95),rgba(12,12,15,0.9))] p-4 shadow-[0_0_34px_rgba(200,169,107,0.2)] backdrop-blur-xl">
                          <p className="text-[0.67rem] font-semibold tracking-[0.24em] text-[#d8bd86]">{region.title}</p>
                          <div className="mt-3 h-px w-full bg-[linear-gradient(90deg,rgba(216,189,134,0.55),transparent)]" />
                          <div className="mt-3 space-y-1.5 text-[0.84rem] leading-6 text-[#e6dbc2]">
                            {region.tooltip.map((line, idx) => (
                              <p key={`${region.id}-tip-${idx}`} className={idx === 0 || idx === 2 ? 'font-medium text-[#f3e8cc]' : ''}>
                                {line || '\u00a0'}
                              </p>
                            ))}
                          </div>
                        </div>
                      </foreignObject>
                    ) : null}
                  </Marker>
                );
              })}

              <Annotation
                subject={REGION_DATA[2].coordinates}
                dx={30}
                dy={30}
                connectorProps={{ stroke: 'rgba(200,169,107,0.35)', strokeWidth: 1, strokeLinecap: 'round' }}
              />
            </ComposableMap>
          </div>

          <div className="space-y-3">
            {REGION_DATA.map((region) => {
              const isFocused = region.id === activeRegionId;
              return (
                <button
                  key={region.id}
                  type="button"
                  onMouseEnter={() => handleEnter(region.id)}
                  className={`group w-full rounded-[1.2rem] border px-5 py-5 text-left transition duration-300 ${
                    isFocused
                      ? 'border-[rgba(216,183,118,0.72)] bg-[linear-gradient(140deg,rgba(38,33,24,0.74),rgba(24,21,17,0.7))] shadow-[0_0_24px_rgba(200,169,107,0.22)]'
                      : 'border-[rgba(200,169,107,0.24)] bg-[rgba(20,20,24,0.82)] hover:border-[rgba(216,183,118,0.5)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 className={`nst-display text-[1.18rem] tracking-[0.02em] ${isFocused ? 'text-[#f6e8c5]' : 'text-[#f0e2c0]'}`}>
                      {region.title}
                    </h3>
                    {region.type === 'upcoming' ? (
                      <span className="rounded-full border border-[rgba(216,183,118,0.58)] bg-[rgba(200,169,107,0.12)] px-2.5 py-1 text-[0.58rem] font-semibold tracking-[0.16em] text-[#e7cf9b]">
                        UPCOMING
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-[0.81rem] leading-6 text-[#d2cab8]">{region.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </Reveal>
    </div>
  );
}
