import type { EngineMatch } from "../engines/super8Engine";
import { useTournamentState } from "./useTournamentState";

export interface MatchResult {
  scoreA: number | string;
  scoreB: number | string;
}

// KingQueen uses a more complex structure, but we can unify the base
export interface TournamentData {
  status: "planning" | "operation" | "finished";
  matches: EngineMatch[]; // For Super8 and Mixed
  matchResults: Record<string, MatchResult>;
  inProgressMatches: Record<number, EngineMatch>;
  completedMatches: EngineMatch[];
  matchQueue: EngineMatch[];
  groupRounds?: any[];
  seriesRounds?: any[];
  seriesPlayerOrder?: number[][];
  liveScores?: Record<string, any>; // Stores live ScoreState from RefereeScoreboard
  players?: string[];
  couples?: { manName: string; womanName: string }[];
  lastUpdateTime?: number; // Timestamp of the last score update
}

const DEFAULT_DATA: TournamentData = {
  status: "planning",
  matches: [],
  matchResults: {},
  inProgressMatches: {},
  completedMatches: [],
  matchQueue: [],
  liveScores: {},
  players: [],
  couples: [],
};

export function useTournamentData(tournamentId: string) {
  const {
    data,
    updateField: originalUpdateField,
    updateData: originalUpdateData,
    isLoaded,
  } = useTournamentState<TournamentData>(`wallbt_v2_tournament_${tournamentId}`, DEFAULT_DATA);

  /**
   * Replaces/merges the entire tournament data object.
   * Uses `originalUpdateData` (which does { ...prev, ...partial })
   * instead of the old broken hack with "" as a field key.
   */
  const updateData = (newData: Partial<TournamentData>) => {
    originalUpdateData({ ...newData, lastUpdateTime: Date.now() });
  };

  const updateField = (field: keyof TournamentData, value: any) => {
    originalUpdateField(field as any, value);
    // Also update timestamp so real-time subscribers notice the change
    originalUpdateField("lastUpdateTime" as any, Date.now());
  };

  return { data, updateData, updateField, isLoaded };
}
