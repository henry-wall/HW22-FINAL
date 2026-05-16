import type { PairingMode } from "../../types/tournament";

interface Step2PairingProps {
  selected: PairingMode;
  onChange: (m: PairingMode) => void;
  onNext: () => void;
  onBack: () => void;
}

const options = [
  {
    id: "random" as PairingMode,
    icon: "🎲",
    title: "Sorteadas",
    subtitle: "O sistema sorteia automaticamente as duplas a cada torneio",
  },
  {
    id: "fixed" as PairingMode,
    icon: "📋",
    title: "Duplas Fixas",
    subtitle: "Você define manualmente quem joga com quem durante todo o torneio",
  },
];

export default function Step2Pairing({ selected, onChange, onNext, onBack }: Step2PairingProps) {
  return (
    <div className="animate-slide-up">
      <h2 className="text-2xl font-bold text-text-primary mb-2">Tipo de Duplas</h2>
      <p className="text-text-secondary text-sm mb-6">Como as duplas serão formadas?</p>

      <div className="space-y-3 mb-8">
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

      <div className="flex gap-3">
        <button className="btn-secondary flex-1" onClick={onBack}>← Voltar</button>
        <button className="btn-primary flex-1" onClick={onNext}>Continuar →</button>
      </div>
    </div>
  );
}
