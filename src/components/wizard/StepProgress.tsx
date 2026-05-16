interface StepProgressProps {
  current: number;
  total: number;
  stepNames: string[];
}

export default function StepProgress({ current, total, stepNames }: StepProgressProps) {
  return (
    <div className="w-full mb-6">
      {/* Barra de progresso */}
      <div className="flex gap-1.5 mb-3">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-500"
            style={{
              background: i < current
                ? "linear-gradient(90deg, var(--brand-pink), var(--brand-pink-hover))"
                : i === current - 1
                  ? "linear-gradient(90deg, var(--brand-pink), var(--brand-pink-hover))"
                  : "var(--border-main)",
              opacity: i < current ? 1 : 0.4,
            }}
          />
        ))}
      </div>
      {/* Label do passo atual */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary">
          Passo <span className="font-bold text-brand-pink">{current}</span> de {total}
        </span>
        <span className="font-semibold text-text-primary">
          {stepNames[current - 1]}
        </span>
      </div>
    </div>
  );
}
