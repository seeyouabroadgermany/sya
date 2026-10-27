"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Month = { key: string; label: string; leads: number; current: boolean };

function TipContent({ active, payload }: { active?: boolean; payload?: { payload: Month }[] }) {
  if (!active || !payload?.length) return null;
  const m = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-bg px-3 py-2 text-sm">
      <p className="text-xs text-subtle">{m.label}</p>
      <p className="num font-semibold">
        {m.leads} {m.leads === 1 ? "lead" : "leads"}
      </p>
    </div>
  );
}

// New leads per month. This month is highlighted in brand blue, earlier months are grey context.
export function LeadsByMonthChart({ months }: { months: Month[] }) {
  const total = months.reduce((n, m) => n + m.leads, 0);
  return (
    <figure>
      <div className="h-56" role="img" aria-label={`New leads per month over the last 12 months, ${total} in total`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={months} margin={{ top: 8, right: 0, bottom: 0, left: -20 }} barCategoryGap={2}>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              interval="preserveStartEnd"
              minTickGap={8}
            />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} width={44} />
            <Tooltip content={<TipContent />} cursor={{ fill: "var(--surface-2)" }} />
            <Bar dataKey="leads" radius={[4, 4, 0, 0]} maxBarSize={36}>
              {months.map((m) => (
                <Cell key={m.key} fill={m.current ? "var(--brand)" : "var(--chart-context)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        <table>
          <tbody>
            {months.map((m) => (
              <tr key={m.key}>
                <th>{m.label}</th>
                <td>{m.leads}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}
