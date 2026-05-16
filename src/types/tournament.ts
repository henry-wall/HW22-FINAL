// Tipos unificados do torneio HW22 v2

export type TournamentFormat = "super8" | "kingqueen" | "mixeddoubles" | "fixeddoubles" | "drawdoubles";
export type PairingMode = "fixed" | "random"; // Duplas fixas ou sorteadas
export type CoupleMode = "fixed" | "draw";    // Casais fixos ou sortear casais (Troca de Casais)
export type Category = "masc" | "fem" | "mixed";
export type TiebreakerCriterion = "wins" | "direct_confrontation" | "gamediff" | "gamesfor";
export type VictoryCondition = "wins" | "gamediff" | "gamesfor"; // Kept for backwards compatibility
export type DurationType = "set6" | "shortset" | "supertie" | "game6";
export type TournamentGroupFormat = "single" | "groups";
export type ViewMode = "planning" | "operation" | "presentation";

export interface MatchSettings {
  bestOf: 1 | 3 | 5;
  gamesPerSet: 4 | 6 | 8;
  isNoAd: boolean;
  hasTieBreak: boolean;
  tbTrigger: number;      // games needed to trigger tiebreak (ex: 6 ou 7)
  tbTarget: number;       // points to win tiebreak (7)
  superTieLastSet: boolean;
  superTieTarget: 10;     // fixed at 10 as per user request
  firstServe: 0 | 1;      // 0 for Team A, 1 for Team B
}

export interface Player {
  id: string;
  name: string;
  gender?: "M" | "F";
}

export interface Couple {
  manName: string;
  womanName: string;
}

export interface TeamRef {
  man: number;
  woman: number;
}

export interface Match {
  id: string;
  globalId: string;
  round: number;
  teamA: TeamRef;
  teamB: TeamRef | null;
  court?: number;
  group?: "A" | "B";
  scheduledTime?: string;
  originalRound?: number;
}

export interface Round {
  round: number;
  matches: Match[];
}

export interface MatchResult {
  scoreA: string | number;
  scoreB: string | number;
}

// Evento maior que agrupa múltiplos torneios (categorias)
export interface TournamentEvent {
  id: string;
  name: string;
  createdAt: string;
}

// Configuração completa de um torneio (gerada pelo wizard)
export interface TournamentConfig {
  id: string;
  name: string;
  format: TournamentFormat;
  pairingMode: PairingMode;       // Para Super8 e K&Q
  coupleMode?: CoupleMode;         // Apenas para Troca de Casais
  category: Category;
  tiebreakerOrder: TiebreakerCriterion[];
  victoryCondition?: VictoryCondition; // Backwards compatibility
  durationType: DurationType;
  numPlayers: number;              // Total de jogadores/casais
  numCourts: number;
  groupFormat: TournamentGroupFormat;
  matchSettings?: MatchSettings;
  createdAt: string;
  eventId?: string;                // ID do evento maior (opcional)
}
