import { useState, useEffect, useCallback, useRef } from "react";
import type { TournamentFormat, TournamentConfig, DrawMode } from "../../types/tournament";
import { generateSuper8Schedule } from "../../engines/super8Engine";
import { generateDoublesSchedule } from "../../engines/doublesEngine";
import { shuffleArray } from "../../utils/drawUtils";

export interface DrawCeremonyData {
  players: string[];
  couples: { manName: string; womanName: string }[];
  format: TournamentFormat;
  numPlayers: number;
  numCourts: number;
  config: TournamentConfig;
}

interface DrawCeremonyModalProps {
  isOpen: boolean;
  data: DrawCeremonyData;
  onConfirm: (drawnPlayers?: string[], drawnCouples?: { manName: string; womanName: string }[], drawSummary?: { groups?: { groupA: string[]; groupB: string[] } }) => void;
  onCancel: () => void;
}

type DrawPhase = "intro" | "shuffling" | "result";

interface ShuffledPlayer {
  originalIndex: number;
  currentName: string;
  settled: boolean;
}

export default function DrawCeremonyModal({ isOpen, data, onConfirm, onCancel }: DrawCeremonyModalProps) {
  const [phase, setPhase] = useState<DrawPhase>("intro");
  const [shuffledPlayers, setShuffledPlayers] = useState<ShuffledPlayer[]>([]);
  const [finalPairs, setFinalPairs] = useState<{ teamA: string[]; teamB: string[] }[]>([]);
  const [useSeeded, setUseSeeded] = useState(Boolean(data.config.drawSeeded));
  const drawMode: DrawMode = data.config.drawMode ?? "full";
  const seededOrderRef = useRef<number[]>([]);

  // Get player names based on format
  const getPlayerNames = useCallback((): string[] => {
    if (data.format === "fixeddoubles" || data.format === "mixeddoubles") {
      return data.couples.map(c => `${c.manName} & ${c.womanName}`);
    }
    return data.players;
  }, [data]);

  // Generate the bracket/schedule with shuffled indices
  const generateSchedule = useCallback((shuffledIndices: number[]) => {
    const playerNames = getPlayerNames();
    
    // Create a mapping from original index to shuffled position
    const indexMap = new Map<number, number>();
    shuffledIndices.forEach((origIdx, shuffledPos) => {
      indexMap.set(origIdx, shuffledPos);
    });
    
    if (data.format === "super8") {
      const schedule = generateSuper8Schedule(data.numPlayers, data.numCourts);
      const pairs: { teamA: string[]; teamB: string[] }[] = [];
      
      schedule.forEach(match => {
        // Map original indices to shuffled positions for display
        const teamA = match.teamA.map(idx => {
          const shuffledPos = indexMap.get(idx) ?? idx;
          return playerNames[shuffledPos] || `Jogador ${shuffledPos + 1}`;
        });
        const teamB = match.teamB.map(idx => {
          const shuffledPos = indexMap.get(idx) ?? idx;
          return playerNames[shuffledPos] || `Jogador ${shuffledPos + 1}`;
        });
        pairs.push({ teamA, teamB });
      });
      
      return pairs;
    } else {
      const numPairs = data.format === "fixeddoubles" || data.format === "mixeddoubles" 
        ? data.numPlayers 
        : Math.floor(data.numPlayers / 2);
      
      const schedule = generateDoublesSchedule(numPairs, data.numCourts, data.config.groupFormat);
      const pairs: { teamA: string[]; teamB: string[] }[] = [];
      
      schedule.forEach(match => {
        const teamA = match.teamA.map(idx => {
          const shuffledPos = indexMap.get(idx) ?? idx;
          return playerNames[shuffledPos] || `Dupla ${shuffledPos + 1}`;
        });
        const teamB = match.teamB.map(idx => {
          const shuffledPos = indexMap.get(idx) ?? idx;
          return playerNames[shuffledPos] || `Dupla ${shuffledPos + 1}`;
        });
        pairs.push({ teamA, teamB });
      });
      
      return pairs;
    }
  }, [data, getPlayerNames]);

  // Start the draw animation
  const startDraw = useCallback(() => {
    const playerNames = getPlayerNames();
    const count = playerNames.length;
    
    // Generate shuffled indices for this draw
    const shuffledIndices = Array.from({ length: count }, (_, i) => i);
    const finalShuffledIndices = shuffleArray(shuffledIndices);
    seededOrderRef.current = finalShuffledIndices;

    if (useSeeded && count >= 4) {
      const firstHalf = shuffleArray(shuffledIndices.slice(0, Math.ceil(count / 2)));
      const secondHalf = shuffleArray(shuffledIndices.slice(Math.ceil(count / 2)));
      seededOrderRef.current = [...firstHalf, ...secondHalf];
    }
    
    // Initialize shuffled players
    const initial: ShuffledPlayer[] = playerNames.map((name, idx) => ({
      originalIndex: idx,
      currentName: name,
      settled: false,
    }));
    
    setShuffledPlayers(initial);
    setPhase("shuffling");
    
    // Shuffle animation - cycle through random names
    let shuffleCount = 0;
    const maxShuffles = 20;
    
    const shuffleInterval = setInterval(() => {
      shuffleCount++;
      
      setShuffledPlayers(prev => {
        const updated = prev.map(p => {
          if (p.settled) return p;
          // Random name from pool
          const randomIdx = Math.floor(Math.random() * playerNames.length);
          return { ...p, currentName: playerNames[randomIdx] };
        });
        return updated;
      });
      
      // Start settling players one by one
      const settleIndex = Math.floor((shuffleCount / maxShuffles) * playerNames.length);
      
      setShuffledPlayers(prev => {
        const updated = [...prev];
        for (let i = 0; i < settleIndex && i < updated.length; i++) {
          updated[i] = { ...updated[i], currentName: playerNames[i], settled: true };
        }
        return updated;
      });
      
      if (shuffleCount >= maxShuffles) {
        clearInterval(shuffleInterval);
        
        // Final settle - all players get their real names in shuffled order
        setTimeout(() => {
          const final: ShuffledPlayer[] = finalShuffledIndices.map((origIdx) => ({
            originalIndex: origIdx,
            currentName: playerNames[origIdx],
            settled: true,
          }));
          setShuffledPlayers(final);
          
          // Generate the actual schedule with shuffled indices
          const pairs = generateSchedule(finalShuffledIndices);
          setFinalPairs(pairs);
          
          setPhase("result");
        }, 500);
      }
    }, 150);
  }, [getPlayerNames, generateSchedule, useSeeded]);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhase("intro");
      setShuffledPlayers([]);
      setFinalPairs([]);
      seededOrderRef.current = [];
    }
  }, [isOpen]);

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== "undefined" && 
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Auto-start animation unless user prefers reduced motion
  useEffect(() => {
    if (isOpen && phase === "intro" && !prefersReducedMotion) {
      const timer = setTimeout(startDraw, 1500);
      return () => clearTimeout(timer);
    } else if (isOpen && phase === "intro" && prefersReducedMotion) {
      // Skip animation for reduced motion
      const playerNames = getPlayerNames();
      const shuffledIndices = Array.from({ length: playerNames.length }, (_, i) => i);
      const finalShuffledIndices = shuffleArray(shuffledIndices);
      seededOrderRef.current = finalShuffledIndices;
      
      const final: ShuffledPlayer[] = finalShuffledIndices.map((origIdx) => ({
        originalIndex: origIdx,
        currentName: playerNames[origIdx],
        settled: true,
      }));
      setShuffledPlayers(final);
      const pairs = generateSchedule(finalShuffledIndices);
      setFinalPairs(pairs);
      setPhase("result");
    }
  }, [isOpen, phase, prefersReducedMotion, startDraw, getPlayerNames, generateSchedule]);

  if (!isOpen) return null;

  const getOrderedParticipants = () => {
    const playerNames = getPlayerNames();
    const ordered = seededOrderRef.current.length > 0
      ? seededOrderRef.current.map((origIdx) => playerNames[origIdx])
      : playerNames;
    const shouldIncludeOrder = drawMode !== "groups";
    const shouldIncludeGroups = drawMode !== "entry";

    const buildGroups = (items: string[]) => {
      const half = Math.ceil(items.length / 2);
      return {
        groupA: items.slice(0, half),
        groupB: items.slice(half),
      };
    };

    if (data.format === "drawdoubles") {
      const pairs: { manName: string; womanName: string }[] = [];
      for (let i = 0; i < ordered.length; i += 2) {
        pairs.push({
          manName: ordered[i] || `Jogador ${i + 1}`,
          womanName: ordered[i + 1] || `Jogador ${i + 2}`,
        });
      }
      return {
        drawnPlayers: shouldIncludeOrder ? ordered : [],
        drawnCouples: shouldIncludeOrder ? pairs : [],
        drawSummary: shouldIncludeGroups ? { groups: buildGroups(ordered) } : undefined,
      };
    }

    if (data.format === "fixeddoubles" || data.format === "mixeddoubles") {
      const couples = (seededOrderRef.current.length > 0 ? seededOrderRef.current : Array.from({ length: data.couples.length }, (_, i) => i))
        .map((origIdx) => data.couples[origIdx] ?? { manName: "", womanName: "" });
      return {
        drawnPlayers: shouldIncludeOrder ? ordered : [],
        drawnCouples: shouldIncludeOrder ? couples : [],
        drawSummary: shouldIncludeGroups ? { groups: buildGroups(couples.map(c => `${c.manName} & ${c.womanName}`)) } : undefined,
      };
    }

    return {
      drawnPlayers: shouldIncludeOrder ? ordered : [],
      drawnCouples: undefined,
      drawSummary: shouldIncludeGroups ? { groups: buildGroups(ordered) } : undefined,
    };
  };

  const formatTitle = {
    super8: "Super 8",
    kingqueen: "King & Queen",
    mixeddoubles: "Troca de Casais",
    fixeddoubles: "Duplas Fixas",
    drawdoubles: "Duplas Sorteadas",
  }[data.format] || data.format;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface border border-border-main rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-border-main text-center">
          <div className="text-4xl mb-3">🎲</div>
          <h2 className="text-2xl font-black text-text-primary mb-1">
            Sorteio do Torneio
          </h2>
          <p className="text-text-secondary text-sm">
            {formatTitle} • {data.numPlayers} jogadores
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Intro Phase */}
          {phase === "intro" && (
            <div className="text-center animate-fade-in">
              <div className="mb-6">
                <div className="text-6xl mb-4 animate-bounce">🎰</div>
                <h3 className="text-xl font-bold text-text-primary mb-2">
                  Preparando o sorteio...
                </h3>
                <p className="text-text-secondary text-sm">
                  {prefersReducedMotion 
                    ? "Sorteio será realizado instantaneamente." 
                    : "Aguarde enquanto sorteamos os confrontos!"}
                </p>
              </div>
              
              {/* Seeded toggle */}
              <div className="mb-6 p-4 rounded-2xl bg-bg-page border border-border-main">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="font-bold text-text-primary text-sm">🎯 Sorteio com Cabeças de Chave</p>
                    <p className="text-text-muted text-xs">Top 2 jogadores em metades opostas</p>
                  </div>
                  <button
                    onClick={() => setUseSeeded(!useSeeded)}
                    className={`w-12 h-7 rounded-full transition-all relative ${
                      useSeeded ? "bg-brand-pink" : "bg-border-main"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all ${
                      useSeeded ? "left-6" : "left-1"
                    }`} />
                  </button>
                </div>
              </div>

              <button
                onClick={startDraw}
                className="btn-primary w-full py-4 text-lg font-bold"
              >
                🎲 Iniciar Sorteio
              </button>
            </div>
          )}

          {/* Shuffling Phase */}
          {phase === "shuffling" && (
            <div className="animate-fade-in">
              <div className="text-center mb-6">
                <div className="text-5xl mb-3 animate-pulse">🎰</div>
                <h3 className="text-xl font-bold text-brand-cyan mb-2">
                  Sorteando os confrontos...
                </h3>
                <p className="text-text-secondary text-sm">
                  Os jogadores estão sendo posicionados!
                </p>
              </div>

              {/* Shuffling animation */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {shuffledPlayers.map((player, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition-all duration-200 ${
                      player.settled
                        ? "bg-brand-cyan/10 border-brand-cyan/30"
                        : "bg-bg-page border-border-main"
                    }`}
                  >
                    <div className="text-[10px] font-bold text-text-muted mb-1">
                      #{idx + 1}
                    </div>
                    <div className={`font-bold text-sm truncate ${
                      player.settled ? "text-brand-cyan" : "text-text-secondary animate-pulse"
                    }`}>
                      {player.currentName}
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-bg-page rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-brand-pink to-brand-cyan transition-all duration-150"
                  style={{ 
                    width: `${(shuffledPlayers.filter(p => p.settled).length / shuffledPlayers.length) * 100}%` 
                  }}
                />
              </div>
            </div>
          )}

          {/* Result Phase */}
          {phase === "result" && (
            <div className="animate-fade-in">
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">🎉</div>
                <h3 className="text-xl font-bold text-brand-pink mb-2">
                  Torneio pronto para começar!
                </h3>
                <p className="text-text-secondary text-sm">
                  {finalPairs.length} partidas foram sorteadas
                </p>
              </div>

              {/* Preview of first matches */}
              <div className="mb-6 space-y-2 max-h-64 overflow-y-auto">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3">
                  Primeiros Confrontos
                </p>
                {finalPairs.slice(0, 6).map((pair, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-bg-page border border-border-main animate-slide-up"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 text-right pr-3">
                        <span className="text-sm font-bold text-text-primary">
                          {pair.teamA.join(" & ")}
                        </span>
                      </div>
                      <div className="px-3 py-1 rounded-lg bg-brand-pink/20 text-brand-pink text-xs font-bold">
                        VS
                      </div>
                      <div className="flex-1 pl-3">
                        <span className="text-sm font-bold text-text-primary">
                          {pair.teamB.join(" & ")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {finalPairs.length > 6 && (
                  <p className="text-center text-text-muted text-xs py-2">
                    + {finalPairs.length - 6} mais partidas...
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    const { drawnPlayers, drawnCouples, drawSummary } = getOrderedParticipants();
                    onConfirm(drawnPlayers, drawnCouples, drawSummary);
                  }}
                  className="btn-primary w-full py-4 text-lg font-bold"
                >
                  🎾 Iniciar Torneio
                </button>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      // Reset and start a new draw with fresh shuffle
                      setPhase("intro");
                      setShuffledPlayers([]);
                      setFinalPairs([]);
                      seededOrderRef.current = [];
                      // Auto-start the new draw
                      setTimeout(startDraw, 100);
                    }}
                    className="btn-secondary flex-1"
                  >
                    🔄 Novo Sorteio
                  </button>
                  
                  <button
                    onClick={() => {
                      // Share functionality placeholder
                      const text = encodeURIComponent(
                        `🎾 Sorteio do ${formatTitle}!\n\n` +
                        finalPairs.slice(0, 4).map((p, i) => 
                          `${i + 1}. ${p.teamA.join(" & ")} vs ${p.teamB.join(" & ")}`
                        ).join("\n") +
                        (finalPairs.length > 4 ? `\n\n+ ${finalPairs.length - 4} partidas...` : "")
                      );
                      window.open(`https://wa.me/?text=${text}`, "_blank");
                    }}
                    className="btn-secondary flex-1"
                  >
                    📲 Compartilhar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-main">
          <button
            onClick={onCancel}
            className="w-full py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            ✕ Cancelar e voltar
          </button>
        </div>
      </div>
    </div>
  );
}