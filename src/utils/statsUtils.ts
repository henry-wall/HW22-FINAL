import type { TournamentConfig } from "../types/tournament";
import type { TournamentData } from "../hooks/useTournamentData";

export interface TournamentStats {
  totalMatches: number;
  completedMatches: number;
  progress: number;
  estimatedRemainingTime: number; // in minutes
  status: "not_started" | "in_progress" | "finished";
}

export function calculateTournamentStats(config: TournamentConfig, data: TournamentData): TournamentStats {
  const total = data.matches.length || data.groupRounds?.reduce((acc, r) => acc + r.matches.length, 0) || 0;
  const completed = data.completedMatches?.length || 0;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  // Estimation logic
  // Average durations by type (could be moved to config later)
  const avgDurations: Record<string, number> = {
    set6: 45,
    shortset: 30,
    game6: 25,
    points21: 20
  };
  
  const avgDuration = avgDurations[config.durationType] || 30;
  const remainingMatches = total - completed;
  const inProgressCount = Object.keys(data.inProgressMatches || {}).length;
  
  // Formula: ((Remaining - InProgress) / TotalCourts * AvgTime) + (InProgress > 0 ? AvgTime/2 : 0)
  // Simplified for now:
  let estimatedRemainingTime = 0;
  if (remainingMatches > 0 && config.numCourts > 0) {
    const roundsToPlay = Math.ceil(remainingMatches / config.numCourts);
    estimatedRemainingTime = roundsToPlay * avgDuration;
  }

  let status: TournamentStats["status"] = "not_started";
  if (completed === total && total > 0) status = "finished";
  else if (completed > 0 || inProgressCount > 0) status = "in_progress";

  return {
    totalMatches: total,
    completedMatches: completed,
    progress,
    estimatedRemainingTime,
    status
  };
}

export function formatRemainingTime(minutes: number): string {
  if (minutes <= 0) return "---";
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}min` : `${hrs}h`;
}
