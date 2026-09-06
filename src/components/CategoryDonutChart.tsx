import React, { useMemo } from 'react';
import { Product, SaleTransaction } from '../types';
import { getProductColor } from '../utils/productColors';

export interface CategoryStatItem {
  name: string;
  count: number;
  revenue: number;
  percentage: number;
}

interface CategoryDonutChartProps {
  products?: Product[];
  filteredSales?: SaleTransaction[];
  categories?: CategoryStatItem[];
  totalRevenue: number;
  formatCurrency: (val: number) => string;
}

interface DonutItem {
  id: string;
  name: string;
  value: number;
  formattedValue: string;
  percentage: number;
  color: string;
}

interface ComputedSlice extends DonutItem {
  startAngle: number;
  endAngle: number;
  paths: string[];
  textPos: { x: number; y: number };
}

function computeArcSlicePath(
  cx: number,
  cy: number,
  rIn: number,
  rOut: number,
  startAngle: number,
  endAngle: number,
  rc: number,
  padAngle: number
): string {
  const span = endAngle - startAngle;
  const effPad = Math.min(padAngle, span * 0.35);
  if (span <= effPad) return '';

  const a0 = startAngle + effPad / 2;
  const a1 = endAngle - effPad / 2;
  const effRc = Math.min(rc, (rOut - rIn) / 4, ((a1 - a0) * rIn) / 3);
  const daOut = effRc / rOut;
  const daIn = effRc / rIn;

  const p1 = { x: cx + rOut * Math.cos(a0 + daOut), y: cy + rOut * Math.sin(a0 + daOut) };
  const p2 = { x: cx + rOut * Math.cos(a1 - daOut), y: cy + rOut * Math.sin(a1 - daOut) };
  const p3 = { x: cx + (rOut - effRc) * Math.cos(a1), y: cy + (rOut - effRc) * Math.sin(a1) };
  const p4 = { x: cx + (rIn + effRc) * Math.cos(a1), y: cy + (rIn + effRc) * Math.sin(a1) };
  const p5 = { x: cx + rIn * Math.cos(a1 - daIn), y: cy + rIn * Math.sin(a1 - daIn) };
  const p6 = { x: cx + rIn * Math.cos(a0 + daIn), y: cy + rIn * Math.sin(a0 + daIn) };
  const p7 = { x: cx + (rIn + effRc) * Math.cos(a0), y: cy + (rIn + effRc) * Math.sin(a0) };
  const p8 = { x: cx + (rOut - effRc) * Math.cos(a0), y: cy + (rOut - effRc) * Math.sin(a0) };

  const outLarge = (a1 - daOut) - (a0 + daOut) > Math.PI ? 1 : 0;
  const inLarge = (a1 - daIn) - (a0 + daIn) > Math.PI ? 1 : 0;

  return [
    `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `A ${rOut} ${rOut} 0 ${outLarge} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `A ${effRc.toFixed(2)} ${effRc.toFixed(2)} 0 0 1 ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    `L ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
    `A ${effRc.toFixed(2)} ${effRc.toFixed(2)} 0 0 1 ${p5.x.toFixed(2)} ${p5.y.toFixed(2)}`,
    `A ${rIn} ${rIn} 0 ${inLarge} 0 ${p6.x.toFixed(2)} ${p6.y.toFixed(2)}`,
    `A ${effRc.toFixed(2)} ${effRc.toFixed(2)} 0 0 1 ${p7.x.toFixed(2)} ${p7.y.toFixed(2)}`,
    `L ${p8.x.toFixed(2)} ${p8.y.toFixed(2)}`,
    `A ${effRc.toFixed(2)} ${effRc.toFixed(2)} 0 0 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({
  products = [],
  filteredSales = [],
  totalRevenue,
  formatCurrency,
}) => {
  const cx = 100;
  const cy = 100;
  const rIn = 52;
  const rOut = 88;
  const cornerRadius = 5.5;

  const hasSalesInPeriod = totalRevenue > 0;

  // Process top product sales
  const chartItems = useMemo<DonutItem[]>(() => {
    if (hasSalesInPeriod) {
      const map: Record<string, { id: string; name: string; revenue: number }> = {};

      filteredSales.forEach((sale) => {
        if (sale.items && sale.items.length > 0) {
          sale.items.forEach((item) => {
            const key = item.productId || item.name;
            if (!map[key]) {
              map[key] = {
                id: item.productId || item.name,
                name: item.name,
                revenue: 0,
              };
            }
            map[key].revenue += item.unitPrice * item.quantity;
          });
        } else if (sale.primaryItemName) {
          const key = sale.primaryItemName;
          if (!map[key]) {
            map[key] = {
              id: key,
              name: sale.primaryItemName,
              revenue: 0,
            };
          }
          map[key].revenue += sale.total;
        }
      });

      const items = Object.values(map)
        .filter((i) => i.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue);

      const sumRevenue = items.reduce((acc, i) => acc + i.revenue, 0) || totalRevenue || 1;

      // Take top 5
      const top5 = items.slice(0, 5);

      return top5.map((item) => ({
        id: item.id,
        name: item.name,
        value: item.revenue,
        formattedValue: formatCurrency(item.revenue),
        percentage: (item.revenue / sumRevenue) * 100,
        color: getProductColor(item.id, products),
      }));
    }

    // Default fallback prior to sales: display available products catalog
    const top5Products = products.slice(0, 5);
    const sumVal = top5Products.reduce((acc, p) => acc + p.price, 0) || 1;

    return top5Products.map((p) => ({
      id: p.id,
      name: p.name,
      value: p.price,
      formattedValue: formatCurrency(p.price),
      percentage: (p.price / sumVal) * 100,
      color: getProductColor(p.id, products),
    }));
  }, [hasSalesInPeriod, filteredSales, totalRevenue, products, formatCurrency]);

  // Compute donut slices
  const slices = useMemo<ComputedSlice[]>(() => {
    if (chartItems.length === 0) return [];

    const total = chartItems.reduce((acc, i) => acc + i.value, 0);
    if (total <= 0) return [];

    if (chartItems.length === 1) {
      const single = chartItems[0];
      const h1 = computeArcSlicePath(cx, cy, rIn, rOut, -Math.PI / 2, Math.PI / 2, cornerRadius, 0.04);
      const h2 = computeArcSlicePath(cx, cy, rIn, rOut, Math.PI / 2, (3 * Math.PI) / 2, cornerRadius, 0.04);
      return [
        {
          ...single,
          percentage: 100,
          startAngle: 0,
          endAngle: 2 * Math.PI,
          paths: [h1, h2],
          textPos: { x: cx, y: cy - (rIn + rOut) / 2 },
        },
      ];
    }

    let currentAngle = -Math.PI / 2; // 12 o'clock start
    const padAngle = 0.08; // ~4.6 degrees gap

    return chartItems.map((item) => {
      const share = item.value / total;
      const angleSpan = share * (2 * Math.PI);
      const startAngle = currentAngle;
      const endAngle = currentAngle + angleSpan;
      currentAngle = endAngle;

      const path = computeArcSlicePath(
        cx,
        cy,
        rIn,
        rOut,
        startAngle,
        endAngle,
        cornerRadius,
        padAngle
      );

      const midAngle = (startAngle + endAngle) / 2;
      const midR = (rIn + rOut) / 2;
      const textPos = {
        x: cx + midR * Math.cos(midAngle),
        y: cy + midR * Math.sin(midAngle),
      };

      return {
        ...item,
        percentage: share * 100,
        startAngle,
        endAngle,
        paths: [path],
        textPos,
      };
    });
  }, [chartItems, cx, cy, rIn, rOut, cornerRadius]);

  return (
    <section aria-label="Top 5 product sales" className="select-none">
      <h2 className="text-[17px] font-bold text-[#252825] mb-4">
        Top 5 product sales
      </h2>

      {chartItems.length === 0 ? (
        <div className="py-8 text-center text-[14px] text-[#6E746F]">
          No sales recorded yet.
        </div>
      ) : (
        <div className="flex items-center gap-4 sm:gap-8 justify-between">
          {/* Donut Chart Ring */}
          <div className="relative w-[155px] sm:w-[170px] h-[155px] sm:h-[170px] flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
              {slices.map((slice) => (
                <g key={slice.id}>
                  {slice.paths.map((p, pathIdx) => (
                    <path
                      key={pathIdx}
                      d={p}
                      fill={slice.color}
                      className="transition-all duration-300"
                    />
                  ))}

                  {/* Percentage label right on the slice */}
                  {slice.percentage >= 9 && (
                    <text
                      x={slice.textPos.x}
                      y={slice.textPos.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="font-bold text-[11px] select-none pointer-events-none fill-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]"
                    >
                      {Math.round(slice.percentage)}%
                    </text>
                  )}
                </g>
              ))}
            </svg>

            {/* Center Revenue metric */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-1">
              <span className="text-[16.5px] sm:text-[18px] font-bold text-[#252825] tracking-tight tabular-nums leading-none">
                ₱{Math.round(totalRevenue).toLocaleString('en-PH')}
              </span>
              <span className="text-[10px] sm:text-[10.5px] font-medium text-[#6E746F] mt-1 leading-none">
                Total Revenue
              </span>
            </div>
          </div>

          {/* Right Product List with color dots and percentages */}
          <div className="flex-1 min-w-0 space-y-3.5">
            {chartItems.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="min-w-0">
                    <span className="text-[13.5px] sm:text-[14px] font-semibold text-[#252825] block truncate leading-snug">
                      {item.name}
                    </span>
                    <span className="text-[11.5px] text-[#8F9690] block tabular-nums leading-none mt-0.5">
                      {item.formattedValue}
                    </span>
                  </div>
                </div>

                <span className="text-[13.5px] font-semibold text-[#252825] tabular-nums flex-shrink-0 ml-2">
                  {Math.round(item.percentage)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
