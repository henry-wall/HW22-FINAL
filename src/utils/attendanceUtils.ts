import type { EngineMatch } from "../engines/super8Engine";
import type { AttendanceStatus, PlayerAttendance } from "../hooks/useTournamentData";

/**
 * Verifica se um jogador está presente (não ausente)
 */
export function isPlayerPresent(
  playerIndex: number,
  attendance: PlayerAttendance | undefined
): boolean {
  if (!attendance) return true; // Se não houver registro, assume presente
  const status = attendance[playerIndex];
  return status !== "absent";
}

/**
 * Verifica se um jogo envolve algum jogador ausente
 */
export function matchHasAbsentPlayer(
  match: EngineMatch,
  attendance: PlayerAttendance | undefined
): boolean {
  const allPlayers = [...match.teamA, ...match.teamB];
  return allPlayers.some(p => !isPlayerPresent(p, attendance));
}

/**
 * Verifica se um jogo envolve algum jogador atrasado
 */
export function matchHasLatePlayer(
  match: EngineMatch,
  attendance: PlayerAttendance | undefined
): boolean {
  if (!attendance) return false;
  const allPlayers = [...match.teamA, ...match.teamB];
  return allPlayers.some(p => attendance[p] === "late");
}

/**
 * Retorna os índices dos jogadores ausentes
 */
export function getAbsentPlayerIndices(
  attendance: PlayerAttendance | undefined
): number[] {
  if (!attendance) return [];
  return Object.entries(attendance)
    .filter(([_, status]) => status === "absent")
    .map(([index]) => parseInt(index, 10));
}

/**
 * Retorna os índices dos jogadores atrasados
 */
export function getLatePlayerIndices(
  attendance: PlayerAttendance | undefined
): number[] {
  if (!attendance) return [];
  return Object.entries(attendance)
    .filter(([_, status]) => status === "late")
    .map(([index]) => parseInt(index, 10));
}

/**
 * Reorganiza a fila de jogos movendo jogos com jogadores ausentes para o final
 * Retorna a fila reorganizada e informações sobre jogos afetados
 */
export function reorganizeMatchQueue(
  queue: EngineMatch[],
  attendance: PlayerAttendance | undefined
): { reorderedQueue: EngineMatch[]; affectedCount: number; lateCount: number } {
  const absentMatches: EngineMatch[] = [];
  const lateMatches: EngineMatch[] = [];
  const availableMatches: EngineMatch[] = [];

  for (const match of queue) {
    if (matchHasAbsentPlayer(match, attendance)) {
      absentMatches.push(match);
    } else if (matchHasLatePlayer(match, attendance)) {
      lateMatches.push(match);
    } else {
      availableMatches.push(match);
    }
  }

  // Ordem: disponíveis primeiro, depois atrasados, depois ausentes
  const reorderedQueue = [...availableMatches, ...lateMatches, ...absentMatches];

  return {
    reorderedQueue,
    affectedCount: absentMatches.length + lateMatches.length,
    lateCount: lateMatches.length
  };
}

/**
 * Sugere o próximo jogo ideal baseado na disponibilidade dos atletas
 * Retorna o índice do próximo jogo na fila ou -1 se não houver jogos disponíveis
 */
export function suggestNextMatch(
  queue: EngineMatch[],
  attendance: PlayerAttendance | undefined,
  busyPlayers: Set<number> = new Set()
): number {
  // Primeiro, tenta encontrar um jogo sem jogadores ausentes e sem jogadores ocupados
  for (let i = 0; i < queue.length; i++) {
    const match = queue[i];
    if (matchHasAbsentPlayer(match, attendance)) continue;

    const allPlayers = [...match.teamA, ...match.teamB];
    const hasBusyPlayer = allPlayers.some(p => busyPlayers.has(p));
    if (!hasBusyPlayer) {
      return i;
    }
  }

  // Se não encontrar, tenta jogos sem jogadores ausentes (aceita jogadores ocupados)
  for (let i = 0; i < queue.length; i++) {
    const match = queue[i];
    if (!matchHasAbsentPlayer(match, attendance)) {
      return i;
    }
  }

  return -1; // Nenhum jogo disponível
}

/**
 * Obtém a contagem de jogos por status de presença
 */
export function getMatchAttendanceStats(
  queue: EngineMatch[],
  attendance: PlayerAttendance | undefined
): { available: number; late: number; absent: number } {
  let available = 0;
  let late = 0;
  let absent = 0;

  for (const match of queue) {
    if (matchHasAbsentPlayer(match, attendance)) {
      absent++;
    } else if (matchHasLatePlayer(match, attendance)) {
      late++;
    } else {
      available++;
    }
  }

  return { available, late, absent };
}

/**
 * Gera mensagem informativa sobre jogos afetados
 */
export function getAttendanceMessage(
  absentCount: number,
  lateCount: number
): string | null {
  if (absentCount === 0 && lateCount === 0) {
    return null;
  }

  const parts: string[] = [];
  if (absentCount > 0) {
    parts.push(`${absentCount} jogo${absentCount > 1 ? 's' : ''} com atleta${absentCount > 1 ? 's' : ''} ausente${absentCount > 1 ? 's' : ''}`);
  }
  if (lateCount > 0) {
    parts.push(`${lateCount} jogo${lateCount > 1 ? 's' : ''} com atleta${lateCount > 1 ? 's' : ''} atrasado${lateCount > 1 ? 's' : ''}`);
  }

  return `⚠️ ${parts.join(' e ')} foram adiados para o final da fila.`;
}

/**
 * Obtém o status label formatado
 */
export function getAttendanceLabel(status: AttendanceStatus): string {
  switch (status) {
    case "present":
      return "Presente";
    case "absent":
      return "Ausente";
    case "late":
      return "Atrasado";
    default:
      return "Desconhecido";
  }
}

/**
 * Obtém a cor do badge para o status
 */
export function getAttendanceBadgeColor(status: AttendanceStatus): string {
  switch (status) {
    case "present":
      return "bg-green-500/20 text-green-500 border-green-500/30";
    case "absent":
      return "bg-red-500/20 text-red-500 border-red-500/30";
    case "late":
      return "bg-amber-500/20 text-amber-500 border-amber-500/30";
    default:
      return "bg-gray-500/20 text-gray-500 border-gray-500/30";
  }
}