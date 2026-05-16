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
  const isGame6 = durationType === "game6";

  // Force gamediff to be first if game6 is selected
  useEffect(() => {
    if (isGame6 && order[0] !== "gamediff") {
      const newOrder = ["gamediff" as TiebreakerCriterion, ...order.filter(c => c !== "gamediff")];
      onChange(newOrder);
    }
  }, [isGame6, order, onChange]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    if (isGame6 && index === 1) return; // Cannot move above index 0 if game6

    const newOrder = [...order];
    const temp = newOrder[index - 1];
    newOrder[index - 1] = newOrder[index];
    newOrder[index] = temp;
    onChange(newOrder);
  };

  const moveDown = (index: number) => {
    if (index === order.length - 1) return;
    if (isGame6 && index === 0) return; // Cannot move index 0 if game6

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

      {isGame6 && (
        <div className="bg-brand-pink/10 border border-brand-pink/30 p-3 rounded-lg mb-4 text-xs text-brand-pink font-medium">
          * Para o formato "Até 6 Games", o Saldo de Games é obrigatoriamente o 1º critério.
        </div>
      )}

      <div className="space-y-2 mb-8">
        {order.map((criterion, index) => {
          const info = CRITERIA_INFO[criterion];
          const isLocked = isGame6 && index === 0;

          return (
            <div
              key={criterion}
              className={`flex items-center gap-3 p-3 rounded-xl border ${
                isLocked ? "bg-surface-elevated/50 border-brand-pink/30" : "bg-surface-elevated border-border-main"
              }`}
            >
              <div className="flex flex-col gap-1 items-center justify-center">
                <button
                  onClick={() => moveUp(index)}
                  disabled={isLocked || index === 0 || (isGame6 && index === 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface hover:bg-surface-hover text-text-secondary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ▲
                </button>
                <div className="text-[10px] font-black text-brand-cyan px-1">{index + 1}º</div>
                <button
                  onClick={() => moveDown(index)}
                  disabled={isLocked || index === order.length - 1}
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
                    {isLocked && <span className="text-[10px] bg-brand-pink/20 text-brand-pink px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Fixo</span>}
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
