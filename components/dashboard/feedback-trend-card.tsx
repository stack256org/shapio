"use client";

import {
  Area,
  ComposedChart,
  DefaultZIndexes,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { categoryTrendKey } from "@/lib/dashboard/constants";
import type { FeedbackTrendPoint } from "@/lib/dashboard/queries";
import { cn } from "@/lib/utils";

interface Category {
  color: string;
  id: string;
  name: string;
}

interface FeedbackTrendCardProps {
  categories: Category[];
  isPending?: boolean;
  points: FeedbackTrendPoint[];
  weekly: boolean;
}

const TOTAL_KEY = "total";
const TOTAL_COLOR = "var(--ir-primary)";

// Recharts' <CartesianGrid> reliably drops one interior horizontal line out
// of five when auto-deriving them from the Y axis — confirmed even when
// passed the exact same values explicitly via `horizontalValues`, so this
// isn't a tick-value mismatch, it's how that component computes its own line
// positions internally. Each grid line below is instead a separate
// <ReferenceLine>, drawn independently per tick — that's what actually keeps
// all of them on screen.
function niceTicks(maxValue: number, targetCount = 4): number[] {
  if (maxValue <= 0) {
    return [0, 1];
  }
  const rawStep = maxValue / targetCount;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const niceNormalized =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = Math.max(1, niceNormalized * magnitude);
  const niceMax = Math.ceil(maxValue / step) * step;

  const ticks: number[] = [];
  for (let tick = 0; tick <= niceMax; tick += step) {
    ticks.push(Math.round(tick));
  }
  return ticks;
}

function formatTick(dateStr: string, weekly: boolean): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  const label = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return weekly ? `Week of ${label}` : label;
}

export function FeedbackTrendCard({
  categories,
  isPending,
  points,
  weekly,
}: FeedbackTrendCardProps) {
  const total = points.reduce((sum, p) => sum + p.total, 0);
  const maxCount = points.reduce((max, p) => Math.max(max, p.total), 0);
  const yTicks = niceTicks(maxCount);

  const chartConfig: ChartConfig = {
    [TOTAL_KEY]: { label: "Total", color: TOTAL_COLOR },
    ...Object.fromEntries(
      categories.map((category) => [
        categoryTrendKey(category.id),
        { label: category.name, color: category.color },
      ])
    ),
  };

  return (
    <div
      className={cn(
        "rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs transition-opacity duration-150 ease-ir-standard",
        isPending && "opacity-60"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-ir-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-ir-heading">
            Feedback trend
          </h2>
          <p className="mt-0.5 text-xs text-ir-muted">
            New feedback {weekly ? "per week" : "per day"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <LegendDot color={TOTAL_COLOR} label="Total" />
            {categories.map((category) => (
              <LegendDot
                color={category.color}
                key={category.id}
                label={category.name}
              />
            ))}
          </div>
          <span className="shrink-0 text-lg font-semibold tabular-nums text-ir-heading">
            {total.toLocaleString()}
          </span>
        </div>
      </div>

      {total === 0 ? (
        <div className="flex h-48 items-center justify-center px-5 text-sm text-ir-muted">
          No feedback yet in this period.
        </div>
      ) : (
        <ChartContainer
          className="aspect-auto h-48 w-full px-2 py-4"
          config={chartConfig}
        >
          <ComposedChart
            data={points}
            margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
          >
            {yTicks.map((tick) => (
              <ReferenceLine
                ifOverflow="extendDomain"
                key={tick}
                stroke="var(--ir-border)"
                y={tick}
                zIndex={DefaultZIndexes.grid}
              />
            ))}
            <XAxis
              axisLine={false}
              dataKey="date"
              minTickGap={40}
              tickFormatter={(value) => formatTick(value, weekly)}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              domain={[0, yTicks[yTicks.length - 1]]}
              tickLine={false}
              ticks={yTicks}
              width={28}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => formatTick(String(value), weekly)}
                />
              }
              cursor={{ stroke: "var(--ir-border)" }}
            />
            <Area
              activeDot={{
                r: 4,
                stroke: "var(--ir-surface)",
                strokeWidth: 2,
              }}
              dataKey={TOTAL_KEY}
              dot={false}
              fill={`var(--color-${TOTAL_KEY})`}
              fillOpacity={0.1}
              stroke={`var(--color-${TOTAL_KEY})`}
              strokeWidth={2}
              type="monotone"
            />
            {categories.map((category) => {
              const dataKey = categoryTrendKey(category.id);
              return (
                <Line
                  activeDot={{
                    r: 3.5,
                    stroke: "var(--ir-surface)",
                    strokeWidth: 2,
                  }}
                  dataKey={dataKey}
                  dot={false}
                  key={category.id}
                  stroke={`var(--color-${dataKey})`}
                  strokeWidth={1.5}
                  type="monotone"
                />
              );
            })}
          </ComposedChart>
        </ChartContainer>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-ir-muted">
      <span
        aria-hidden="true"
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
