import { useEffect, useState, useMemo } from "react";
import type { TournamentConfig } from "../../types/tournament";
import { useTournamentData } from "../../hooks/useTournamentData";
import { calculateMixedDoublesRanking, calculateSuper8Ranking, calculateKingQueenRanking } from "../../utils/rankingUtils";
import { formatMatchScore } from "../../utils/scoreFormatting";
import logoUrl from "../../assets/WallBT_Full.png";

const PTS_LABELS = ["0", "15", "30", "40"];

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

  // Use players/couples from state if not provided (for standalone TV mode)
  const players = initialPlayers.length > 0 ? initialPlayers : (data?.players || []);
  const couples = initialCouples.length > 0 ? initialCouples : (data?.couples || []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isMixed = config.format === "mixeddoubles";
  
  const abbreviateName = (name?: string) => {
    if (!name) return "";
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 1) return name.toUpperCase();
    return `${parts[0].charAt(0).toUpperCase()}. ${parts[parts.length - 1].toUpperCase()}`;
  };

  const getPlayerName = (idx: number) => {
    if ((config.format === "fixeddoubles" || config.format === "drawdoubles") && couples[idx]) {
      return `${couples[idx].womanName} & ${couples[idx].manName}`;
    }
    return players[idx] || `P${idx + 1}`;
  };

  const getTeamName = (teamArray: number[]) => {
    if (isMixed) {
      const woman = abbreviateName(couples[teamArray[0]]?.womanName);
      const man = abbreviateName(couples[teamArray[1]]?.manName);
      return `${woman} / ${man}`;
    }
    const p1 = abbreviateName(getPlayerName(teamArray[0]));
    if (teamArray.length > 1) {
      const p2 = abbreviateName(getPlayerName(teamArray[1]));
      return `${p1} / ${p2}`;
    }
    return p1;
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
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col shadow-2xl overflow-hidden">
          <h2 className="text-xl font-black text-cyan-400 mb-5 flex items-center gap-3 uppercase tracking-[0.2em]">
            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#00FFFF]"></span>
            Em Andamento
          </h2>
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
                      {(() => {
                        const liveState = data.liveScores?.[m.globalId];
                        const hasFinalScore = data.matchResults?.[m.globalId]?.scoreA || data.matchResults?.[m.globalId]?.scoreB;
                        
                        const teamAName = getTeamName(m.teamA);
                        const teamBName = getTeamName(m.teamB);

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
                          // Parse final score
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

                        // Broadcast Layout component
                        const BroadcastRow = ({ name, isServing, sets, games, points, isBottom }: any) => (
                          <div className={`flex items-stretch bg-black/60 w-full ${isBottom ? 'rounded-b-xl border-t border-white/5' : 'rounded-t-xl'}`}>
                            {/* Nome e Saque */}
                            <div className="flex-1 flex items-center px-4 py-3 min-w-0">
                              <div className={`w-3 h-3 rounded-full shrink-0 mr-3 ${isServing ? 'bg-yellow-400 shadow-[0_0_8px_#facc15]' : 'bg-transparent'}`}></div>
                              <span className={`font-black uppercase tracking-tight truncate ${isLarge ? 'text-2xl' : 'text-base'} text-white`}>
                                {name}
                              </span>
                            </div>
                            
                            {/* Histórico de Sets */}
                            {sets.map((setInfo: any[], idx: number) => (
                              <div key={idx} className="w-12 border-l border-white/5 bg-white/5 flex items-center justify-center">
                                <span className={`font-black ${isLarge ? 'text-2xl' : 'text-lg'} text-white/50`}>{setInfo}</span>
                              </div>
                            ))}

                            {/* Games Atuais */}
                            {showGames && (
                              <div className="w-12 border-l border-white/5 bg-white/10 flex items-center justify-center">
                                <span className={`font-black ${isLarge ? 'text-3xl' : 'text-xl'} text-white`}>{games}</span>
                              </div>
                            )}

                            {/* Pontos Atuais */}
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
                      })()}
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
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col shadow-2xl overflow-hidden">
          <h2 className="text-xl font-black text-pink-500 mb-5 uppercase tracking-[0.2em] border-b border-pink-500/20 pb-2">Próximos Jogos</h2>
          <div className="grid grid-cols-1 gap-3 overflow-y-auto hide-scrollbar pr-2">
            {queue.map((m, idx) => (
              <div key={idx} className="bg-black/60 p-4 rounded-2xl border border-white/10 flex items-center gap-5 transition-transform">
                <div className="bg-pink-500 text-white w-14 h-14 rounded-xl flex items-center justify-center font-black text-2xl shadow-[0_0_15px_rgba(255,5,149,0.3)] shrink-0">{idx + 1}</div>
                <div className="flex-1 min-w-0 flex items-center gap-4">
                  <div className="flex-1 text-right text-xl font-black break-words text-white uppercase tracking-tight">
                    {isMixed ? `${couples[m.teamA[0]]?.womanName} / ${couples[m.teamA[1]]?.manName}` : `${getPlayerName(m.teamA[0])} / ${getPlayerName(m.teamA[1])}`}
                  </div>
                  <div className="text-[10px] text-pink-500 font-black uppercase tracking-widest italic shrink-0">VS</div>
                  <div className="flex-1 text-left text-xl font-black break-words text-white uppercase tracking-tight">
                    {isMixed ? `${couples[m.teamB[0]]?.womanName} / ${couples[m.teamB[1]]?.manName}` : `${getPlayerName(m.teamB[0])} / ${getPlayerName(m.teamB[1])}`}
                  </div>
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
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col shadow-2xl overflow-hidden">
          <h2 className="text-xl font-black text-yellow-500 mb-5 uppercase tracking-[0.2em] border-b border-yellow-500/20 pb-2">Ranking ao Vivo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 overflow-y-auto hide-scrollbar pr-2">
            {topStandings.map((st, idx) => (
              <div key={idx} className={`flex justify-between items-center p-4 rounded-2xl border-2 transition-all ${
                idx === 0 ? "bg-yellow-500/20 border-yellow-500/40 scale-[1.02]" : "bg-black/60 border-white/5"
              }`}>
                <div className="flex items-center gap-4 min-w-0">
                  <span className={`font-black w-8 text-center text-xl ${
                    idx === 0 ? "text-yellow-400" : "text-gray-600"
                  }`}>
                    {idx + 1}º
                  </span>
                  <span className={`font-black truncate text-lg uppercase tracking-tight ${idx === 0 ? "text-white" : "text-gray-200"}`}>
                    {st.name}
                  </span>
                </div>
                <div className="flex gap-4 text-sm font-black tabular-nums shrink-0">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-gray-500 uppercase">VIT</span>
                    <span className="text-cyan-400 text-lg">{st.pts || st.wins}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-gray-500 uppercase">SAL</span>
                    <span className="text-white text-lg">{st.diff > 0 ? `+${st.diff}` : st.diff}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Q4: Recent Results */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col shadow-2xl overflow-hidden">
          <h2 className="text-xl font-black text-brand-pink mb-5 uppercase tracking-[0.2em] border-b border-brand-pink/20 pb-2">Últimos Resultados</h2>
          <div className="grid grid-cols-1 gap-2.5 overflow-y-auto hide-scrollbar pr-2">
            {finishedMatches.length > 0 ? (
              finishedMatches.slice(0, 8).map((m, idx) => {
                const scoreA = data.matchResults[m.globalId]?.scoreA;
                const scoreB = data.matchResults[m.globalId]?.scoreB;
                const { text: scoreText, winner } = formatMatchScore(scoreA, scoreB);

                return (
                  <div key={idx} className="flex items-center justify-between bg-black/60 p-4 rounded-2xl border border-white/10">
                    <span className={`text-base font-black truncate flex-1 uppercase tracking-tight ${winner === "A" ? "text-yellow-400" : "text-white"}`}>
                      {winner === "A" && "👑 "}
                      {isMixed ? `${couples[m.teamA[0]]?.womanName} / ${couples[m.teamA[1]]?.manName}` : `${getPlayerName(m.teamA[0])} / ${getPlayerName(m.teamA[1])}`}
                    </span>
                    <div className="flex items-center gap-4 mx-6">
                      <span className="bg-brand-pink text-white px-4 py-1.5 rounded-xl font-black text-2xl tabular-nums shadow-[0_0_15px_rgba(255,5,149,0.4)] border border-brand-pink/50 whitespace-nowrap">
                        {scoreText}
                      </span>
                    </div>
                    <span className={`text-base font-black truncate flex-1 text-right uppercase tracking-tight ${winner === "B" ? "text-yellow-400" : "text-white"}`}>
                      {isMixed ? `${couples[m.teamB[0]]?.womanName} / ${couples[m.teamB[1]]?.manName}` : `${getPlayerName(m.teamB[0])} / ${getPlayerName(m.teamB[1])}`}
                      {winner === "B" && " 👑"}
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
    </div>
  );
}
