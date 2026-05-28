/**
 * ChartTooltip — single shared tooltip surface for all Recharts views.
 * Takes a render prop so each chart can format its own body.
 */
export function ChartTooltip({ active, payload, label, render, valueColor }) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: "var(--surface-overlay)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-md)",
        color: "var(--text-primary)",
        padding: "10px 12px",
        minWidth: "160px",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
        }}
      >
        {label}
      </p>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
        {render
          ? render(payload, label)
          : payload.map((entry) => (
              <div
                key={entry.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: "12.5px",
                  color: "var(--text-secondary)",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: valueColor || entry.color || "var(--accent)",
                  }}
                />
                <span style={{ flex: 1, color: "var(--text-secondary)" }}>{entry.name}</span>
                <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--text-primary)", fontWeight: 600 }}>
                  {entry.value}
                </span>
              </div>
            ))}
      </div>
    </div>
  );
}

/** Common Recharts axis style helpers — use these so chart styling is consistent. */
export const AXIS_STYLE = {
  axisLine: { stroke: "var(--border-default)" },
  tickLine: { stroke: "var(--border-subtle)" },
  tick: {
    fill: "var(--text-tertiary)",
    fontSize: 11,
    fontWeight: 500,
    fontVariantNumeric: "tabular-nums",
  },
};

export const GRID_STYLE = {
  stroke: "var(--border-default)",
  strokeDasharray: "2 4",
  vertical: false,
};
