import { useEffect, useState, useMemo } from "react";
import type { TournamentConfig } from "../../types/tournament";
import { useTournamentData } from "../../hooks/useTournamentData";
import { calculateMixedDoublesRanking, calculateSuper8Ranking, calculateKingQueenRanking } from "../../utils/rankingUtils";
import { formatMatchScore } from "../../utils/scoreFormatting";
import logoUrl from "../../assets/WallBT_Full.png";
import html2canvas from "html2canvas";

const PTS_LABELS = ["0", "15", "30", "40"];

const generateFullImage = async (
  containerId: string,
  filename: string,
  title: string
) => {
  const source = document.getElementById(containerId);
  if (!source) return;
  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "position:fixed;left:-9999px;top:0;width:540px;z-index:-1;";
  const bg = document.createElement("div");
  bg.style.cssText =
    "background:#0a0a0f;padding:32px;border-radius:24px;font-family:system-ui,sans-serif;";
  const header = document.createElement("div");
  header.style.cssText =
    "display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.1);";
  const logo = document.querySelector(
    'img[alt="Logo"]'
  ) as HTMLImageElement | null;
  if (logo) {
    const logoClone = logo.cloneNode(true) as HTMLImageElement;
    logoClone.style.cssText = "height:40px;object-fit:contain;";
    header.appendChild(logoClone);
  }
  const titleEl = document.createElement("div");
  titleEl.style.cssText = `font-size:20px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;color:${
    title.includes("Ranking") ? "#eab308" : "#ff0595"
  };`;
  titleEl.textContent = title;
  header.appendChild(titleEl);
  bg.appendChild(header);
  const content = source.cloneNode(true) as HTMLElement;
  content.removeAttribute("id");
  content.style.cssText =
    "overflow:visible !important;max-height:none !important;display:grid;gap:10px;";
  const items = content.querySelectorAll(
    '[style*="overflow"],[class*="overflow"]'
  );
  items.forEach((item) => {
    (item as HTMLElement).style.overflow = "visible";
    (item as HTMLElement).style.maxHeight = "none";
  });
  bg.appendChild(content);
  wrapper.appendChild(bg);
  document.body.appendChild(wrapper);
  await new Promise((r) => setTimeout(r, 100));
  try {
    const canvas = await html2canvas(bg, {
      backgroundColor: "#0a0a0f",
      scale: 3,
      useCORS: true,
      allowTaint: true,
      logging: false,
    });
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch {
    alert("Erro ao salvar imagem. Tente novamente.");
  } finally {
    document.body.removeChild(wrapper);
  }
};

interface PresentationModeProps {
  config: TournamentConfig;
  players?: string[];
  couples?: { manName: string; womanName: string }[];
  onClose: () => void;
  isStandalone?: boolean;
}

export default function PresentationMode({ 
  config, 
  players: initialPlayers = [], 
  couples: initialCouples = [], 
  onClose,
  isStandalone = false
}: PresentationModeProps) {
  const { data } = useTournamentData(config.id);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activePanel, setActivePanel] = useState<"none" | "live" | "next" | "ranking" | "results">("none");

  // Use players/couples from state if not provided (for standalone TV mode)
  const players = initialPlayers.length > 0 ? initialPlayers : (data?.players || []);
  const couples = initialCouples.length > 0 ? initialCouples : (data?.couples || []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isMixed = config.format === "mixeddoubles";

  const getPlayerName = (idx: number) => {
    if ((config.format === "fixeddoubles" || config.format === "drawdoubles") && couples[idx]) {
      return `${couples[idx].womanName} & ${couples[idx].manName}`;
    }
    return players[idx] || `P${idx + 1}`;
  };

  const getFullTeamName = (teamArray: number[]) => {
    if (isMixed) {
      return `${couples[teamArray[0]]?.womanName} / ${couples[teamArray[1]]?.manName}`;
    }
    if (config.format === "fixeddoubles" || config.format === "drawdoubles") {
      return getPlayerName(teamArray[0]);
    }
    if (teamArray.length > 1) {
      return `${getPlayerName(teamArray[0])} / ${getPlayerName(teamArray[1])}`;
    }
    return getPlayerName(teamArray[0]);
  };

  const LiveMatchScore = ({ m, config, data, isLarge }: any) => {
    const liveState = data.liveScores?.[m.globalId];
    const hasFinalScore = data.matchResults?.[m.globalId]?.scoreA || data.matchResults?.[m.globalId]?.scoreB;
    
    const teamAName = getFullTeamName(m.teamA);
    const teamBName = getFullTeamName(m.teamB);

    let serving = -1;
    let s = liveState;
    
    let ptsA = "0";
    let ptsB = "0";
    let gamesA = 0;
    let gamesB = 0;
    let hist: any[] = [];
    let showPoints = false;
    let showGames = config.durationType !== "supertie";

    if (liveState) {
      serving = s.serving;
      const isNoAd = config.matchSettings?.isNoAd ?? true;
      
      const getPt = (pl: 0 | 1) => {
        if (config.durationType === "supertie" || s.tb) return String(s.tbPts[pl]);
        if (config.durationType === "game6") return String(s.games[pl]);
        const a = s.pts[0], b = s.pts[1];
        if (a >= 3 && b >= 3 && !isNoAd) {
          if (a === b) return "40";
          return s.pts[pl] > s.pts[1 - pl] ? "Ad" : "40";
        }
        return PTS_LABELS[Math.min(s.pts[pl], 3)] || "0";
      };

      ptsA = getPt(0);
      ptsB = getPt(1);
      gamesA = s.games[0];
      gamesB = s.games[1];
      hist = s.hist || [];
      showPoints = s.pts[0] > 0 || s.pts[1] > 0 || s.tbPts[0] > 0 || s.tbPts[1] > 0 || s.tb;
    } else if (hasFinalScore) {
      const scoreAStr = String(data.matchResults[m.globalId].scoreA);
      const scoreBStr = String(data.matchResults[m.globalId].scoreB);
      const aSets = scoreAStr.split("/");
      const bSets = scoreBStr.split("/");
      
      aSets.forEach((val, i) => {
        hist.push([Number(val), Number(bSets[i] || 0)]);
      });
      showPoints = false;
      showGames = false;
    }

    const BroadcastRow = ({ name, isServing, sets, games, points, isBottom }: any) => (
      <div className={`flex items-stretch bg-black/60 w-full ${isBottom ? 'rounded-b-xl border-t border-white/5' : 'rounded-t-xl'}`}>
        <div className="flex-1 flex items-center px-4 py-3 min-w-0">
          <div className={`w-3 h-3 rounded-full shrink-0 mr-3 ${isServing ? 'bg-yellow-400 shadow-[0_0_8px_#facc15]' : 'bg-transparent'}`}></div>
          <span className={`font-black uppercase tracking-tight truncate ${isLarge ? 'text-2xl' : 'text-base'} text-white`}>
            {name}
          </span>
        </div>
        
        {sets.map((setInfo: any, idx: number) => (
          <div key={idx} className="w-12 border-l border-white/5 bg-white/5 flex items-center justify-center">
            <span className={`font-black ${isLarge ? 'text-2xl' : 'text-lg'} text-white/50`}>{setInfo}</span>
          </div>
        ))}

        {showGames && (
          <div className="w-12 border-l border-white/5 bg-white/10 flex items-center justify-center">
            <span className={`font-black ${isLarge ? 'text-3xl' : 'text-xl'} text-white`}>{games}</span>
          </div>
        )}

        {showPoints && (
          <div className="w-14 border-l border-white/5 bg-cyan-500 flex items-center justify-center">
            <span className={`font-black ${isLarge ? 'text-3xl' : 'text-xl'} text-black ${points === 'Ad' ? 'text-xl' : ''}`}>
              {points}
            </span>
          </div>
        )}
      </div>
    );

    return (
      <div className="flex flex-col shadow-2xl rounded-xl overflow-hidden border border-white/10 mx-2">
        <BroadcastRow 
          name={teamAName} 
          isServing={serving === 0} 
          sets={hist.map(h => h[0])} 
          games={gamesA} 
          points={ptsA} 
          isBottom={false} 
        />
        <BroadcastRow 
          name={teamBName} 
          isServing={serving === 1} 
          sets={hist.map(h => h[1])} 
          games={gamesB} 
          points={ptsB} 
          isBottom={true} 
        />
      </div>
    );
  };

  const topStandings = useMemo(() => {
    if (!data) return [];
    let ranking: any[] = [];
    if (config.format === "mixeddoubles") ranking = calculateMixedDoublesRanking(config, data, couples);
    else if (config.format === "super8") ranking = calculateSuper8Ranking(config, data, players);
    else if (config.format === "kingqueen") ranking = calculateKingQueenRanking(config, data, players);
    else if (config.format === "fixeddoubles" || config.format === "drawdoubles") ranking = calculateMixedDoublesRanking(config, data, couples);
    
    return ranking.slice(0, 10); // Show top 10 on TV
  }, [data, config, players, couples]);

  const finishedMatches = useMemo(() => {
    if (!data?.completedMatches) return [];
    return [...data.completedMatches].reverse().slice(0, 10);
  }, [data?.completedMatches]);

  // Full data for image generation (no slice limits)
  const allStandings = useMemo(() => {
    if (!data) return [];
    let ranking: any[] = [];
    if (config.format === "mixeddoubles") ranking = calculateMixedDoublesRanking(config, data, couples);
    else if (config.format === "super8") ranking = calculateSuper8Ranking(config, data, players);
    else if (config.format === "kingqueen") ranking = calculateKingQueenRanking(config, data, players);
    else if (config.format === "fixeddoubles" || config.format === "drawdoubles") ranking = calculateMixedDoublesRanking(config, data, couples);
    return ranking; // All standings, no slice
  }, [data, config, players, couples]);

  const allFinishedMatches = useMemo(() => {
    if (!data?.completedMatches) return [];
    return [...data.completedMatches].reverse(); // All matches, no slice
  }, [data?.completedMatches]);

  const queue = (data.matchQueue || []).slice(0, 4);
  const isFinished = data.completedMatches?.length > 0 && data.matchQueue?.length === 0 && Object.keys(data.inProgressMatches || {}).length === 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white overflow-hidden" style={{ backgroundImage: "radial-gradient(circle at top, #2a0845 0%, #080810 80%)" }}>
      {/* TV Header */}
      <div className="flex justify-between items-center px-8 py-6 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <img src={logoUrl} alt="Logo Wall BT" className="h-16 object-contain" />
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-400">
              {config.name}
            </h1>
            <div className="text-gray-400 text-sm font-semibold tracking-widest uppercase">
              Ao Vivo • {
                config.format === "super8" ? "Super 8" : 
                config.format === "mixeddoubles" ? "Troca de Casais" : 
                config.format === "fixeddoubles" ? "Duplas Fixas" :
                config.format === "drawdoubles" ? "Duplas Sorteadas" :
                "King & Queen"
              }
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-2xl font-bold font-mono">{currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
            <div className="text-pink-500 text-xs font-bold uppercase tracking-widest">Hora Local</div>
          </div>
          {!isStandalone && (
            <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors">
              ✖
            </button>
          )}
        </div>
      </div>

      {/* TV Content Grid */}
      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-4 p-4 overflow-hidden">
        
        {/* Q1: Live Courts */}
        <div onClick={() => setActivePanel("live")} className="cursor-pointer bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col shadow-2xl overflow-hidden transition hover:border-cyan-400/40">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-black text-cyan-400 flex items-center gap-3 uppercase tracking-[0.2em]">
              <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#00FFFF]"></span>
              Em Andamento
            </h2>
            
          </div>
          <div className={`grid ${
            config.numCourts === 1 ? 'grid-cols-1' : 
            config.numCourts === 2 ? 'grid-cols-1 md:grid-cols-2' : 
            'grid-cols-2 lg:grid-cols-3'
          } gap-4 flex-1 overflow-y-auto hide-scrollbar`}>
            {Array.from({ length: config.numCourts }, (_, i) => i + 1).map(c => {
              const m = data.inProgressMatches?.[c];
              const isLarge = config.numCourts <= 2;
              
              return (
                <div key={c} className={`bg-black/40 border border-white/10 rounded-2xl flex flex-col relative overflow-hidden ${isLarge ? 'p-6' : 'p-4'}`}>
                  <div className="absolute top-0 left-0 w-2 h-full bg-cyan-400"></div>
                  <div className="flex justify-between items-center mb-4">
                    <span className={`${isLarge ? 'text-2xl' : 'text-lg'} font-black text-cyan-400 uppercase tracking-widest`}>Quadra {c}</span>
                    {m && <span className="text-[10px] font-bold text-cyan-400 bg-cyan-400/20 px-2 py-1 rounded border border-cyan-400/40 animate-pulse">AO VIVO</span>}
                  </div>
                  
                  {m ? (
                    <div className="flex-1 flex flex-col justify-center">
                      <LiveMatchScore m={m} config={config} data={data} isLarge={isLarge} />
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-10">
                      <div className="text-6xl mb-2">🎾</div>
                      <div className="font-black text-3xl tracking-[0.3em] uppercase">Livre</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Q2: Next Games */}
        <div onClick={() => setActivePanel("next")} className="cursor-pointer bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col shadow-2xl overflow-hidden transition hover:border-pink-400/40">
          <div className="flex items-center justify-between mb-5 border-b border-pink-500/20 pb-2">
            <h2 className="text-xl font-black text-pink-500 uppercase tracking-[0.2em]">Próximos Jogos</h2>
            
          </div>
          <div className="grid grid-cols-1 gap-3 overflow-y-auto hide-scrollbar pr-2">
            {queue.map((m, idx) => (
              <div key={idx} className="bg-black/60 p-4 rounded-2xl border border-white/10 flex items-center gap-5">
                <div className="bg-pink-500 text-white w-14 h-14 rounded-xl flex items-center justify-center font-black text-2xl shadow-[0_0_15px_rgba(255,5,149,0.3)] shrink-0">{idx + 1}</div>
                <div className="flex-1 min-w-0 flex items-center gap-4">
                  <div className="flex-1 text-right text-xl font-black break-words text-white uppercase tracking-tight">{getFullTeamName(m.teamA)}</div>
                  <div className="text-[10px] text-pink-500 font-black uppercase tracking-widest italic shrink-0">VS</div>
                  <div className="flex-1 text-left text-xl font-black break-words text-white uppercase tracking-tight">{getFullTeamName(m.teamB)}</div>
                </div>
              </div>
            ))}
            {queue.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-600 italic">
                <div className="text-4xl mb-2">⌛</div>
                <div className="font-bold text-lg uppercase tracking-widest">Fim da Fila</div>
              </div>
            )}
          </div>
        </div>

        {/* Q3: Ranking */}
        <div onClick={() => setActivePanel("ranking")} className="cursor-pointer bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col shadow-2xl overflow-hidden transition hover:border-yellow-400/40">
          <div className="flex items-center justify-between mb-5 border-b border-yellow-500/20 pb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-yellow-500 uppercase tracking-[0.2em]">Ranking ao Vivo</h2>
              <div className="relative group">
                <button className="text-gray-500 hover:text-yellow-400 transition text-sm">ℹ️</button>
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50">
                  <div className="bg-gray-900 border border-yellow-500/40 rounded-xl p-3 text-xs text-gray-300 shadow-2xl whitespace-nowrap">
                    <div className="font-black text-yellow-400 mb-2">Critérios de Desempate:</div>
                    <div className="space-y-1">
                      <div>1. Vitórias</div>
                      <div>2. Saldo de Games</div>
                      <div>3. Games Pró</div>
                      <div>4. Confronto Direto</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); generateFullImage("ranking-full-content", "ranking-ao-vivo.png", "Ranking ao Vivo"); }}
              className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-400 text-xs font-bold rounded-lg transition"
            >
              📷 Baixar
            </button>
          </div>
          <div id="ranking-panel" className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 overflow-y-auto hide-scrollbar pr-2">
            {topStandings.map((st, idx) => (
              <div key={idx} className={`flex justify-between items-center p-4 rounded-2xl border-2 transition-all ${
                idx === 0 ? "bg-yellow-500/20 border-yellow-500/40 scale-[1.02]" : idx === 1 ? "bg-gray-400/10 border-gray-400/30" : idx === 2 ? "bg-amber-600/10 border-amber-600/30" : "bg-black/60 border-white/5"
              }`}>
                <div className="flex items-center gap-4 min-w-0">
                  <span className={`font-black w-8 text-center text-xl ${
                    idx === 0 ? "text-yellow-400" : idx === 1 ? "text-gray-300" : idx === 2 ? "text-amber-500" : "text-gray-600"
                  }`}>
                    {idx + 1}º
                  </span>
                  <span className={`font-black truncate text-lg uppercase tracking-tight ${idx === 0 ? "text-white" : idx === 1 ? "text-gray-200" : idx === 2 ? "text-amber-100" : "text-gray-200"}`}>
                    {st.name}
                  </span>
                </div>
                <div className="flex gap-3 text-sm font-black tabular-nums shrink-0">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-gray-500 uppercase">VIT</span>
                    <span className="text-cyan-400 text-lg">{st.pts || st.wins}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-gray-500 uppercase">GP</span>
                    <span className="text-green-400 text-lg">{st.games}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-gray-500 uppercase">SG</span>
                    <span className="text-white text-lg">{st.diff > 0 ? `+${st.diff}` : st.diff}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Q4: Recent Results */}
        <div onClick={() => setActivePanel("results")} className="cursor-pointer bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col shadow-2xl overflow-hidden transition hover:border-pink-400/40">
          <div className="flex justify-between items-center mb-5 border-b border-brand-pink/20 pb-2">
            <h2 className="text-xl font-black text-brand-pink uppercase tracking-[0.2em]">Últimos Resultados</h2>
            <button onClick={(e) => { e.stopPropagation(); generateFullImage("results-full-content", "ultimos-resultados.png", "Últimos Resultados"); }} className="px-3 py-1.5 bg-pink-500/20 hover:bg-pink-500/40 text-brand-pink text-xs font-bold rounded-lg transition">📷 Baixar</button>
          </div>
          <div id="results-panel" className="grid grid-cols-1 gap-2.5 overflow-y-auto hide-scrollbar pr-2">
            {finishedMatches.length > 0 ? (
              finishedMatches.slice(0, 8).map((m, idx) => {
                const scoreA = data.matchResults[m.globalId]?.scoreA;
                const scoreB = data.matchResults[m.globalId]?.scoreB;
                const { text: scoreText, winner } = formatMatchScore(scoreA, scoreB);

                return (
                  <div key={idx} className="flex items-center justify-between bg-black/60 p-5 rounded-3xl border border-white/10">
                    <span className={`text-base font-black truncate flex-1 uppercase tracking-tight ${winner === "A" ? "text-yellow-400" : "text-white"}`}>
                      
                      {getFullTeamName(m.teamA)}
                    </span>
                    <div className="flex items-center gap-4 mx-6">
                      <span className="bg-brand-pink text-white px-4 py-1.5 rounded-xl font-black text-2xl tabular-nums shadow-[0_0_15px_rgba(255,5,149,0.4)] border border-brand-pink/50 whitespace-nowrap">
                        {scoreText}
                      </span>
                    </div>
                    <span className={`text-base font-black truncate flex-1 text-right uppercase tracking-tight ${winner === "B" ? "text-yellow-400" : "text-white"}`}>
                      {getFullTeamName(m.teamB)}
                      
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-600 font-bold italic">
                Aguardando conclusão das partidas...
              </div>
            )}
          </div>
        </div>

      </div>

      {activePanel !== "none" && (
        <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="w-full max-w-lg sm:max-w-2xl md:max-w-4xl lg:max-w-6xl bg-[#0b1220] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <img src={logoUrl} alt="Logo" className="h-14 object-contain" />
              <button type="button" onClick={() => setActivePanel("none")} className="text-sm font-bold uppercase tracking-[0.25em] text-white/80 hover:text-white">
                ✖ Fechar
              </button>
            </div>
            <div className="max-h-[85vh] overflow-y-auto p-3 sm:p-4 md:p-6 space-y-3">
              {activePanel === "live" && (
                <div className="space-y-4">
                  {Array.from({ length: config.numCourts }, (_, i) => i + 1).map((c) => {
                    const m = data.inProgressMatches?.[c];
                    return (
                      <div key={c} className="rounded-3xl border border-white/10 bg-black/60 p-5">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-base font-black uppercase tracking-[0.2em] text-cyan-300">Quadra {c}</span>
                          {m ? <span className="text-xs uppercase tracking-[0.3em] bg-cyan-400/10 text-cyan-300 px-3 py-1 rounded-full">AO VIVO</span> : <span className="text-xs uppercase tracking-[0.3em] text-white/40">Livre</span>}
                        </div>
                        {m ? (
                          <div className="space-y-3">
                            <LiveMatchScore m={m} config={config} data={data} isLarge={false} />
                          </div>
                        ) : (
                          <div className="text-sm text-white/50">Nenhuma partida em andamento nesta quadra.</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {activePanel === "next" && (
                <div className="grid grid-cols-1 gap-3">
                  {queue.length > 0 ? queue.map((m, idx) => (
                    <div key={idx} className="bg-black/60 p-5 rounded-2xl border border-white/10 flex items-center gap-5">
                      <div className="bg-pink-500 text-white w-14 h-14 rounded-xl flex items-center justify-center font-black text-2xl shadow-[0_0_15px_rgba(255,5,149,0.3)] shrink-0">{idx + 1}</div>
                      <div className="flex-1 min-w-0 flex items-center gap-4">
                        <div className="flex-1 text-right text-xl font-black break-words text-white uppercase tracking-tight">{getFullTeamName(m.teamA)}</div>
                        <div className="text-[10px] text-pink-500 font-black uppercase tracking-widest italic shrink-0">VS</div>
                        <div className="flex-1 text-left text-xl font-black break-words text-white uppercase tracking-tight">{getFullTeamName(m.teamB)}</div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-white/50">Nenhuma partida agendada.</div>
                  )}
                </div>
              )}

              {activePanel === "ranking" && (
                <div>
                  <div className="flex justify-between items-center mb-4 border-b border-yellow-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="text-xl font-black text-yellow-500 uppercase">Ranking ao Vivo</div>
                      <div className="relative group">
                        <button className="text-gray-500 hover:text-yellow-400 transition text-sm">ℹ️</button>
                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50">
                          <div className="bg-gray-900 border border-yellow-500/40 rounded-xl p-3 text-xs text-gray-300 shadow-2xl whitespace-nowrap">
                            <div className="font-black text-yellow-400 mb-2">Critérios de Desempate:</div>
                            <div className="space-y-1">
                              <div>1. Vitórias</div>
                              <div>2. Saldo de Games</div>
                              <div>3. Games Pró</div>
                              <div>4. Confronto Direto</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => generateFullImage("ranking-full-content", "classificacao-final.png", "Ranking ao Vivo")}
                      className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-400 text-sm font-bold rounded-xl transition"
                    >
                      📷 Baixar
                    </button>
                  </div>
                  <div id="ranking-full-panel" className="grid gap-3">
                    {topStandings.length > 0 ? topStandings.map((st, idx) => (
                      <div key={idx} className={`rounded-2xl border p-3 sm:p-4 ${idx === 0 ? 'border-yellow-400/50 bg-yellow-500/15' : idx === 1 ? 'border-gray-400/40 bg-gray-400/10' : idx === 2 ? 'border-amber-600/40 bg-amber-600/10' : 'border-white/10 bg-black/60'}`}>
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className={`text-xs uppercase tracking-[0.35em] ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-500' : 'text-white/50'}`}>{idx + 1}º</div>
                            <div className={`text-base sm:text-lg font-black uppercase mt-1 ${idx === 0 ? 'text-yellow-300' : idx === 1 ? 'text-gray-200' : idx === 2 ? 'text-amber-400' : 'text-white'}`}>{st.name}</div>
                          </div>
                          <div className="flex gap-3 sm:gap-6 items-center">
                            <div className="text-right">
                              <div className="text-xs uppercase text-white/50">VIT</div>
                              <div className="text-base sm:text-lg font-black text-cyan-300">{st.pts || st.wins}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs uppercase text-white/50">GP</div>
                              <div className="text-base sm:text-lg font-black text-green-400">{st.games}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs uppercase text-white/50">SG</div>
                              <div className="text-base sm:text-lg font-black text-white">{st.diff > 0 ? `+${st.diff}` : st.diff}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    )) : (
                      <div className="text-white/50">Ranking ainda não disponível.</div>
                    )}
                  </div>
                </div>
              )}

{activePanel === "results" && (
                <div>
                  <div className="flex justify-between items-center mb-4 border-b border-brand-pink/20 pb-2">
                    <div className="text-xl font-black text-brand-pink">Últimos Resultados</div>
                    <button
                      onClick={() => generateFullImage("results-full-content", "resultados-partidas.png", "Últimos Resultados")}
                      className="px-4 py-2 bg-pink-500/20 hover:bg-pink-500/40 text-brand-pink text-sm font-bold rounded-xl transition"
                    >
                      📷 Baixar
                    </button>
                  </div>
                  <div id="results-full-panel" className="space-y-3">
                    {finishedMatches.length > 0 ? finishedMatches.slice(0, 8).map((m, idx) => {
                      const scoreA = data.matchResults[m.globalId]?.scoreA;
                      const scoreB = data.matchResults[m.globalId]?.scoreB;
                      const { text: scoreText, winner } = formatMatchScore(scoreA, scoreB);
                      return (
                        <div key={idx} className="flex items-center justify-between bg-black/60 p-5 rounded-3xl border border-white/10">
                          <span className={`text-base font-black truncate flex-1 uppercase tracking-tight ${winner === "A" ? "text-yellow-400" : "text-white"}`}>
                            {getFullTeamName(m.teamA)}
                          </span>
                          <div className="flex items-center gap-4 mx-6">
                            <span className="bg-brand-pink text-white px-4 py-1.5 rounded-xl font-black text-2xl tabular-nums shadow-[0_0_15px_rgba(255,5,149,0.4)] border border-brand-pink/50 whitespace-nowrap">
                              {scoreText}
                            </span>
                          </div>
                          <span className={`text-base font-black truncate flex-1 text-right uppercase tracking-tight ${winner === "B" ? "text-yellow-400" : "text-white"}`}>
                            {getFullTeamName(m.teamB)}
                          </span>
                        </div>
                      );
                    }) : (
                      <div className="text-white/50">Nenhum resultado registrado ainda.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Winners Overlay (if finished) */}
      {isFinished && topStandings.length > 0 && (
        <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center text-center p-8 animate-fade-in">
          <div className="text-8xl mb-8 animate-bounce">🏆</div>
          <h2 className="text-6xl font-black text-yellow-400 mb-4 uppercase tracking-tighter shadow-yellow-500/20">CAMPEÕES</h2>
          <div className="w-32 h-1.5 bg-yellow-500 mb-10"></div>
          
          <div className="flex gap-12 items-end">
             {/* 2nd Place */}
             {topStandings[1] && (
               <div className="flex flex-col items-center gap-3 pb-8 opacity-60">
                 <div className="text-4xl">🥈</div>
                 <div className="text-xl font-bold text-slate-300 uppercase">{topStandings[1].name}</div>
                 <div className="h-24 w-40 bg-slate-400/20 rounded-t-xl border-x border-t border-slate-400/30"></div>
               </div>
             )}

             {/* 1st Place */}
             <div className="flex flex-col items-center gap-4">
               <div className="text-6xl">🥇</div>
               <div className="text-4xl font-black text-white uppercase bg-yellow-500/20 px-10 py-4 rounded-2xl border border-yellow-500/50 shadow-2xl">
                 {topStandings[0].name}
               </div>
               <div className="h-40 w-56 bg-yellow-500/20 rounded-t-2xl border-x border-t border-yellow-500/40"></div>
             </div>

             {/* 3rd Place */}
             {topStandings[2] && (
               <div className="flex flex-col items-center gap-3 pb-4 opacity-50">
                 <div className="text-3xl">🥉</div>
                 <div className="text-lg font-bold text-orange-300 uppercase">{topStandings[2].name}</div>
                 <div className="h-16 w-40 bg-orange-400/20 rounded-t-xl border-x border-t border-orange-400/30"></div>
               </div>
             )}
          </div>

          <button onClick={onClose} className="mt-16 px-8 py-3 bg-white/10 hover:bg-white/20 rounded-full font-bold text-sm transition-all border border-white/20 uppercase tracking-widest">
            Voltar ao Torneio
          </button>
        </div>
      )}

      {/* Hidden elements for full image generation */}
      <div id="ranking-full-content" style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -1 }}>
        <div style={{ display: "grid", gap: "10px" }}>
          {allStandings.length > 0 ? allStandings.map((st, idx) => (
            <div key={idx} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              borderRadius: "12px",
              border: idx === 0 ? "2px solid rgba(234,179,8,0.5)" : idx === 1 ? "2px solid rgba(156,163,175,0.4)" : idx === 2 ? "2px solid rgba(217,119,6,0.4)" : "1px solid rgba(255,255,255,0.1)",
              background: idx === 0 ? "rgba(234,179,8,0.15)" : idx === 1 ? "rgba(156,163,175,0.1)" : idx === 2 ? "rgba(217,119,6,0.1)" : "rgba(0,0,0,0.6)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{
                  fontWeight: 900,
                  fontSize: "18px",
                  width: "32px",
                  textAlign: "center",
                  color: idx === 0 ? "#eab308" : idx === 1 ? "#9ca3af" : idx === 2 ? "#d97706" : "#6b7280",
                }}>
                  {idx + 1}º
                </span>
                <span style={{
                  fontWeight: 900,
                  fontSize: "16px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: idx === 0 ? "#fff" : idx === 1 ? "#e5e7eb" : idx === 2 ? "#fbbf24" : "#e5e7eb",
                }}>
                  {st.name}
                </span>
              </div>
              <div style={{ display: "flex", gap: "16px", fontSize: "14px", fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "10px", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>VIT</div>
                  <div style={{ color: "#22d3ee", fontSize: "16px" }}>{st.pts || st.wins}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "10px", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>GP</div>
                  <div style={{ color: "#4ade80", fontSize: "16px" }}>{st.games}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "10px", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>SG</div>
                  <div style={{ color: "#fff", fontSize: "16px" }}>{st.diff > 0 ? `+${st.diff}` : st.diff}</div>
                </div>
              </div>
            </div>
          )) : (
            <div style={{ color: "rgba(255,255,255,0.5)" }}>Ranking ainda não disponível.</div>
          )}
        </div>
      </div>

      <div id="results-full-content" style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -1 }}>
        <div style={{ display: "grid", gap: "10px" }}>
          {allFinishedMatches.length > 0 ? allFinishedMatches.map((m, idx) => {
            const scoreA = data.matchResults[m.globalId]?.scoreA;
            const scoreB = data.matchResults[m.globalId]?.scoreB;
            const { text: scoreText, winner } = formatMatchScore(scoreA, scoreB);
            return (
              <div key={idx} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderRadius: "16px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(0,0,0,0.6)",
              }}>
                <span style={{
                  fontWeight: 900,
                  fontSize: "14px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: winner === "A" ? "#facc15" : "#fff",
                }}>
                  {getFullTeamName(m.teamA)}
                </span>
                <div style={{
                  margin: "0 16px",
                  background: "rgba(255,5,149,0.2)",
                  color: "#fff",
                  padding: "4px 12px",
                  borderRadius: "8px",
                  fontWeight: 900,
                  fontSize: "16px",
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                  border: "1px solid rgba(255,5,149,0.5)",
                }}>
                  {scoreText}
                </div>
                <span style={{
                  fontWeight: 900,
                  fontSize: "14px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  flex: 1,
                  textAlign: "right",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: winner === "B" ? "#facc15" : "#fff",
                }}>
                  {getFullTeamName(m.teamB)}
                </span>
              </div>
            );
          }) : (
            <div style={{ color: "rgba(255,255,255,0.5)" }}>Nenhum resultado registrado ainda.</div>
          )}
        </div>
      </div>
    </div>
  );
}
