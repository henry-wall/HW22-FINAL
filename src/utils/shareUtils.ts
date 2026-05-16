import type { TournamentConfig } from "../types/tournament";
import type { RankingItem } from "./rankingUtils";

export function shareRankingToWhatsApp(config: TournamentConfig, ranking: RankingItem[]) {
  const title = `🏆 *RESULTADO FINAL: ${config.name.toUpperCase()}* 🏆`;
  const format = `📊 Formato: ${getFormatLabel(config.format)}`;
  const date = `📅 Data: ${new Date().toLocaleDateString("pt-BR")}`;
  
  let body = "";
  ranking.forEach((r, idx) => {
    const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "🔹";
    body += `${medal} *${idx + 1}º ${r.name}*\n   ${r.wins}V | Saldo: ${r.diff > 0 ? "+" : ""}${r.diff}\n\n`;
  });

  const footer = `_Gerado por WallBT_`;
  const message = encodeURIComponent(`${title}\n${format}\n${date}\n\n${body}${footer}`);
  window.open(`https://wa.me/?text=${message}`, "_blank");
}

export function shareStandingsToWhatsApp(config: TournamentConfig, ranking: RankingItem[]) {
  const title = `🎾 *CLASSIFICAÇÃO PARCIAL* 🎾\n*${config.name.toUpperCase()}*`;
  const time = `🕒 Atualizado às: ${new Date().toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}`;
  
  let body = "";
  ranking.forEach((r, idx) => {
    const icon = idx < 4 ? "⭐" : "▫️";
    body += `${icon} *${idx + 1}º ${r.name.toUpperCase()}*\n    ${r.wins}V | Saldo: ${r.diff > 0 ? "+" : ""}${r.diff}\n`;
  });

  const baseUrl = window.location.origin;
  const tvLink = `${baseUrl}/?tv=${config.id}`;
  
  const footer = `\n📺 *PLACAR AO VIVO:* \n${tvLink}\n\n_Gerado por WallBT_`;
  
  const fullText = `${title}\n${time}\n\n${body}${footer}`;
  const message = encodeURIComponent(fullText);
  
  window.open(`https://wa.me/?text=${message}`, "_blank");
}

function getFormatLabel(format: string): string {
  const labels: Record<string, string> = {
    super8: "Super 8",
    kingqueen: "King & Queen",
    mixeddoubles: "Troca de Casais",
    fixeddoubles: "Duplas Fixas",
    drawdoubles: "Duplas Sorteadas"
  };
  return labels[format] || format;
}
