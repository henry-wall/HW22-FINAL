import { generateMatchShareUrl } from "../../utils/shareUtils";
import { useCopyToClipboard, CopyToast } from "./CopyToast";

interface ShareMatchButtonProps {
  matchGlobalId: string;
  tournamentId: string;
  /** "compact" = small icon button for court cards, "full" = labeled button for referee */
  variant?: "compact" | "full";
}

/**
 * Self-contained share button that generates the match link, copies it,
 * and displays a toast notification. No WhatsApp popup unless explicit.
 */
export default function ShareMatchButton({ matchGlobalId, tournamentId, variant = "compact" }: ShareMatchButtonProps) {
  const [isCopied, copy] = useCopyToClipboard();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = generateMatchShareUrl(matchGlobalId, tournamentId);
    copy(url);
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = generateMatchShareUrl(matchGlobalId, tournamentId);
    const text = encodeURIComponent(`🎾 Árbitro ao vivo:\n${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  if (variant === "full") {
    return (
      <>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              isCopied
                ? "bg-green-500/20 border-green-500/40 text-green-400"
                : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10"
            }`}
          >
            {isCopied ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Copiado!
              </>
            ) : (
              <>
                🔗 Copiar Link
              </>
            )}
          </button>
          <button
            onClick={handleWhatsApp}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600/30 transition-colors text-sm"
            title="Compartilhar no WhatsApp"
          >
            📲
          </button>
        </div>
        <CopyToast show={isCopied} message="Link do árbitro copiado!" />
      </>
    );
  }

  // Compact variant for court cards
  return (
    <>
      <button
        onClick={handleCopy}
        className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
          isCopied
            ? "bg-green-500/20 border-green-500/40 text-green-400"
            : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10"
        }`}
        title="Copiar link do árbitro para esta partida"
      >
        {isCopied ? "✓ Copiado" : "🔗 Link"}
      </button>
      <CopyToast show={isCopied} message="Link do árbitro copiado!" />
    </>
  );
}
