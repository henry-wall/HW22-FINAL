import type { CoupleMode } from "../../types/tournament";

interface Step2CoupleProps {
  selected: CoupleMode;
  onChange: (m: CoupleMode) => void;
  onNext: () => void;
  onBack: () => void;
}

const options = [
  {
    id: "fixed" as CoupleMode,
    icon: "💑",
    title: "Casais Fixos",
    subtitle: "Você define manualmente quem forma casal com quem",
  },
  {
    id: "draw" as CoupleMode,
    icon: "🎲",
    title: "Sortear Casais",
    subtitle: "Informe os homens e mulheres separados — o sistema sorteia quem é o par de cada um",
  },
];

export default function Step2Couple({ selected, onChange, onNext, onBack }: Step2CoupleProps) {
  return (
    <div className="animate-slide-up">
      <h2 className="text-2xl font-bold text-text-primary mb-2">Formação dos Casais</h2>
      <p className="text-text-secondary text-sm mb-6">Como os casais serão definidos?</p>

      <div className="space-y-3 mb-6">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={`selection-card w-full text-left ${selected === o.id ? "selected" : ""}`}
          >
            <div className="card-icon">{o.icon}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-text-primary text-base">{o.title}</span>
                {selected === o.id && (
                  <span className="text-xs font-bold text-brand-pink">✓</span>
                )}
              </div>
              <p className="text-text-secondary text-sm">{o.subtitle}</p>
            </div>
          </button>
        ))}
      </div>

      {selected === "draw" && (
        <div className="surface-card mb-6 animate-fade-in border-brand-cyan/20">
          <p className="text-sm text-brand-cyan">
            💡 <strong>Como funciona:</strong> Na tela de jogadores, você cadastrará a lista de homens e a lista de mulheres separadamente.
            O sistema sorteia aleatoriamente quem forma casal com quem. A regra de "casais não jogam juntos" será respeitada automaticamente.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button className="btn-secondary flex-1" onClick={onBack}>← Voltar</button>
        <button className="btn-primary flex-1" onClick={onNext}>Continuar →</button>
      </div>
    </div>
  );
}
