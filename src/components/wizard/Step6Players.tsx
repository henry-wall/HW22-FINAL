import { useState } from "react";
import type { TournamentFormat, CoupleMode } from "../../types/tournament";

interface Step6PlayersProps {
  format: TournamentFormat;
  coupleMode: CoupleMode;
  numPlayers: number;
  players: string[];
  couples: { manName: string; womanName: string }[];
  onPlayersChange: (p: string[]) => void;
  onCouplesChange: (c: { manName: string; womanName: string }[]) => void;
  onFinish: () => void;
  onBack: () => void;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Step6Players({
  format, coupleMode, numPlayers, players, couples,
  onPlayersChange, onCouplesChange, onFinish, onBack,
}: Step6PlayersProps) {
  const isMixed = format === "mixeddoubles";
  const [men, setMen] = useState<string[]>(
    isMixed && coupleMode === "draw"
      ? Array(numPlayers).fill("")
      : []
  );
  const [women, setWomen] = useState<string[]>(
    isMixed && coupleMode === "draw"
      ? Array(numPlayers).fill("")
      : []
  );

  const [pasteModal, setPasteModal] = useState<{ isOpen: boolean; target: "players" | "men" | "women" | "couples" }>({
    isOpen: false,
    target: "players",
  });
  const [pasteText, setPasteText] = useState("");

  // Initialize players array if needed
  const currentPlayers = players.length === numPlayers ? players : Array(numPlayers).fill("");
  const currentCouples = couples.length === numPlayers
    ? couples
    : Array(numPlayers).fill(null).map((_, i) => couples[i] || { manName: "", womanName: "" });

  function updatePlayer(idx: number, val: string) {
    const updated = [...currentPlayers];
    updated[idx] = val;
    onPlayersChange(updated);
  }

  function updateCouple(idx: number, field: "manName" | "womanName", val: string) {
    const updated = [...currentCouples];
    updated[idx] = { ...updated[idx], [field]: val };
    onCouplesChange(updated);
  }

  function handleDrawCouples() {
    const shuffledWomen = shuffleArray(women);
    const drawn = men.map((m, i) => ({ manName: m || `Homem ${i + 1}`, womanName: shuffledWomen[i] || `Mulher ${i + 1}` }));
    onCouplesChange(drawn);
  }

  function handlePasteConfirm() {
    const lines = pasteText
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.replace(/^\d+[\.\-\)\s]+\s*/, "").trim()); // Robust removal of "1. ", "02 - ", etc. without killing names that start with numbers (unless followed by separator)

    if (pasteModal.target === "players") {
      const updated = [...currentPlayers];
      for (let i = 0; i < numPlayers && i < lines.length; i++) {
        updated[i] = lines[i];
      }
      onPlayersChange(updated);
    } else if (pasteModal.target === "men") {
      const updated = [...men];
      for (let i = 0; i < numPlayers && i < lines.length; i++) {
        updated[i] = lines[i];
      }
      setMen(updated);
    } else if (pasteModal.target === "women") {
      const updated = [...women];
      for (let i = 0; i < numPlayers && i < lines.length; i++) {
        updated[i] = lines[i];
      }
      setWomen(updated);
    } else if (pasteModal.target === "couples") {
      const updated = [...currentCouples];
      for (let i = 0; i < numPlayers && i < lines.length; i++) {
        const line = lines[i];
        // Split by " e ", " com " (require spaces) OR symbols like "/", "+", "&" (optional spaces)
        const parts = line.split(/\s+(?:e|com)\s+|\s*[\/&\+]\s*/i);
        updated[i] = {
          manName: parts[0]?.trim() || "",
          womanName: parts[1]?.trim() || ""
        };
      }
      onCouplesChange(updated);
    }

    setPasteModal({ ...pasteModal, isOpen: false });
    setPasteText("");
  }

  function canFinish(): boolean {
    if (isMixed || format === "fixeddoubles") {
      if (isMixed && coupleMode === "draw") {
        return men.filter(m => m.trim()).length >= numPlayers && women.filter(w => w.trim()).length >= numPlayers;
      }
      return currentCouples.every(c => c.manName.trim() && c.womanName.trim());
    }
    return currentPlayers.filter(p => p.trim()).length >= numPlayers;
  }

  function renderContent() {
    // Render for Troca de Casais - draw mode (separate lists)
    if (isMixed && coupleMode === "draw") {
      return (
        <div className="animate-slide-up">
          <h2 className="text-2xl font-bold text-text-primary mb-2">Sorteio de Casais</h2>
          <p className="text-text-secondary text-sm mb-5">
            Informe os homens e mulheres — o sistema sorteará os casais
          </p>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-bold text-brand-cyan">♂ HOMENS ({numPlayers})</label>
                <button 
                  onClick={() => setPasteModal({ isOpen: true, target: "men" })}
                  className="text-[10px] font-bold text-brand-cyan border border-brand-cyan/20 px-2 py-0.5 rounded hover:bg-brand-cyan/10 transition-colors"
                >
                  📋 Colar Lista
                </button>
              </div>
              <div className="space-y-2">
                {Array(numPlayers).fill(null).map((_, i) => (
                  <input
                    key={i}
                    className="input-dark text-sm py-2"
                    placeholder={`Homem ${i + 1}`}
                    value={men[i] || ""}
                    onChange={e => {
                      const updated = [...men];
                      updated[i] = e.target.value;
                      setMen(updated);
                    }}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-bold text-brand-pink">♀ MULHERES ({numPlayers})</label>
                <button 
                  onClick={() => setPasteModal({ isOpen: true, target: "women" })}
                  className="text-[10px] font-bold text-brand-pink border border-brand-pink/20 px-2 py-0.5 rounded hover:bg-brand-pink/10 transition-colors"
                >
                  📋 Colar Lista
                </button>
              </div>
              <div className="space-y-2">
                {Array(numPlayers).fill(null).map((_, i) => (
                  <input
                    key={i}
                    className="input-dark text-sm py-2"
                    placeholder={`Mulher ${i + 1}`}
                    value={women[i] || ""}
                    onChange={e => {
                      const updated = [...women];
                      updated[i] = e.target.value;
                      setWomen(updated);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {couples.length === numPlayers && couples[0].manName && (
            <div className="surface-card mb-5 animate-fade-in">
              <p className="text-xs font-bold mb-3 text-brand-cyan">🎲 CASAIS SORTEADOS</p>
              <div className="space-y-1">
                {couples.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-text-primary font-semibold">{c.manName}</span>
                    <span className="text-text-muted">&</span>
                    <span className="font-semibold text-brand-pink">{c.womanName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            className="btn-cyan w-full mb-4"
            onClick={handleDrawCouples}
            disabled={men.filter(m => m.trim()).length < numPlayers || women.filter(w => w.trim()).length < numPlayers}
          >
            🎲 Sortear Casais
          </button>

          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={onBack}>← Voltar</button>
            <button
              className="btn-primary flex-1"
              onClick={onFinish}
              disabled={couples.length < numPlayers || !couples[0]?.manName}
            >
              🎾 Gerar Torneio
            </button>
          </div>
        </div>
      );
    }

    // Render for Fixed Doubles or Troca de Casais (fixed mode)
    if (format === "fixeddoubles" || (isMixed && coupleMode === "fixed")) {
      const title = format === "fixeddoubles" ? "Cadastro de Duplas" : "Cadastro de Casais";
      const subtitle = format === "fixeddoubles" ? "Informe o nome de cada dupla" : "Informe o nome de cada casal";
      return (
        <div className="animate-slide-up">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
              <p className="text-text-secondary text-sm mt-1 mb-5">{subtitle}</p>
            </div>
            <button 
              onClick={() => setPasteModal({ isOpen: true, target: "couples" })}
              className="text-[10px] font-bold text-primary border border-border-main px-2 py-1 flex items-center gap-1 rounded hover:bg-surface-hover transition-colors"
            >
              📋 Colar Lista
            </button>
          </div>
          <div className="space-y-3 mb-6">
            {currentCouples.map((c, i) => (
              <div key={i} className="surface-card">
                <p className="text-xs font-bold mb-2 text-brand-pink">Casal {i + 1}</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="input-dark text-sm py-2"
                    placeholder={format === "fixeddoubles" ? "Parceiro 1" : "♂ Homem"}
                    value={c.manName}
                    onChange={e => updateCouple(i, "manName", e.target.value)}
                  />
                  <input
                    className="input-dark text-sm py-2"
                    placeholder={format === "fixeddoubles" ? "Parceiro 2" : "♀ Mulher"}
                    value={c.womanName}
                    onChange={e => updateCouple(i, "womanName", e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={onBack}>← Voltar</button>
            <button className="btn-primary flex-1" onClick={onFinish} disabled={!canFinish()}>
              🎾 Gerar Torneio
            </button>
          </div>
        </div>
      );
    }

    // Render for Super 8 / King & Queen - player list
    return (
      <div className="animate-slide-up">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">Jogadores</h2>
            <p className="text-text-secondary text-sm mt-1 mb-5">
              Informe o nome dos {numPlayers} jogadores
            </p>
          </div>
          <button 
            onClick={() => setPasteModal({ isOpen: true, target: "players" })}
            className="text-[10px] font-bold text-primary border border-border-main px-2 py-1 flex items-center gap-1 rounded hover:bg-surface-hover transition-colors mt-1"
          >
            📋 Colar Lista
          </button>
        </div>
        <div className="space-y-2 mb-6">
          {Array(numPlayers).fill(null).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <span
                className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-black flex-shrink-0 bg-brand-pink text-brand-cyan shadow-sm"
              >
                {i + 1}
              </span>
              <input
                className="input-dark text-sm py-2.5"
                placeholder={`Jogador ${i + 1}`}
                value={currentPlayers[i] || ""}
                onChange={e => updatePlayer(i, e.target.value)}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary flex-1" onClick={onBack}>← Voltar</button>
          <button className="btn-primary flex-1" onClick={onFinish} disabled={!canFinish()}>
            🎾 Gerar Torneio
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {renderContent()}


      {pasteModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-main rounded-2xl w-full max-w-md p-5 animate-fade-in shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-primary">Colar Lista</h3>
              <button onClick={() => setPasteModal({ ...pasteModal, isOpen: false })} className="text-muted hover:text-primary">✕</button>
            </div>
            <p className="text-xs text-secondary mb-4">
              Cole a lista do WhatsApp abaixo. A numeração será removida automaticamente.
              {pasteModal.target === "couples" && " Dica: use ' e ', '/', '+' ou '&' para separar os casais (ex: João e Maria)."}
            </p>
            <textarea
              className="input-dark w-full h-48 resize-none mb-4"
              placeholder="1. João&#10;2. Maria&#10;..."
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3">
              <button className="btn-secondary flex-1 py-2 text-sm" onClick={() => setPasteModal({ ...pasteModal, isOpen: false })}>Cancelar</button>
              <button className="btn-primary flex-1 py-2 text-sm" onClick={handlePasteConfirm} disabled={!pasteText.trim()}>Importar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
