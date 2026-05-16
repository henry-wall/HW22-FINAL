import type { TournamentConfig } from "../types/tournament";
import type { RankingItem } from "./rankingUtils";

export function exportRankingToCSV(config: TournamentConfig, ranking: RankingItem[]) {
  const headers = ["Posicao", "Nome", "Vitorias", "Saldo Games", "Games Pro"];
  const rows = ranking.map((r, idx) => [
    idx + 1,
    r.name,
    r.wins,
    r.diff,
    r.games
  ]);

  const csvContent = [
    [config.name],
    [],
    headers,
    ...rows
  ].map(row => row.join(";")).join("\n");

  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `resultado_${config.name.replace(/\s+/g, '_')}.csv`;
  link.click();
}
