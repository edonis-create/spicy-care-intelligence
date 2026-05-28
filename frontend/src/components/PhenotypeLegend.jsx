import { PHENOTYPES } from "../constants/phenotypes";
import { cn } from "./ui/cn";

export function PhenotypeLegend({ className }) {
  return (
    <div
      className={cn(
        "grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
        className,
      )}
    >
      {PHENOTYPES.map((phenotype) => (
        <div
          key={phenotype.id}
          className="surface-2 group flex items-start gap-3 rounded-md p-3.5"
          style={{
            background: `linear-gradient(180deg, ${phenotype.color.hex}10 0%, transparent 90%), var(--surface-2)`,
            borderColor: `${phenotype.color.hex}28`,
          }}
        >
          <span
            className="mt-1 h-2 w-2 shrink-0 rounded-full ring-2 ring-bg-base"
            style={{
              backgroundColor: phenotype.color.hex,
              boxShadow: `0 0 8px ${phenotype.color.hex}88`,
            }}
          />
          <div className="min-w-0">
            <p className="flex items-baseline gap-1.5 text-[13px] font-semibold text-fg-primary">
              <span style={{ color: phenotype.color.hex }}>{phenotype.id}</span>
              <span className="truncate">{phenotype.name}</span>
            </p>
            <p className="mt-0.5 text-[12px] leading-4 text-fg-tertiary">
              {phenotype.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
