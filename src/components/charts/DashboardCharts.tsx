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
import { useEffect, useState } from "react";

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

function useTokens(): TokenMap {
  const [tokens, setTokens] = useState<TokenMap>(FALLBACK);
  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    const next = { ...FALLBACK };
    for (const token of TOKENS) {
      const value = styles.getPropertyValue(token).trim();
      if (value) next[token] = value;
    }
    setTokens(next);
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

export function ActivityChart({
  data,
}: {
  data: { hour: string; success: number; denied: number; failed: number }[];
}) {
  const t = useTokens();
  const AXIS = { stroke: t["--color-muted-foreground"], fontSize: 11 };
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={t["--color-border"]}
          vertical={false}
        />
        <XAxis dataKey="hour" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip {...tooltipStyle(t)} cursor={{ fill: t["--color-border"], opacity: 0.4 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
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
  const AXIS = { stroke: t["--color-muted-foreground"], fontSize: 11 };
  const RULE_COLORS = [
    t["--color-severity-high"],
    t["--color-severity-medium"],
    t["--color-severity-low"],
    t["--color-primary"],
    t["--color-severity-benign"],
  ];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 0, left: 40 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
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
          tick={{ ...AXIS, fontSize: 10 }}
          width={150}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip {...tooltipStyle(t)} cursor={{ fill: t["--color-border"], opacity: 0.4 }} />
        <Bar dataKey="count" name="Alerts" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={entry.type}
              fill={RULE_COLORS[i % RULE_COLORS.length] ?? t["--color-primary"]}
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
  const AXIS = { stroke: t["--color-muted-foreground"], fontSize: 11 };
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid
          strokeDasharray="3 3"
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
        <Legend wrapperStyle={{ fontSize: 11 }} />
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