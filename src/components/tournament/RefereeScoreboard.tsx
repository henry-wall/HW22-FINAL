import { useState, useEffect, useRef, useCallback } from "react";
import type { DurationType, MatchSettings } from "../../types/tournament";
import MatchSettingsModal from "./MatchSettingsModal";
import { getDefaultMatchSettings } from "../../utils/matchSettingsUtils";

// ── Audio helpers ─────────────────────────────────────────────────
function playBeep(freq = 880, dur = 200, vol = 0.3) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine"; osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur / 1000);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur / 1000);
  } catch { /* silent fail on unsupported browsers */ }
}
function playWin() { playBeep(523, 150); setTimeout(() => playBeep(659, 150), 180); setTimeout(() => playBeep(784, 300), 360); }


// ── Point labels ──────────────────────────────────────────────────
const PTS_LABELS = ["0", "15", "30", "40"];

// ── Types ─────────────────────────────────────────────────────────
export interface ScoreState {
  pts: [number, number];
  games: [number, number];
  sets: [number, number];
  hist: [number, number][];     // set history
  serving: 0 | 1;
  tb: boolean;
  tbPts: [number, number];
  over: boolean;
  winner: 0 | 1 | null;
  totalGames: number;           // for game6 format
}

interface RefereeScoreboardProps {
  teamAName: string;
  teamBName: string;
  courtNumber: number;
  durationType: DurationType;
  initialSettings?: MatchSettings;
  onSubmitScore: (scoreA: number, scoreB: number) => void;
  onLiveScoreUpdate?: (state: ScoreState | null) => void;
  onExit: () => void;
}

const INITIAL_STATE: ScoreState = {
  pts: [0, 0],
  games: [0, 0],
  sets: [0, 0],
  hist: [],
  serving: 0,
  tb: false,
  tbPts: [0, 0],
  over: false,
  winner: null,
  totalGames: 0,
};

export default function RefereeScoreboard({
  teamAName,
  teamBName,
  courtNumber,
  durationType,
  initialSettings,
  onSubmitScore,
  onLiveScoreUpdate,
  onExit,
}: RefereeScoreboardProps) {
  const [settings, setSettings] = useState<MatchSettings>({ 
    ...getDefaultMatchSettings(durationType),
    ...(initialSettings || {})
  });
  const [showSettings, setShowSettings] = useState(false);

  const isSuperTie = durationType === "supertie";
  const isGame6 = durationType === "game6";

  const [s, setS] = useState<ScoreState>({ 
    ...INITIAL_STATE,
    serving: settings.firstServe
  });
  const [undoStack, setUndoStack] = useState<ScoreState[]>([]);

  // Timer
  const [secs, setSecs] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setSecs(t => t + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  // Sync serving indicator when setting changes (only if match hasn't started)
  useEffect(() => {
    setS(prev => {
      // Only sync if total points and games are 0 (match hasn't effectively started)
      const hasStarted = prev.pts[0] > 0 || prev.pts[1] > 0 || prev.games[0] > 0 || prev.games[1] > 0 || prev.hist.length > 0;
      if (!hasStarted && prev.serving !== settings.firstServe) {
        return { ...prev, serving: settings.firstServe };
      }
      return prev;
    });
  }, [settings.firstServe]);

  const onLiveScoreUpdateRef = useRef(onLiveScoreUpdate);
  useEffect(() => {
    onLiveScoreUpdateRef.current = onLiveScoreUpdate;
  }, [onLiveScoreUpdate]);

  // Sync to parent for live TV broadcast
  useEffect(() => {
    if (onLiveScoreUpdateRef.current) {
      onLiveScoreUpdateRef.current(s);
    }
  }, [s]);

  // Clean up live score on exit
  useEffect(() => {
    return () => {
      if (onLiveScoreUpdateRef.current) onLiveScoreUpdateRef.current(null);
    };
  }, []);

  // ── Scoring engine ──────────────────────────────────────────────
  const addPoint = useCallback((player: 0 | 1) => {
    if (s.over) return;

    setUndoStack(prev => {
      const next = [...prev, JSON.parse(JSON.stringify(s)) as ScoreState];
      if (next.length > 40) next.shift();
      return next;
    });

    setS(prev => {
      const nx: ScoreState = JSON.parse(JSON.stringify(prev));
      const op = (1 - player) as 0 | 1;

      const isGame6 = durationType === "game6";
      const isSuperTie = durationType === "supertie";

      // ── Game6 format: play exactly 6 games total, higher score wins ──
      if (isGame6) {
        nx.games[player]++;
        nx.totalGames++;
        nx.serving = (1 - nx.serving) as 0 | 1;

        if (nx.totalGames >= 6) {
          nx.over = true;
          nx.winner = nx.games[0] > nx.games[1] ? 0 : nx.games[1] > nx.games[0] ? 1 : null;
          if (nx.games[0] === nx.games[1]) {
            nx.over = false;
            nx.winner = null;
          }
        }
        const remaining = Math.max(0, 6 - nx.totalGames);
        if (nx.games[player] > nx.games[op] + remaining) {
          nx.over = true;
          nx.winner = player;
        }
        return nx;
      }

      // ── Super Tie-Break (direct) ──
      if (isSuperTie) {
        nx.tbPts[player]++;
        if ((nx.tbPts[0] + nx.tbPts[1]) % 2 === 1) nx.serving = (1 - nx.serving) as 0 | 1;
        if (nx.tbPts[player] >= settings.superTieTarget && nx.tbPts[player] - nx.tbPts[op] >= 2) {
          nx.over = true;
          nx.winner = player;
        }
        return nx;
      }

      // ── Tiebreak (within a set) ──
      if (nx.tb) {
        nx.tbPts[player]++;
        if ((nx.tbPts[0] + nx.tbPts[1]) % 2 === 1) nx.serving = (1 - nx.serving) as 0 | 1;
        
        const isSuperTieMode = settings.superTieLastSet && (nx.sets[0] + nx.sets[1] === (settings.bestOf === 1 ? 0 : settings.bestOf - 1));
        const target = isSuperTieMode ? settings.superTieTarget : settings.tbTarget;

        if (nx.tbPts[player] >= target && nx.tbPts[player] - nx.tbPts[op] >= 2) {
          const isSuperTieMode = settings.superTieLastSet && (nx.sets[0] + nx.sets[1] === (settings.bestOf === 1 ? 0 : settings.bestOf - 1));
          
          if (isSuperTieMode) {
            nx.games[0] = nx.tbPts[0];
            nx.games[1] = nx.tbPts[1];
          } else {
            nx.games[player]++;
          }
          
          nx.sets[player]++;
          nx.hist.push([...nx.games] as [number, number]);
          nx.games = [0, 0];
          nx.tb = false;
          nx.tbPts = [0, 0];
          nx.pts = [0, 0];
          nx.serving = op;
          const setsToWin = Math.ceil(settings.bestOf / 2);
          if (nx.sets[player] >= setsToWin) { 
            nx.over = true; 
            nx.winner = player; 
          } else if (settings.superTieLastSet && (nx.sets[0] + nx.sets[1] === settings.bestOf - 1)) {
            // Start Super Tie-break for the last set
            nx.tb = true;
            nx.tbPts = [0, 0];
          }
        }
        return nx;
      }

      // ── Normal game point ──
      const p = nx.pts;
      const a = p[player], b = p[op];
      let gameWon: 0 | 1 | null = null;

      if (settings.isNoAd) {
        // No Ad: 40-40 (3-3) → next point wins
        p[player]++;
        if (p[player] >= 4) gameWon = player;
      } else {
        if (a >= 3 && b >= 3) {
          if (a > b) gameWon = player;
          else if (a < b) { p[0] = 3; p[1] = 3; }
          else p[player] = 4;
        } else {
          p[player]++;
          if (p[player] >= 4) gameWon = player;
        }
      }

      if (gameWon !== null) {
        nx.games[gameWon]++;
        nx.pts = [0, 0];
        nx.serving = (1 - nx.serving) as 0 | 1;

        const gW = nx.games[gameWon], gL = nx.games[1 - gameWon as 0 | 1];

        if (settings.hasTieBreak && nx.games[0] === settings.tbTrigger && nx.games[1] === settings.tbTrigger) {
          nx.tb = true;
          nx.tbPts = [0, 0];
        } else if (gW >= settings.gamesPerSet && (gW - gL >= 2 || !settings.hasTieBreak)) {
          // If no tiebreak, we still need a winner. Usually, Beach Tennis without tiebreak 
          // might have a fixed limit or win by 2. We'll use win by 2 if possible, 
          // but if it's a fixed format like "Pro Set", it might end at 8. 
          // However, the user said "tiebreak at 8x8" for 8 games format.
          
          if (!settings.hasTieBreak || gW - gL >= 2) {
            nx.sets[gameWon]++;
            nx.hist.push([...nx.games] as [number, number]);
            nx.games = [0, 0];
            nx.serving = op;
            const setsToWin = Math.ceil(settings.bestOf / 2);
            if (nx.sets[gameWon] >= setsToWin) { 
              nx.over = true; 
              nx.winner = gameWon; 
            } else if (settings.superTieLastSet && (nx.sets[0] + nx.sets[1] === settings.bestOf - 1)) {
              // Start Super Tie-break for the last set
              nx.tb = true;
              nx.tbPts = [0, 0];
            }
          }
        }
      }

      return nx;
    });
  }, [s, settings, durationType]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setS(prev);
    setUndoStack(stack => stack.slice(0, -1));
  }, [undoStack]);

  // ── Labels ──────────────────────────────────────────────────────
  function ptLabel(player: 0 | 1): string {
    if (durationType === "supertie" || s.tb) return String(s.tbPts[player]);
    if (durationType === "game6") return String(s.games[player]);
    const [a, b] = s.pts;
    if (a >= 3 && b >= 3 && !settings.isNoAd) {
      if (a === b) return "40";
      return s.pts[player] > s.pts[1 - player] ? "Ad" : "40";
    }
    return PTS_LABELS[Math.min(s.pts[player], 3)];
  }

  const deuce = !s.tb && durationType !== "supertie" && durationType !== "game6" && !settings.isNoAd && s.pts[0] === 3 && s.pts[1] === 3;
  const adv = (() => {
    if (s.tb || durationType === "supertie" || durationType === "game6" || settings.isNoAd) return null;
    if (s.pts[0] > s.pts[1] && s.pts[0] >= 4) return 0;
    if (s.pts[1] > s.pts[0] && s.pts[1] >= 4) return 1;
    return null;
  })();

  const shortA = teamAName.split(" ")[0];
  const shortB = teamBName.split(" ")[0];

  const statusText = deuce ? "🔁 DEUCE"
    : adv === 0 ? `⭐ VANT. ${shortA}`
    : adv === 1 ? `⭐ VANT. ${shortB}`
    : s.tb ? "⚡ TIEBREAK"
    : durationType === "supertie" ? "⚡ SUPER TIE"
    : durationType === "game6" ? `🎾 ${s.totalGames}/6 GAMES`
    : "";

  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss2 = String(secs % 60).padStart(2, "0");

  // ── Submit ──────────────────────────────────────────────────────
  function calculateFinalScore(): [string, string] {
    if (durationType === "supertie") return [String(s.tbPts[0]), String(s.tbPts[1])];
    if (durationType === "game6") return [String(s.games[0]), String(s.games[1])];
    
    const hA = s.hist.map(sh => sh[0]);
    const hB = s.hist.map(sh => sh[1]);
    
    // If not over, or if there are ongoing games that weren't pushed to hist yet
    if (!s.over && (s.games[0] > 0 || s.games[1] > 0)) {
      hA.push(s.games[0]);
      hB.push(s.games[1]);
    }
    
    return [hA.join("/"), hB.join("/")];
  }

  function handleSubmit() {
    const [a, b] = calculateFinalScore();
    playWin();
    onSubmitScore(a as any, b as any);
  }

  function handleFinishEarly() {
    if (!s.over && !confirm("Partida não concluída. Registrar placar atual?")) return;
    handleSubmit();
  }

  // ── Victory screen ──────────────────────────────────────────────
  if (s.over && s.winner !== null) {
    const winnerName = s.winner === 0 ? teamAName : teamBName;
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 text-center text-white"
        style={{ background: "radial-gradient(ellipse at top, #1a0a2e, #050210)" }}>
        <div className="text-7xl mb-4 animate-bounce">🏆</div>
        <div className="text-xs font-black tracking-[0.2em] uppercase text-yellow-400 mb-3">
          Vencedor da Partida
        </div>
        <div className="text-2xl font-black mb-1">{winnerName}</div>
        <div className="text-sm text-white/40 mb-8">Quadra {courtNumber}</div>

        {/* Score summary */}
        <div className="bg-white/5 rounded-2xl p-4 w-full max-w-xs mb-8 border border-white/10">
          <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Placar da Partida</div>
          {s.hist.map((sh, i) => (
            <div key={i} className="flex items-center gap-4 py-2 border-t border-white/5 first:border-0">
              <span className="text-xs text-white/30 w-10">Set {i + 1}</span>
              <span className={`flex-1 text-center text-2xl font-black ${sh[0] > sh[1] ? "text-green-400" : "text-white/30"}`}>{sh[0]}</span>
              <span className="text-white/20 text-sm">×</span>
              <span className={`flex-1 text-center text-2xl font-black ${sh[1] > sh[0] ? "text-green-400" : "text-white/30"}`}>{sh[1]}</span>
            </div>
          ))}
          {(durationType === "supertie") && (
            <div className="flex items-center gap-4 py-2">
              <span className="text-xs text-white/30 w-10">TB</span>
              <span className={`flex-1 text-center text-2xl font-black ${s.tbPts[0] > s.tbPts[1] ? "text-green-400" : "text-white/30"}`}>{s.tbPts[0]}</span>
              <span className="text-white/20 text-sm">×</span>
              <span className={`flex-1 text-center text-2xl font-black ${s.tbPts[1] > s.tbPts[0] ? "text-green-400" : "text-white/30"}`}>{s.tbPts[1]}</span>
            </div>
          )}
          {durationType === "game6" && (
            <div className="flex items-center gap-4 py-2">
              <span className="text-xs text-white/30 w-10">Games</span>
              <span className={`flex-1 text-center text-2xl font-black ${s.games[0] > s.games[1] ? "text-green-400" : "text-white/30"}`}>{s.games[0]}</span>
              <span className="text-white/20 text-sm">×</span>
              <span className={`flex-1 text-center text-2xl font-black ${s.games[1] > s.games[0] ? "text-green-400" : "text-white/30"}`}>{s.games[1]}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3 w-full max-w-xs">
          <button onClick={handleSubmit}
            className="flex-[2] py-3.5 rounded-2xl font-black text-base bg-green-600 text-white border-none hover:bg-green-500 transition-colors">
            ✓ Registrar
          </button>
          <button onClick={onExit}
            className="flex-1 py-3.5 rounded-2xl font-bold text-sm bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 transition-colors">
            ← Sair
          </button>
        </div>
      </div>
    );
  }

  // ── Main scoreboard ─────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex flex-col select-none"
      style={{ background: "#08080f", color: "#fff" }}>

      {/* Top bar: timer + undo + settings */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onExit} className="text-white/30 text-sm bg-transparent border-none">← Sair</button>
          <button onClick={() => setShowSettings(true)} className="text-white/30 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xl font-black tabular-nums tracking-wide ${timerRunning ? "text-green-400" : "text-white/25"}`}>
            {mm}:{ss2}
          </span>
          <button onClick={() => setTimerRunning(r => !r)}
            className={`px-3 py-1 rounded-lg text-xs font-bold border-none ${timerRunning ? "bg-red-500/15 text-red-400" : "bg-green-500/15 text-green-400"}`}>
            {timerRunning ? "⏸ Parar" : "▶ Iniciar"}
          </button>
        </div>
        <button onClick={undo}
          className={`text-sm font-bold bg-transparent border-none ${undoStack.length > 0 ? "text-yellow-400" : "text-white/10"}`}>
          ↩ Desfazer
        </button>
      </div>

      {showSettings && (
        <MatchSettingsModal 
          settings={settings} 
          onUpdate={setSettings} 
          onClose={() => setShowSettings(false)} 
          teamAName={teamAName}
          teamBName={teamBName}
        />
      )}

      {/* Status badge */}
      {statusText && (
        <div className="text-center py-2 shrink-0">
          <span className="text-xs font-black tracking-widest text-yellow-400 bg-yellow-400/10 px-4 py-1.5 rounded-full border border-yellow-400/15">
            {statusText}
          </span>
        </div>
      )}

      {/* Scoreboard table */}
      <div className="px-3.5 py-2 shrink-0">
        <div className="rounded-2xl overflow-hidden border border-white/5" style={{ background: "#12121e" }}>
          {/* Header row */}
          <div className="flex px-4 py-1.5 border-b border-white/5">
            <div className="flex-1 text-[10px] font-bold text-white/20 uppercase tracking-wider">Equipe</div>
            {s.hist.map((_, i) => (
              <div key={i} className="w-9 text-center text-[10px] font-bold text-white/20 uppercase">S{i + 1}</div>
            ))}
            {!isSuperTie && durationType !== "game6" && (
              <div className="w-14 text-center text-[10px] font-bold text-white/20 uppercase">JOG</div>
            )}
            <div className="w-16 text-center text-[10px] font-bold text-white/20 uppercase">
              {s.tb || isSuperTie ? "TB" : durationType === "game6" ? "GAM" : "PTS"}
            </div>
          </div>

          {/* Team rows */}
          {([0, 1] as const).map(pl => {
            const name = pl === 0 ? teamAName : teamBName;
            const isServing = s.serving === pl;
            const pDisp = ptLabel(pl);

            const leading = (() => {
              if (s.tb || isSuperTie) return s.tbPts[pl] > s.tbPts[1 - pl];
              if (isGame6) return s.games[pl] > s.games[1 - pl];
              if (s.games[pl] !== s.games[1 - pl]) return s.games[pl] > s.games[1 - pl];
              if (adv !== null) return adv === pl;
              return s.pts[pl] > s.pts[1 - pl];
            })();

            const ptsColor = deuce ? "text-yellow-400"
              : adv === pl ? "text-yellow-400"
              : leading ? "text-green-400"
              : "text-white/80";

            return (
              <div key={pl}
                className={`flex items-center px-4 py-3 transition-colors duration-200 ${pl === 1 ? "border-t border-white/5" : ""} ${leading ? "bg-green-400/[0.03]" : ""}`}>
                {/* Name + serving indicator */}
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 transition-all duration-300 ${isServing ? "bg-yellow-400 shadow-[0_0_8px_#facc15]" : "bg-white/5"}`} />
                  <span className={`font-bold text-sm truncate ${leading ? "text-white" : "text-white/50"}`}>{name}</span>
                </div>
                {/* Set history */}
                {s.hist.map((sh, i) => (
                  <div key={i} className={`w-9 text-center text-xl font-black ${sh[pl] > sh[1 - pl] ? "text-green-400" : "text-white/20"}`}>
                    {sh[pl]}
                  </div>
                ))}
                {/* Current games */}
                {!isSuperTie && !isGame6 && (
                  <div className={`w-14 text-center text-2xl font-black ${leading ? "text-green-400" : "text-white/60"}`}>
                    {s.games[pl]}
                  </div>
                )}
                {/* Points / TB / Games */}
                <div className={`w-16 text-center text-3xl font-black transition-colors duration-200 ${ptsColor}`}>
                  {pDisp}
                </div>
              </div>
            );
          })}
        </div>

        {/* Serve info */}
        <div className="text-center mt-1.5 text-[11px] text-white/15">
          Quadra {courtNumber} · Saque: {s.serving === 0 ? shortA : shortB}
          {(s.tb || durationType === "supertie") && " · Troca a cada 2 pontos"}
        </div>
      </div>

      {/* Touch zones */}
      <div className="flex-1 flex flex-col gap-2 px-3.5 py-1">
        {([0, 1] as const).map(pl => {
          const color = pl === 0 ? "#FB0395" : "#00F1FD";
          const name = pl === 0 ? teamAName : teamBName;
          const pDisp = ptLabel(pl);

          return (
            <div key={pl}
              onPointerDown={(e) => { e.preventDefault(); addPoint(pl); }}
              className="flex-1 rounded-2xl flex items-center justify-between px-6 cursor-pointer transition-all duration-75 active:scale-[0.98]"
              style={{
                background: `linear-gradient(135deg, ${color}12, ${color}06)`,
                border: `2px solid ${color}20`,
                minHeight: 80,
              }}>
              <div>
                <div className="text-sm font-bold text-white/50">{name}</div>
                <div className="text-[11px] font-bold mt-1 tracking-wider" style={{ color }}>⊕ TOQUE PARA PONTO</div>
              </div>
              <div className="text-5xl font-black leading-none" style={{ color, opacity: 0.5 }}>
                {pDisp}
              </div>
            </div>
          );
        })}
      </div>

      {/* Finish button */}
      <div className="px-3.5 pb-5 pt-2 shrink-0">
        <button onClick={handleFinishEarly}
          className="w-full py-3.5 rounded-2xl font-black text-sm bg-green-500/10 text-green-400 border-2 border-green-500/20 hover:bg-green-500/20 transition-colors uppercase tracking-widest">
          ✓ Encerrar Partida e Registrar Placar
        </button>
      </div>
    </div>
  );
}
