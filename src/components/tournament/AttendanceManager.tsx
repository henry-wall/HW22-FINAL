import { useState, useMemo } from "react";
import type { AttendanceStatus, PlayerAttendance } from "../../hooks/useTournamentData";
import {
  getMatchAttendanceStats,
  getAttendanceMessage,
} from "../../utils/attendanceUtils";
import type { EngineMatch } from "../../engines/super8Engine";

interface AttendanceManagerProps {
  players: string[];
  couples?: { manName: string; womanName: string }[];
  isDoubles: boolean;
  attendance: PlayerAttendance | undefined;
  matchQueue: EngineMatch[];
  onAttendanceChange: (attendance: PlayerAttendance) => void;
  onReorderMatches: () => void;
  onClose: () => void;
}

export default function AttendanceManager({
  players,
  couples,
  isDoubles,
  attendance,
  matchQueue,
  onAttendanceChange,
  onReorderMatches,
  onClose
}: AttendanceManagerProps) {
  const [localAttendance, setLocalAttendance] = useState<PlayerAttendance>(
    attendance || {}
  );
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Estatísticas dos jogos
  const stats = useMemo(() => {
    return getMatchAttendanceStats(matchQueue, localAttendance);
  }, [matchQueue, localAttendance]);

  // Salvar alterações
  const handleSave = () => {
    onAttendanceChange(localAttendance);
  };

  // Alterar status de um jogador
  const handleStatusChange = (playerIndex: number, status: AttendanceStatus) => {
    const newAttendance = { ...localAttendance };
    if (status === "present") {
      delete newAttendance[playerIndex];
    } else {
      newAttendance[playerIndex] = status;
    }
    setLocalAttendance(newAttendance);
  };

  // Marcar todos como presentes
  const handleResetAll = () => {
    setLocalAttendance({});
  };

  // Reordenar jogos
  const handleReorder = () => {
    handleSave();
    onReorderMatches();
    
    const message = getAttendanceMessage(stats.absent, stats.late);
    if (message) {
      setToastMessage(message);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    }
  };

  // Renderizar jogador individual
  const renderPlayer = (index: number, name: string) => {
    const currentStatus = localAttendance[index] || "present";
    
    return (
      <div
        key={index}
        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
          currentStatus === "absent"
            ? "bg-red-500/5 border-red-500/20"
            : currentStatus === "late"
            ? "bg-amber-500/5 border-amber-500/20"
            : "bg-surface border-border-main"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black bg-brand-pink/10 text-brand-pink">
            {index + 1}
          </span>
          <span className={`font-bold text-sm ${
            currentStatus === "absent" ? "text-red-400 line-through opacity-60" : "text-primary"
          }`}>
            {name}
          </span>
        </div>
        
        <div className="flex gap-1">
          <button
            onClick={() => handleStatusChange(index, "present")}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
              currentStatus === "present"
                ? "bg-green-500 text-white"
                : "bg-surface border border-border-main text-muted hover:border-green-500/50"
            }`}
          >
            ✓
          </button>
          <button
            onClick={() => handleStatusChange(index, "late")}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
              currentStatus === "late"
                ? "bg-amber-500 text-black"
                : "bg-surface border border-border-main text-muted hover:border-amber-500/50"
            }`}
            title="Atrasado"
          >
            ⏰
          </button>
          <button
            onClick={() => handleStatusChange(index, "absent")}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
              currentStatus === "absent"
                ? "bg-red-500 text-white"
                : "bg-surface border border-border-main text-muted hover:border-red-500/50"
            }`}
            title="Ausente"
          >
            ✗
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="p-5 border-b border-border-main">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-black text-primary flex items-center gap-2">
                <span>👥</span> Gerenciar Presenças
              </h2>
              <p className="text-xs text-muted mt-1">
                {isDoubles ? `${couples?.length || 0} casais` : `${players.length} jogadores`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface border border-border-main flex items-center justify-center text-muted hover:text-primary hover:border-brand-pink/50 transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Stats Banner */}
        <div className="px-5 py-3 bg-page/50 border-b border-border-main">
          <div className="flex gap-3">
            <div className="flex-1 bg-green-500/10 rounded-lg p-2 text-center">
              <div className="text-lg font-black text-green-500">{stats.available}</div>
              <div className="text-[10px] text-green-500/70 uppercase tracking-wider">Disponíveis</div>
            </div>
            <div className="flex-1 bg-amber-500/10 rounded-lg p-2 text-center">
              <div className="text-lg font-black text-amber-500">{stats.late}</div>
              <div className="text-[10px] text-amber-500/70 uppercase tracking-wider">Atrasados</div>
            </div>
            <div className="flex-1 bg-red-500/10 rounded-lg p-2 text-center">
              <div className="text-lg font-black text-red-500">{stats.absent}</div>
              <div className="text-[10px] text-red-500/70 uppercase tracking-wider">Ausentes</div>
            </div>
          </div>
        </div>

        {/* Players List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2 custom-scrollbar">
          {isDoubles && couples ? (
            couples.map((couple, i) => (
              <div key={i}>
                <div className="text-[10px] text-muted uppercase tracking-wider mb-1 font-bold">
                  Casal {i + 1}
                </div>
                {renderPlayer(i * 2, couple.manName)}
                {renderPlayer(i * 2 + 1, couple.womanName)}
              </div>
            ))
          ) : (
            players.map((player, i) => renderPlayer(i, player))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-border-main space-y-3">
          {/* Toast Message */}
          {showToast && (
            <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-500 text-xs font-medium animate-fade-in">
              {toastMessage}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleResetAll}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border-main text-muted hover:text-primary hover:border-brand-pink/50 transition-all text-xs font-bold uppercase tracking-wider"
            >
              Resetar Todos
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2.5 rounded-xl bg-brand-pink text-white font-bold text-xs uppercase tracking-wider hover:bg-pink-600 transition-all"
            >
              Salvar
            </button>
          </div>
          
          <button
            onClick={handleReorder}
            disabled={stats.absent === 0 && stats.late === 0}
            className={`w-full px-4 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              stats.absent === 0 && stats.late === 0
                ? "bg-surface border border-border-main text-muted cursor-not-allowed"
                : "bg-brand-cyan text-black hover:bg-cyan-400 shadow-lg shadow-brand-cyan/20"
            }`}
          >
            🔄 Reordenar Jogos Automaticamente
          </button>
          
          {stats.absent > 0 && (
            <p className="text-[10px] text-muted text-center">
              Jogos com jogadores ausentes serão movidos para o final da fila
            </p>
          )}
        </div>
      </div>
    </div>
  );
}