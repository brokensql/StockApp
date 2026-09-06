import React, { useState, useRef, useId, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, TrendingDown, Eye, EyeOff } from 'lucide-react';
import { RollingPrice } from './RollingPrice';
import { SaleTransaction } from '../types';
import {
  calculatePHTSalesGrowth,
  generatePHTChartDataset,
  ChartDataPoint,
} from '../utils/philippineDate';

export type Timeframe = '7d' | '30d' | '90d';

function getSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  let path = `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 5;
    const cp1y = p1.y + (p2.y - p0.y) / 5;
    const cp2x = p2.x - (p3.x - p1.x) / 5;
    const cp2y = p2.y - (p3.y - p1.y) / 5;

    path += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return path;
}

interface SalesTrendChartProps {
  sales?: SaleTransaction[];
  todayTotal?: number;
  triggerKey?: number;
  isPriceHidden?: boolean;
  onTogglePriceHidden?: () => void;
}

export const SalesTrendChart: React.FC<SalesTrendChartProps> = ({
  sales = [],
  todayTotal: externalTodayTotal,
  triggerKey = 0,
  isPriceHidden,
  onTogglePriceHidden,
}) => {
  const [internalHidden, setInternalHidden] = useState(false);
  const activeIsHidden = isPriceHidden !== undefined ? isPriceHidden : internalHidden;
  const handleToggleHidden = onTogglePriceHidden || (() => setInternalHidden((prev) => !prev));
  const [timeframe, setTimeframe] = useState<Timeframe>('7d');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Unique ID for SVG gradient fill
  const gradientId = useId();

  // Compute 100% genuine Philippine Time sales growth from app's transaction data
  const growthMetrics = useMemo(() => {
    return calculatePHTSalesGrowth(sales);
  }, [sales]);

  // Use computed today's total from sales, with fallback to external prop if passed
  const effectiveTodayTotal =
    externalTodayTotal !== undefined ? externalTodayTotal : growthMetrics.todayTotal;

  // Generate genuine trend dataset for selected timeframe (7d, 30d, 90d)
  const timeframeData = useMemo(() => {
    return generatePHTChartDataset(sales, timeframe);
  }, [sales, timeframe]);

  const activeDataset = timeframeData.points;
  const timeframeTotal = timeframeData.total;

  // Chart layout dimensions
  const chartHeight = 135;
  const paddingX = 0; // Set to 0 so line extends to the exact edge
  const paddingTop = 14;
  const paddingBottom = 10;

  const width = 390; // SVG viewBox width
  const drawableHeight = chartHeight - paddingTop - paddingBottom;
  const drawableWidth = width - paddingX * 2;

  // Min and max scaling derived from real data
  const values = activeDataset.map((d) => d.value);
  const maxRecorded = Math.max(...values, 0);
  const hasData = maxRecorded > 0;

  const minVal = 0;
  const maxVal = hasData ? maxRecorded * 1.15 : 100;

  const points = activeDataset.map((pt, i) => {
    const x = paddingX + (i / Math.max(1, activeDataset.length - 1)) * drawableWidth;
    const normY = hasData ? Math.max(0, Math.min(1, (pt.value - minVal) / (maxVal - minVal || 1))) : 0.05;
    const y = chartHeight - paddingBottom - normY * drawableHeight;
    return { x, y, pt };
  });

  const linePath = getSmoothPath(points);
  const areaPath = linePath
    ? `${linePath} L ${points[points.length - 1].x.toFixed(2)},${(chartHeight - paddingBottom).toFixed(2)} L ${points[0].x.toFixed(2)},${(chartHeight - paddingBottom).toFixed(2)} Z`
    : '';

  // Interactivity handlers for touch and hover
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const touchX = e.clientX - rect.left;
    const relativeX = Math.max(0, Math.min(rect.width, touchX));
    const normalizedRatio = relativeX / rect.width;

    let closestIdx = 0;
    let closestDist = Infinity;
    points.forEach((p, idx) => {
      const pRatio = (p.x - paddingX) / drawableWidth;
      const dist = Math.abs(pRatio - normalizedRatio);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });

    setHoverIndex(closestIdx);
  };

  const handlePointerLeave = () => {
    setHoverIndex(null);
  };

  const activePoint = hoverIndex !== null ? points[hoverIndex] : null;

  const activeRatio = activePoint ? activePoint.x / width : 0;
  const pointYRatio = activePoint ? activePoint.y / chartHeight : 0;

  let tooltipLeft = `${(activeRatio * 100).toFixed(2)}%`;
  let tooltipTransformX = '-50%';

  if (activeRatio < 0.18) {
    tooltipLeft = '1.25rem';
    tooltipTransformX = '0%';
  } else if (activeRatio > 0.82) {
    tooltipLeft = 'calc(100% - 1.25rem)';
    tooltipTransformX = '-100%';
  }

  const isNearTop = pointYRatio < 0.42;
  const tooltipTop = `${(pointYRatio * 100).toFixed(2)}%`;

  return (
    <div className="w-full select-none mb-6">
      {/* 1. Today's Sales Header & Prominent Figures */}
      <div className="mb-2">
        <p className="text-[13px] font-medium text-[#6E746F] mb-1">
          Today's sales
        </p>

        <div className="flex items-center gap-2.5">
          <span className="text-[32px] sm:text-[34px] font-semibold text-[#252825] tabular-nums leading-none tracking-tight flex items-center">
            <RollingPrice
              value={effectiveTodayTotal}
              triggerKey={triggerKey}
              isHidden={activeIsHidden}
              duration={900}
            />
          </span>

          <button
            id="home-price-eye-button"
            type="button"
            onClick={handleToggleHidden}
            aria-label={activeIsHidden ? 'Show sales amount' : 'Hide sales amount'}
            title={activeIsHidden ? 'Show sales amount' : 'Hide sales amount'}
            className="p-1.5 text-[#6E746F] hover:text-[#252825] transition-colors rounded-lg hover:bg-black/5 active:bg-black/10 cursor-pointer focus:outline-none"
          >
            {activeIsHidden ? (
              <EyeOff size={20} strokeWidth={1.8} />
            ) : (
              <Eye size={20} strokeWidth={1.8} />
            )}
          </button>
        </div>

        {/* Real Dynamic Sales Growth Indicator (derived strictly from app's transaction history) */}
        {(growthMetrics.hasSalesToday || growthMetrics.hasSalesYesterday) && (
          <div className="flex items-center gap-1.5 mt-2">
            <div
              className={`inline-flex items-center gap-1 text-[13px] font-medium ${
                growthMetrics.isPositive ? 'text-[#4F8065]' : 'text-[#9F3F46]'
              }`}
            >
              {growthMetrics.isPositive ? (
                <TrendingUp size={15} strokeWidth={2.2} />
              ) : (
                <TrendingDown size={15} strokeWidth={2.2} />
              )}
              <span className="tabular-nums font-semibold">
                {growthMetrics.isPositive ? '↑' : '↓'} ₱
                {growthMetrics.changeAmount.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                ({growthMetrics.isPositive ? '+' : '-'}
                {growthMetrics.changePercentage.toFixed(1)}%)
              </span>
              <span className="text-[#6E746F] font-normal ml-0.5">vs yesterday</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Borderless Minimal Graph Container stretching to both left & right edges */}
      <div className="relative -mx-5 w-[calc(100%+2.5rem)] pt-1 pb-2 overflow-visible">
        {/* Interactive Floating Tooltip */}
        <AnimatePresence>
          {activePoint && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{
                opacity: 1,
                scale: 1,
                left: tooltipLeft,
                top: tooltipTop,
                x: tooltipTransformX,
                y: isNearTop ? '12px' : '-36px',
              }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className="absolute z-20 pointer-events-none"
            >
              <div className="bg-[#252825] text-white px-2.5 py-1 rounded-lg text-[11px] shadow-md flex items-center gap-1.5 whitespace-nowrap">
                <span className="font-normal text-white/80">{activePoint.pt.fullDate}:</span>
                <span className="font-semibold tabular-nums text-white">
                  ₱{activePoint.pt.value.toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clean SVG Canvas */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${chartHeight}`}
          className="w-full h-[130px] sm:h-[145px] overflow-visible touch-none cursor-crosshair"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4F8065" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#4F8065" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area Fill beneath curve */}
          <motion.path
            d={areaPath}
            fill={`url(#${gradientId})`}
            initial={false}
            animate={{ d: areaPath }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />

          {/* Single Minimal Trend Line */}
          <motion.path
            d={linePath}
            fill="none"
            stroke="#4F8065"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ d: linePath }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />

          {/* Vertical indicator guide line when hovering */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={paddingTop}
              x2={activePoint.x}
              y2={chartHeight - paddingBottom}
              stroke="#4F8065"
              strokeWidth="1.2"
              strokeDasharray="3 3"
              opacity="0.6"
            />
          )}

          {/* Active Highlight Circle */}
          {activePoint && (
            <g>
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="5.5"
                fill="#4F8065"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Timeframe Selector Pill Tabs & Real Total */}
        <div className="flex items-center justify-between mt-2 px-5">
          <span className="text-[12px] font-medium text-[#6E746F] tabular-nums">
            {timeframe === '7d' ? '7-day' : timeframe === '30d' ? '30-day' : '90-day'} total: <span className="font-semibold text-[#252825]">₱{timeframeTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </span>

          <div className="flex items-center gap-1">
            {(['7d', '30d', '90d'] as Timeframe[]).map((tf) => {
              const isSelected = timeframe === tf;
              const labelMap: Record<Timeframe, string> = {
                '7d': '7D',
                '30d': '30D',
                '90d': '90D',
              };

              return (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#4F8065]/12 text-[#4F8065] font-semibold'
                      : 'text-[#6E746F] hover:text-[#252825] hover:bg-gray-100/60'
                  }`}
                >
                  {labelMap[tf]}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
