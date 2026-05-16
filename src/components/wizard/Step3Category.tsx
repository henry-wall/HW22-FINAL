import type { Category } from "../../types/tournament";

interface Step3CategoryProps {
  selected: Category;
  onChange: (c: Category) => void;
  onNext: () => void;
  onBack: () => void;
}

const options = [
  {
    id: "masc" as Category,
    icon: "♂",
    title: "Masculino",
    subtitle: "Apenas jogadores masculinos",
    color: "var(--brand-cyan)",
  },
  {
    id: "fem" as Category,
    icon: "♀",
    title: "Feminino",
    subtitle: "Apenas jogadoras femininas",
    color: "#db2777", // Darker pink for light mode
  },
  {
    id: "mixed" as Category,
    icon: "⚥",
    title: "Misto",
    subtitle: "Duplas formadas por um homem e uma mulher",
    color: "var(--brand-cyan)",
  },
];

export default function Step3Category({ selected, onChange, onNext, onBack }: Step3CategoryProps) {
  return (
    <div className="animate-slide-up">
      <h2 className="text-2xl font-bold text-text-primary mb-2">Categoria do Torneio</h2>
      <p className="text-text-secondary text-sm mb-6">Escolha se o torneio será masculino, feminino ou misto</p>

      <div className="space-y-3 mb-8">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={`selection-card w-full text-left ${selected === o.id ? "selected" : ""}`}
          >
            <div
              className="card-icon text-2xl font-bold"
              style={selected === o.id
                ? { background: `rgba(255,5,149,0.15)`, color: "#FF0595" }
                : { background: `rgba(0,0,0,0.05)`, color: o.color }
              }
            >
              {o.icon}
            </div>
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
