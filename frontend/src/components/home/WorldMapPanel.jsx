import { useState } from 'react';
import Reveal from './Reveal';

const REGION_DATA = [
  {
    id: 'europe',
    label: 'EUROPE',
    x: 505,
    y: 160,
    labelX: 505,
    labelY: 214,
    labelAnchor: 'middle',
    labelSize: 19,
    tracking: '0.32em',
    halo: 30,
    radius: 14,
  },
  {
    id: 'uk',
    label: 'UNITED KINGDOM',
    x: 465,
    y: 140,
    labelX: 452,
    labelY: 177,
    labelAnchor: 'start',
    labelSize: 16,
    tracking: '0.18em',
    halo: 28,
    radius: 12,
  },
  {
    id: 'us',
    label: 'UNITED STATES',
    x: 155,
    y: 168,
    labelX: 130,
    labelY: 212,
    labelAnchor: 'start',
    labelSize: 15,
    tracking: '0.2em',
    halo: 27,
    radius: 12,
  },
  {
    id: 'australia',
    label: 'AUSTRALIA',
    x: 840,
    y: 505,
    labelX: 812,
    labelY: 548,
    labelAnchor: 'start',
    labelSize: 16,
    tracking: '0.25em',
    halo: 27,
    radius: 12,
  },
];

const MAP_SHAPES = [
  {
    id: 'north-america',
    regionId: 'us',
    d: 'M146 292 C180 254 236 243 297 249 C346 254 366 270 343 290 C316 314 294 334 338 356 C374 374 331 394 273 391 C214 388 167 366 139 332 L139 307 C139 301 141 296 146 292 Z',
  },
  {
    id: 'south-america',
    regionId: null,
    d: 'M360 383 C399 382 453 389 490 411 C529 433 523 464 488 484 C455 502 461 526 503 545 C544 563 491 591 410 581 C336 572 281 539 307 499 C328 467 334 449 315 425 C292 397 316 384 360 383 Z',
  },
  {
    id: 'europe-asia',
    regionId: 'europe',
    d: 'M434 250 C470 207 531 195 618 204 C697 213 748 240 741 281 C736 310 715 322 662 320 C603 318 554 314 512 333 C466 354 421 340 407 310 C398 291 410 276 434 250 Z',
  },
  {
    id: 'africa',
    regionId: null,
    d: 'M482 351 C521 329 580 326 630 342 C680 359 686 390 642 410 C599 429 600 448 637 470 C676 493 658 525 595 534 C530 544 462 525 437 491 C416 463 445 444 456 417 C466 390 449 372 482 351 Z',
  },
  {
    id: 'middle-east',
    regionId: null,
    d: 'M506 344 C540 335 583 336 607 347 C627 357 619 374 587 378 C553 382 512 374 505 360 C502 354 502 349 506 344 Z',
  },
  {
    id: 'australia',
    regionId: 'australia',
    d: 'M804 456 C837 438 894 435 923 456 C951 476 935 506 889 515 C841 524 789 507 780 482 C776 470 784 462 804 456 Z',
  },
];

const ROUTES = [
  { id: 'us-europe', from: 'us', to: 'europe', d: 'M155 168 C282 186 386 211 505 160' },
  { id: 'uk-europe', from: 'uk', to: 'europe', d: 'M465 140 C481 146 493 152 505 160' },
  { id: 'europe-australia', from: 'europe', to: 'australia', d: 'M505 160 C637 233 735 382 840 505' },
];

export default function WorldMapPanel() {
  const [activeRegionId, setActiveRegionId] = useState(null);

  const handleEnter = (id) => setActiveRegionId(id);
  const handleLeave = () => setActiveRegionId(null);

  return (
    <div className="space-y-8">
      <Reveal className="relative overflow-hidden rounded-[2rem] border border-[rgba(200,169,107,0.22)] bg-[#080907] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.34)] md:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_51%_48%,rgba(214,179,104,0.13),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_34%,rgba(0,0,0,0.34))]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(219,185,111,0.55),transparent)]" />

        <div className="relative z-10">
          <div className="relative overflow-hidden rounded-[1.4rem] border border-[rgba(200,169,107,0.16)] bg-[#070806]">
            <svg
              viewBox="0 0 1000 620"
              role="img"
              aria-label="Abstract global focus map showing United States, United Kingdom, Europe, and Australia"
              className="relative z-10 mx-auto block aspect-[1000/620] w-[90%]"
              onMouseLeave={handleLeave}
            >
              <defs>
                <radialGradient id="nst-abstract-globe" cx="52%" cy="51%" r="43%">
                  <stop offset="0%" stopColor="rgba(204,174,105,0.2)" />
                  <stop offset="62%" stopColor="rgba(204,174,105,0.11)" />
                  <stop offset="100%" stopColor="rgba(204,174,105,0.02)" />
                </radialGradient>
                <linearGradient id="nst-abstract-land" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(222,190,121,0.22)" />
                  <stop offset="100%" stopColor="rgba(164,134,75,0.08)" />
                </linearGradient>
                <filter id="nst-soft-glow" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur stdDeviation="7" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <rect width="1000" height="620" fill="#070806" />
              <ellipse
                cx="515"
                cy="383"
                rx="335"
                ry="148"
                fill="url(#nst-abstract-globe)"
                opacity="0.88"
              />

              <g fill="none" stroke="rgba(199,164,91,0.24)" strokeWidth="1.2">
                <path d="M125 288 C77 355 128 414 272 413 C386 413 448 388 370 345 C308 310 357 251 473 230 C573 213 682 213 747 257 C799 292 803 335 749 354 C696 373 693 410 643 429" />
                <path d="M191 243 C244 250 327 261 420 278 C494 292 560 289 632 281 C699 273 751 287 778 318" />
                <path d="M284 399 C368 431 500 446 651 422 C748 407 818 420 858 467" />
                <path d="M144 308 L144 242" />
              </g>

              <g>
                {MAP_SHAPES.map((shape) => {
                  const isFocused = shape.regionId && shape.regionId === activeRegionId;

                  return (
                    <path
                      key={shape.id}
                      d={shape.d}
                      onMouseEnter={() => shape.regionId && handleEnter(shape.regionId)}
                      fill={isFocused ? 'rgba(222,190,121,0.28)' : 'url(#nst-abstract-land)'}
                      stroke={isFocused ? 'rgba(242,216,157,0.78)' : 'rgba(205,170,99,0.5)'}
                      strokeWidth={isFocused ? 1.7 : 1.15}
                      filter={isFocused ? 'url(#nst-soft-glow)' : 'none'}
                      style={{
                        cursor: shape.regionId ? 'pointer' : 'default',
                        transition: 'all 240ms ease',
                      }}
                    />
                  );
                })}
              </g>

              <g fill="none">
                {ROUTES.map((route) => {
                  const isFocused = activeRegionId === route.from || activeRegionId === route.to;

                  return (
                    <path
                      key={route.id}
                      d={route.d}
                      stroke={isFocused ? 'rgba(232,200,132,0.7)' : 'rgba(158,129,69,0.28)'}
                      strokeWidth={isFocused ? 1.55 : 1.05}
                      strokeLinecap="round"
                      style={{ transition: 'all 240ms ease' }}
                    />
                  );
                })}
                <path
                  d="M840 505 C895 466 949 438 996 421"
                  stroke={activeRegionId === 'australia' ? 'rgba(232,200,132,0.66)' : 'rgba(158,129,69,0.25)'}
                  strokeWidth={activeRegionId === 'australia' ? 1.5 : 1}
                  strokeLinecap="round"
                  style={{ transition: 'all 240ms ease' }}
                />
              </g>

              {REGION_DATA.map((region) => {
                const isFocused = region.id === activeRegionId;

                return (
                  <g
                    key={region.id}
                    onMouseEnter={() => handleEnter(region.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx={region.x}
                      cy={region.y}
                      r={isFocused ? region.halo + 4 : region.halo}
                      fill={isFocused ? 'rgba(207,174,103,0.24)' : 'rgba(207,174,103,0.16)'}
                      style={{ transition: 'all 240ms ease' }}
                    />
                    <circle
                      cx={region.x}
                      cy={region.y}
                      r={isFocused ? region.radius + 2 : region.radius}
                      fill={isFocused ? '#f0cd82' : '#d1aa5e'}
                      stroke={isFocused ? 'rgba(255,237,194,0.95)' : 'rgba(214,178,105,0.72)'}
                      strokeWidth="1.3"
                      filter={isFocused ? 'url(#nst-soft-glow)' : 'none'}
                      style={{ transition: 'all 240ms ease' }}
                    />
                    <text
                      x={region.labelX}
                      y={region.labelY}
                      textAnchor={region.labelAnchor}
                      fill={isFocused ? '#fff0c8' : '#d9bd82'}
                      stroke="rgba(7,8,6,0.78)"
                      strokeWidth="3"
                      paintOrder="stroke"
                      style={{
                        fontSize: isFocused ? region.labelSize + 2 : region.labelSize,
                        fontWeight: 600,
                        letterSpacing: region.tracking,
                        transition: 'all 240ms ease',
                        pointerEvents: 'none',
                      }}
                    >
                      {region.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
