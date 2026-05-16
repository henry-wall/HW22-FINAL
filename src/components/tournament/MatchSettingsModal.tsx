import type { MatchSettings } from "../../types/tournament";
import { getTieBreakTrigger } from "../../utils/matchSettingsUtils";

interface MatchSettingsModalProps {
  settings: MatchSettings;
  onUpdate: (settings: MatchSettings) => void;
  onClose: () => void;
  teamAName: string;
  teamBName: string;
}

export default function MatchSettingsModal({ settings, onUpdate, onClose, teamAName, teamBName }: MatchSettingsModalProps) {
  const update = (key: keyof MatchSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    
    // Automatic logic for tbTrigger based on gamesPerSet
    if (key === "gamesPerSet" || key === "hasTieBreak") {
      newSettings.tbTrigger = getTieBreakTrigger(newSettings.gamesPerSet);
    }

    if (key === "bestOf") {
      newSettings.superTieLastSet = value > 1;
    }
    
    onUpdate(newSettings);
  };


  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#12121e] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-xl font-black text-white uppercase tracking-tight">Configurações</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/50 hover:bg-white/10 transition-colors">✕</button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
          
          {/* First Serve */}
          <section>
            <label className="text-[10px] font-black text-brand-cyan uppercase tracking-widest block mb-3">Quem começa sacando?</label>
            <div className="grid grid-cols-2 gap-3">
              {[0, 1].map((v) => (
                <button
                  key={v}
                  onClick={() => update("firstServe", v)}
                  className={`py-3 px-2 rounded-xl font-bold text-sm border transition-all truncate ${
                    settings.firstServe === v 
                      ? "bg-brand-cyan border-brand-cyan text-white shadow-[0_0_15px_rgba(0,241,253,0.3)]" 
                      : "bg-white/5 border-white/5 text-white/40 hover:border-white/10"
                  }`}
                >
                  {v === 0 ? teamAName : teamBName}
                </button>
              ))}
            </div>
          </section>

          {/* Sets */}
          <section>
            <label className="text-[10px] font-black text-brand-pink uppercase tracking-widest block mb-3">Melhor de quantos Sets</label>
            <div className="grid grid-cols-3 gap-3">
              {[1, 3, 5].map((v) => (
                <button
                  key={v}
                  onClick={() => update("bestOf", v)}
                  className={`py-3 rounded-xl font-bold text-sm border transition-all ${
                    settings.bestOf === v 
                      ? "bg-brand-pink border-brand-pink text-white shadow-[0_0_15px_rgba(251,3,149,0.3)]" 
                      : "bg-white/5 border-white/5 text-white/40 hover:border-white/10"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </section>

          {/* Games per set */}
          <section>
            <label className="text-[10px] font-black text-yellow-400 uppercase tracking-widest block mb-3">Games por set</label>
            <div className="grid grid-cols-3 gap-3">
              {[4, 6, 8].map((v) => (
                <button
                  key={v}
                  onClick={() => update("gamesPerSet", v)}
                  className={`py-3 rounded-xl font-bold text-sm border transition-all ${
                    settings.gamesPerSet === v 
                      ? "bg-yellow-400 border-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.3)]" 
                      : "bg-white/5 border-white/5 text-white/40 hover:border-white/10"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </section>

          {/* No Ad Toggle */}
          <section className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
            <div>
              <div className="font-bold text-white text-sm">Modo "No Ad" (Ponto de Ouro)</div>
              <div className="text-[10px] text-white/40 uppercase font-bold tracking-tighter">Sem vantagem no 40-40</div>
            </div>
            <button 
              onClick={() => update("isNoAd", !settings.isNoAd)}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.isNoAd ? 'bg-green-500' : 'bg-white/10'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.isNoAd ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </section>

          {/* Tiebreak Toggle */}
          <section className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
            <div>
              <div className="font-bold text-white text-sm">Tem Tie-break?</div>
              <div className="text-[10px] text-white/40 uppercase font-bold tracking-tighter">
                {settings.gamesPerSet === 4 ? "No 3x3" : settings.gamesPerSet === 6 ? "No 6x6" : "No 8x8"}
              </div>
            </div>
            <button 
              onClick={() => update("hasTieBreak", !settings.hasTieBreak)}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.hasTieBreak ? 'bg-brand-cyan' : 'bg-white/10'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.hasTieBreak ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </section>

          {/* SuperTie last set */}
          {settings.bestOf > 1 && (
            <section className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
              <div>
                <div className="font-bold text-white text-sm">Desempate Super Tie (10 pts)?</div>
                <div className="text-[10px] text-white/40 uppercase font-bold tracking-tighter">Se empatar 1x1 em sets</div>
              </div>
              <button 
                onClick={() => update("superTieLastSet", !settings.superTieLastSet)}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.superTieLastSet ? 'bg-brand-pink' : 'bg-white/10'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.superTieLastSet ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </section>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5">
          <button 
            onClick={onClose}
            className="w-full py-4 rounded-2xl bg-white text-black font-black text-sm uppercase tracking-widest hover:bg-white/90 transition-colors"
          >
            Confirmar Alterações
          </button>
        </div>
      </div>
    </div>
  );
}
