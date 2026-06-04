import { useEffect } from "react";
import type { TiebreakerCriterion, DurationType } from "../../types/tournament";

interface Step5VictoryProps {
  order: TiebreakerCriterion[];
  onChange: (order: TiebreakerCriterion[]) => void;
  durationType: DurationType;
  onNext: () => void;
  onBack: () => void;
}

const CRITERIA_INFO: Record<TiebreakerCriterion, { icon: string; title: string; subtitle: string }> = {
  wins: {
    icon: "🏆",
    title: "Vitórias / Pontos",
    subtitle: "Maior número de vitórias (ou pontos).",
  },
  direct_confrontation: {
    icon: "⚔️",
    title: "Confronto Direto",
    subtitle: "Vencedor do confronto entre os empatados (apenas se 2 times empatarem).",
  },
  gamediff: {
    icon: "⚖️",
    title: "Saldo de Games",
    subtitle: "Games ganhos menos games perdidos.",
  },
  gamesfor: {
    icon: "📊",
    title: "Games a Favor",
    subtitle: "Total de games ganhos no torneio.",
  },
};

export default function Step5Victory({ order, onChange, durationType, onNext, onBack }: Step5VictoryProps) {
  const moveUp = (index: number) => {
    if (index === 0) return;

    const newOrder = [...order];
    const temp = newOrder[index - 1];
    newOrder[index - 1] = newOrder[index];
    newOrder[index] = temp;
    onChange(newOrder);
  };

  const moveDown = (index: number) => {
    if (index === order.length - 1) return;

    const newOrder = [...order];
    const temp = newOrder[index + 1];
    newOrder[index + 1] = newOrder[index];
    newOrder[index] = temp;
    onChange(newOrder);
  };

  return (
    <div className="animate-slide-up">
      <h2 className="text-2xl font-bold text-text-primary mb-2">Critérios de Desempate</h2>
      <p className="text-text-secondary text-sm mb-6">
        Defina a ordem de importância dos critérios. O sistema avaliará de cima para baixo.
      </p>

      {/* Removed fixed rule message for game6 so organizer can change criteria */}

      <div className="space-y-2 mb-8">
          {order.map((criterion, index) => {
          const info = CRITERIA_INFO[criterion];
            return (
            <div
              key={criterion}
              className={`flex items-center gap-3 p-3 rounded-xl border ${
                "bg-surface-elevated border-border-main"
              }`}
            >
              <div className="flex flex-col gap-1 items-center justify-center">
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface hover:bg-surface-hover text-text-secondary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ▲
                </button>
                <div className="text-[10px] font-black text-brand-cyan px-1">{index + 1}º</div>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === order.length - 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface hover:bg-surface-hover text-text-secondary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ▼
                </button>
              </div>

              <div className="flex-1 min-w-0 flex items-start gap-3">
                <div className="text-2xl">{info.icon}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text-primary text-sm">{info.title}</span>
                  </div>
                  <p className="text-text-secondary text-xs leading-snug mt-0.5">{info.subtitle}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button className="btn-secondary flex-1" onClick={onBack}>← Voltar</button>
        <button className="btn-primary flex-1" onClick={onNext}>Continuar →</button>
      </div>
    </div>
  );
}
