import type { DurationType, MatchSettings, TournamentFormat, TournamentGroupFormat, PlayoffFormat, DrawMode } from "../../types/tournament";
import { getGamesPerSetFromDurationType } from "../../utils/matchSettingsUtils";

interface Step4SettingsProps {
  format: TournamentFormat;
  numPlayers: number;
  numCourts: number;
  durationType: DurationType;
  groupFormat: TournamentGroupFormat;
  playoffFormat: PlayoffFormat;
  tournamentName: string;
  matchSettings: MatchSettings;
  useDraw: boolean;
  drawMode: DrawMode;
  drawSeeded: boolean;
  onChangeNum: (n: number) => void;
  onChangeCourts: (n: number) => void;
  onChangeDuration: (d: DurationType) => void;
  onChangeGroup: (g: TournamentGroupFormat) => void;
  onChangePlayoff: (p: PlayoffFormat) => void;
  onChangeName: (name: string) => void;
  onChangeMatchSettings: (s: MatchSettings) => void;
  onToggleDraw: () => void;
  onChangeDrawMode: (mode: DrawMode) => void;
  onToggleSeeded: () => void;
  onNext: () => void;
  onBack: () => void;
}


function calcPreview(numPlayers: number, numCourts: number, durationType: DurationType, format: TournamentFormat) {
  const courts = Math.max(1, numCourts);
  let rounds = 0;
  let matchesPerRound = 0;

  if (format === "super8") {
    rounds = numPlayers % 2 === 0 ? numPlayers - 1 : numPlayers;
    matchesPerRound = Math.floor(numPlayers / 4);
  } else if (format === "mixeddoubles" || format === "fixeddoubles" || format === "drawdoubles") {
    // numPlayers is couples/pairs
    rounds = numPlayers % 2 === 0 ? numPlayers - 1 : numPlayers;
    matchesPerRound = Math.floor(numPlayers / 2);
  } else if (format === "kingqueen") {
    // King & Queen has 3 rounds in groups + 3 rounds in series
    rounds = 6;
    matchesPerRound = Math.floor(numPlayers / 4);
  }

  const totalMatches = rounds * matchesPerRound;
  // Updated times: set6→25min, shortset→18min, game6(7 games)→17min, supertie→10min
  const minutesPerMatch = durationType === "set6" ? 25 : durationType === "shortset" ? 18 : durationType === "game6" ? 17 : 10;
  const totalMinutes = Math.ceil(totalMatches / courts) * minutesPerMatch;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const byes = (format === "super8" || format === "kingqueen") ? numPlayers % 4 : numPlayers % 2;
  
  return { rounds, totalMatches, hours, mins, byes };
}

const durations: { id: DurationType; label: string; minutes: number; isNew?: boolean; description?: string }[] = [
  { id: "set6", label: "Set (6 games)", minutes: 25 },
  { id: "shortset", label: "Short Set (4 games)", minutes: 18 },
  { id: "supertie", label: "Super Tie", minutes: 10, description: "Tie-break até 10 pontos." },
  { id: "game6", label: "Até 7 games", minutes: 17, isNew: true, description: "São jogados 7 games no total." },
];

export default function Step4Settings({
  format, numPlayers, numCourts, durationType, groupFormat, playoffFormat, tournamentName, matchSettings, useDraw, drawMode, drawSeeded,
  onChangeNum, onChangeCourts, onChangeDuration, onChangeGroup, onChangePlayoff, onChangeName, onChangeMatchSettings,
  onToggleDraw, onChangeDrawMode, onToggleSeeded, onNext, onBack,
}: Step4SettingsProps) {
  const isMixed = format === "mixeddoubles";
  const minPlayers = isMixed ? 4 : 4;
  const maxPlayers = 16;
  const playerOptions = Array.from({ length: maxPlayers - minPlayers + 1 }, (_, i) => i + minPlayers);
  const courtOptions = [1, 2, 3, 4, 5, 6];
  const preview = calcPreview(numPlayers, numCourts, durationType, format);

  return (
    <div className="animate-slide-up">
      <h2 className="text-2xl font-bold text-text-primary mb-2">Configurações</h2>
      <p className="text-text-secondary text-sm mb-5">Defina os detalhes do torneio</p>

      {/* Nome */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-text-secondary mb-2">Nome do Torneio</label>
        <input
          className="input-dark"
          placeholder="Ex: Wall BT — Super 8 Aberto"
          value={tournamentName}
          onChange={e => onChangeName(e.target.value)}
        />
      </div>

      {/* Número de jogadores/casais */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-text-secondary mb-3">
          {isMixed ? "Número de Casais" : "Número de Jogadores"}
        </label>
        <div className="flex flex-wrap gap-2">
          {playerOptions.map(n => (
            <button
              key={n}
              onClick={() => onChangeNum(n)}
              className={`number-chip ${numPlayers === n ? "selected" : ""}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Número de quadras */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-text-secondary mb-3">Número de Quadras</label>
        <div className="flex gap-2">
          {courtOptions.map(n => (
            <button
              key={n}
              onClick={() => onChangeCourts(n)}
              className={`number-chip ${numCourts === n ? "selected" : ""}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Formato das partidas */}
      <div className="mb-6">
        <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3">Formato das Partidas</label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {durations.map(d => (
            <button
              key={d.id}
              onClick={() => {
                onChangeDuration(d.id);
                // Auto-update matchSettings when format changes
                const newSettings = { ...matchSettings };
                newSettings.gamesPerSet = getGamesPerSetFromDurationType(d.id);
                if (d.id === "supertie" || d.id === "game6") {
                  newSettings.bestOf = 1;
                }
                onChangeMatchSettings(newSettings);
              }}
              className={`p-3 rounded-xl text-left border-2 transition-all ${
                durationType === d.id 
                  ? "border-brand-pink bg-brand-pink/5 text-brand-pink" 
                  : "border-border-main bg-bg-surface text-text-secondary hover:border-brand-pink/30"
              }`}
            >
              <div className="font-bold text-sm mb-0.5">{d.label}</div>
              <div className="text-[10px] opacity-70">~{d.minutes} min</div>
            </button>
          ))}
        </div>

        {/* ━━━━ PAINEL CONDICIONAL DE DETALHES ━━━━ */}
        <div className="p-4 rounded-2xl bg-surface border border-border-main space-y-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-xs">⚙️</span>
            <span className="text-[10px] font-black text-muted uppercase tracking-widest">Detalhes</span>
          </div>

          {/* Mostrar "Número de Sets" apenas para set6 e shortset */}
          {(durationType === "set6" || durationType === "shortset") && (
            <div className="animate-fade-in space-y-2">
              <label className="text-[10px] font-bold text-muted uppercase block">Número de Sets</label>
              <div className="flex gap-1.5">
                {[1, 3, 5].map(v => (
                  <button
                    key={v}
                    onClick={() => {
                      const ns = { ...matchSettings, bestOf: v as any };
                      ns.superTieLastSet = v > 1;
                      onChangeMatchSettings(ns);
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${
                      matchSettings.bestOf === v 
                        ? 'bg-brand-pink text-white' 
                        : 'bg-bg-page text-muted border border-border-main'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-text-muted mt-1">Games por set: <strong>{getGamesPerSetFromDurationType(durationType)}</strong> (definido automaticamente)</p>
            </div>
          )}

          {/* Info para Super Tie e Até 7 Games */}
          {(durationType === "supertie" || durationType === "game6") && (
            <div className="p-3 rounded-lg bg-brand-cyan/10 border border-brand-cyan/20 animate-fade-in">
              <p className="text-[9px] text-brand-cyan font-bold uppercase tracking-wider">
                ℹ️ <span className="font-bold text-brand-cyan">{durations.find(d => d.id === durationType)?.description}</span>
              </p>
            </div>
          )}

          {/* Mostrar info de Games For All Formats */}
          <div className="p-3 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
            <p className="text-[9px] text-yellow-400 font-bold uppercase">🎾 Games por set: <span className="text-yellow-300">{getGamesPerSetFromDurationType(durationType)}</span></p>
          </div>

          {/* Toggle Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button 
              onClick={() => onChangeMatchSettings({ ...matchSettings, isNoAd: !matchSettings.isNoAd })}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                matchSettings.isNoAd 
                  ? 'bg-brand-cyan/10 border-brand-cyan text-brand-cyan' 
                  : 'bg-bg-page border-border-main text-muted'
              }`}
            >
              <span className="text-[10px] font-black uppercase">Modo No-Ad</span>
              <span className="text-[10px]">{matchSettings.isNoAd ? 'ON' : 'OFF'}</span>
            </button>
            <button 
              onClick={() => onChangeMatchSettings({ ...matchSettings, hasTieBreak: !matchSettings.hasTieBreak })}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                matchSettings.hasTieBreak 
                  ? 'bg-brand-cyan/10 border-brand-cyan text-brand-cyan' 
                  : 'bg-bg-page border-border-main text-muted'
              }`}
            >
              <span className="text-[10px] font-black uppercase">Tie-break</span>
              <span className="text-[10px]">{matchSettings.hasTieBreak ? 'ON' : 'OFF'}</span>
            </button>
          </div>
          
          {matchSettings.bestOf > 1 && (
            <button 
              onClick={() => onChangeMatchSettings({ ...matchSettings, superTieLastSet: !matchSettings.superTieLastSet })}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                matchSettings.superTieLastSet 
                  ? 'bg-brand-pink/10 border-brand-pink text-brand-pink' 
                  : 'bg-bg-page border-border-main text-muted'
              }`}
            >
              <span className="text-[10px] font-black uppercase">Super Tie no último set (10 pts)</span>
              <span className="text-[10px]">{matchSettings.superTieLastSet ? 'SIM' : 'NÃO'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-border-main bg-surface p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2">🎲 Sorteio inicial</p>
            <p className="text-sm font-semibold text-text-primary">Sortear a ordem inicial dos participantes antes de gerar o torneio</p>
            <p className="text-xs text-text-secondary mt-1">Útil para deixar o início mais transparente em Super 8, King & Queen e demais formatos.</p>
          </div>
          <button
            type="button"
            onClick={onToggleDraw}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${useDraw ? "bg-brand-pink" : "bg-border-main"}`}
          >
            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${useDraw ? "translate-x-7" : "translate-x-1"}`} />
          </button>
        </div>

        {useDraw && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                { id: "full", label: "Completo" },
                { id: "entry", label: "Só ordem" },
                { id: "groups", label: "Só grupos" },
              ].map(option => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onChangeDrawMode(option.id as DrawMode)}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${drawMode === option.id ? "border-brand-pink bg-brand-pink/10 text-brand-pink" : "border-border-main bg-bg-page text-text-secondary"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onToggleSeeded}
              className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${drawSeeded ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan" : "border-border-main bg-bg-page text-text-secondary"}`}
            >
              <span>🎯 Cabeças de chave</span>
              <span>{drawSeeded ? "Ativado" : "Desativado"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Formato grupo (apenas Super 8 / Mixed Doubles / New Doubles) */}
      {(format === "super8" || format === "mixeddoubles" || format === "fixeddoubles" || format === "drawdoubles") && (
        <div className="mb-6">
          <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3">Formato de Grupos</label>
          <div className="flex gap-2">
            {[{ id: "single", label: "Grupo Único" }, { id: "groups", label: "Dois Grupos" }].map(g => (
              <button
                key={g.id}
                onClick={() => onChangeGroup(g.id as TournamentGroupFormat)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border-2 ${
                  groupFormat === g.id 
                    ? "border-brand-pink text-brand-pink bg-brand-pink/10" 
                    : "border-border-main text-text-secondary bg-bg-surface"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Fase Final (apenas Duplas Fixas/Sorteadas) */}
      {(format === "fixeddoubles" || format === "drawdoubles") && (
        <div className="mb-6">
          <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3">Fase Final (Playoffs)</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "none", label: "Nenhum", desc: "Apenas classificatória" },
              { id: "series", label: "Séries (Grupos)", desc: "Grupos Ouro/Prata" },
              { id: "knockout", label: "Mata-Mata", desc: "Semi e Finais" }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => onChangePlayoff(p.id as PlayoffFormat)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 border-2 text-center ${
                  playoffFormat === p.id 
                    ? "border-brand-pink text-brand-pink bg-brand-pink/10" 
                    : "border-border-main text-text-secondary bg-bg-surface hover:border-brand-pink/30"
                }`}
              >
                <span className="font-bold text-xs">{p.label}</span>
                <span className="text-[9px] opacity-70 mt-0.5 leading-tight">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="rounded-2xl p-4 mb-6 bg-brand-cyan/5 border border-brand-cyan/20">
        <p className="text-xs font-bold mb-3 text-brand-cyan">📊 PRÉVIA DO TORNEIO</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-2xl font-black text-text-primary">{preview.rounds}</div>
            <div className="text-xs text-text-muted">Rodadas</div>
          </div>
          <div>
            <div className="text-2xl font-black text-text-primary">{numCourts}</div>
            <div className="text-xs text-text-muted">Quadras</div>
          </div>
          <div>
            <div className="text-2xl font-black text-brand-pink">
              {preview.hours > 0 ? `${preview.hours}h${preview.mins > 0 ? preview.mins : ""}` : `${preview.mins}min`}
            </div>
            <div className="text-xs text-text-muted">Duração</div>
          </div>
        </div>
        {preview.byes > 0 && (
          <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <span className="text-yellow-600 dark:text-yellow-400 text-xs font-bold">⚠️ {preview.byes} dupla(s) descansará(ão) por rodada</span>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button className="btn-secondary flex-1" onClick={onBack}>← Voltar</button>
        <button className="btn-primary flex-1" onClick={onNext}>Continuar →</button>
      </div>
    </div>
  );
}
