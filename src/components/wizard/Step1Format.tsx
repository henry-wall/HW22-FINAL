import type { TournamentFormat } from "../../types/tournament";

interface Step1FormatProps {
  selected: TournamentFormat | null;
  onChange: (f: TournamentFormat) => void;
  onNext: () => void;
}

const formats = [
  {
    id: "super8" as TournamentFormat,
    icon: "8️⃣",
    title: "Super 8",
    subtitle: "Torneio com 8+ jogadores, duplas trocando a cada rodada",
    description: "Cada jogador joga com um parceiro diferente a cada rodada",
  },
  {
    id: "kingqueen" as TournamentFormat,
    icon: "👑",
    title: "King & Queen",
    subtitle: "Sistema de rei/rainha com promoções e rebaixamentos",
    description: "Vencedores sobem de quadra, perdedores descem",
  },
  {
    id: "mixeddoubles" as TournamentFormat,
    icon: "💑",
    title: "Troca de Casais",
    subtitle: "Duplas mistas com casais separados durante as partidas",
    description: "Homens e mulheres de um casal nunca jogam juntos",
  },
  {
    id: "fixeddoubles" as TournamentFormat,
    icon: "👥",
    title: "Duplas Fixas",
    subtitle: "Torneio de duplas tradicionais com parceiros fixos",
    description: "As duplas são mantidas durante todo o torneio em formato todos contra todos (Groups ou Single)",
  },
  {
    id: "drawdoubles" as TournamentFormat,
    icon: "🎲",
    title: "Duplas Sorteadas",
    subtitle: "Os jogadores são sorteados em duplas fixas no início",
    description: "O sistema sorteia os parceiros uma única vez e as duplas seguem juntas até o fim",
  },
];

export default function Step1Format({ selected, onChange, onNext }: Step1FormatProps) {
  return (
    <div className="animate-slide-up">
      <h2 className="text-2xl font-bold text-text-primary mb-2">Formato do Torneio</h2>
      <p className="text-text-secondary text-sm mb-6">Escolha o tipo de torneio que deseja organizar</p>

      <div className="space-y-3 mb-8">
        {formats.map((f) => (
          <button
            key={f.id}
            onClick={() => onChange(f.id)}
            className={`selection-card w-full text-left ${selected === f.id ? "selected" : ""}`}
          >
            <div className="card-icon">{f.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-text-primary text-base">{f.title}</span>
                {selected === f.id && (
                  <span className="text-xs font-bold text-brand-pink">✓</span>
                )}
              </div>
              <p className="text-text-secondary text-sm leading-snug">{f.subtitle}</p>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="surface-card mb-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-bold text-brand-cyan">ℹ️ Sobre este formato</span>
          </div>
          <p className="text-text-secondary text-sm">
            {formats.find(f => f.id === selected)?.description}
          </p>
        </div>
      )}

      <button
        className="btn-primary"
        onClick={onNext}
        disabled={!selected}
      >
        Continuar →
      </button>
    </div>
  );
}
