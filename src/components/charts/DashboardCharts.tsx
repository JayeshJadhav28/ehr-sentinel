import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useMemo, useState } from "react";

const TOKENS = [
  "--color-severity-high",
  "--color-severity-medium",
  "--color-severity-low",
  "--color-severity-benign",
  "--color-primary",
  "--color-border",
  "--color-muted-foreground",
  "--color-surface",
  "--color-foreground",
] as const;

type TokenMap = Record<(typeof TOKENS)[number], string>;

/* Light theme fallbacks — match :root in styles.css */
const FALLBACK: TokenMap = {
  "--color-severity-high":    "#D64545",
  "--color-severity-medium":  "#D99000",
  "--color-severity-low":     "#2B89FF",
  "--color-severity-benign":  "#22A06B",
  "--color-primary":          "#2B89FF",
  "--color-border":           "#E2E6EA",
  "--color-muted-foreground": "#8B94A1",
  "--color-surface":          "#FFFFFF",
  "--color-foreground":       "#171A1F",
};

/* Shared, static chart settings (created once, not on every render) */
const GRID_DASH = "3 3";
const LEGEND_STYLE = { fontSize: 11 } as const;
const VERTICAL_BAR_MARGIN = { top: 4, right: 8, bottom: 0, left: -18 };
const HORIZONTAL_BAR_MARGIN = { top: 4, right: 16, bottom: 0, left: 40 };

function readTokens(): TokenMap {
  const styles = getComputedStyle(document.documentElement);
  const next = { ...FALLBACK };
  for (const token of TOKENS) {
    const value = styles.getPropertyValue(token).trim();
    if (value) next[token] = value;
  }
  return next;
}

function useTokens(): TokenMap {
  const [tokens, setTokens] = useState<TokenMap>(FALLBACK);
  useEffect(() => {
    const next = readTokens();
    // Skip the extra re-render when the CSS values match what we already have
    setTokens((prev) => (TOKENS.every((k) => prev[k] === next[k]) ? prev : next));
  }, []);
  return tokens;
}

function tooltipStyle(t: TokenMap) {
  return {
    contentStyle: {
      background: t["--color-surface"],
      border: `1px solid ${t["--color-border"]}`,
      borderRadius: "8px",
      fontSize: "12px",
      color: t["--color-foreground"],
      boxShadow: "0 4px 12px rgba(23,26,31,0.10)",
    },
  };
}

function barCursor(t: TokenMap) {
  return { fill: t["--color-border"], opacity: 0.4 };
}

/** Axis tick style shared by all charts. */
function useAxisTick(t: TokenMap) {
  return useMemo(
    () => ({ stroke: t["--color-muted-foreground"], fontSize: 11 }),
    [t],
  );
}

export function ActivityChart({
  data,
}: {
  data: { hour: string; success: number; denied: number; failed: number }[];
}) {
  const t = useTokens();
  const AXIS = useAxisTick(t);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={VERTICAL_BAR_MARGIN}>
        <CartesianGrid
          strokeDasharray={GRID_DASH}
          stroke={t["--color-border"]}
          vertical={false}
        />
        <XAxis dataKey="hour" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip {...tooltipStyle(t)} cursor={barCursor(t)} />
        <Legend wrapperStyle={LEGEND_STYLE} />
        <Bar dataKey="success" name="Authorized" stackId="a" fill={t["--color-severity-benign"]} />
        <Bar dataKey="denied"  name="Denied"     stackId="a" fill={t["--color-severity-high"]} />
        <Bar dataKey="failed"  name="Failed"     stackId="a" fill={t["--color-severity-medium"]} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DetectionDistribution({
  data,
}: {
  data: { type: string; count: number }[];
}) {
  const t = useTokens();
  const AXIS = useAxisTick(t);
  const categoryTick = useMemo(() => ({ ...AXIS, fontSize: 10 }), [AXIS]);
  const ruleColors = useMemo(
    () => [
      t["--color-severity-high"],
      t["--color-severity-medium"],
      t["--color-severity-low"],
      t["--color-primary"],
      t["--color-severity-benign"],
    ],
    [t],
  );
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={HORIZONTAL_BAR_MARGIN}>
        <CartesianGrid
          strokeDasharray={GRID_DASH}
          stroke={t["--color-border"]}
          horizontal={false}
        />
        <XAxis
          type="number"
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="type"
          tick={categoryTick}
          width={150}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip {...tooltipStyle(t)} cursor={barCursor(t)} />
        <Bar dataKey="count" name="Alerts" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={entry.type}
              fill={ruleColors[i % ruleColors.length] ?? t["--color-primary"]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BaselineComparisonChart({
  data,
}: {
  data: { hour: number; baseline: number; current: number }[];
}) {
  const t = useTokens();
  const AXIS = useAxisTick(t);
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={VERTICAL_BAR_MARGIN}>
        <CartesianGrid
          strokeDasharray={GRID_DASH}
          stroke={t["--color-border"]}
          vertical={false}
        />
        <XAxis
          dataKey="hour"
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          tickFormatter={(h) => `${h}:00`}
        />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip
          {...tooltipStyle(t)}
          labelFormatter={(h) => `Hour ${h}:00 UTC`}
        />
        <Legend wrapperStyle={LEGEND_STYLE} />
        <Line
          type="monotone"
          dataKey="baseline"
          name="Baseline (daily mean)"
          stroke={t["--color-primary"]}
          strokeWidth={2}
          dot={false}
          strokeDasharray="5 3"
        />
        <Line
          type="monotone"
          dataKey="current"
          name="Last 24 hours"
          stroke={t["--color-severity-medium"]}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}