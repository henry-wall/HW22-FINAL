import { useState, useEffect, useCallback } from "react";

/**
 * Hook that provides a copy-to-clipboard function with visual feedback.
 * Returns [isCopied, copyFn] — `isCopied` is true for 2.5s after a successful copy.
 */
export function useCopyToClipboard(resetMs = 2500): [boolean, (text: string) => void] {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) return;
    const t = setTimeout(() => setIsCopied(false), resetMs);
    return () => clearTimeout(t);
  }, [isCopied, resetMs]);

  const copy = useCallback((text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers / non-HTTPS
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setIsCopied(true);
    } catch {
      setIsCopied(false);
    }
  }, []);

  return [isCopied, copy];
}

/**
 * Floating toast notification that appears when `show` is true.
 * Auto-dismisses visually with a slide-up + fade animation.
 */
export function CopyToast({ show, message = "Link copiado!" }: { show: boolean; message?: string }) {
  if (!show) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] animate-toast-in pointer-events-none">
      <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-green-600 text-white font-bold text-sm shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-green-400/30">
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {message}
      </div>
    </div>
  );
}
