import { useEffect, useState } from "react";

interface ChampionScreenProps {
  winnerName: string;
  onClose: () => void;
}

export default function ChampionScreen({ winnerName, onClose }: ChampionScreenProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
    // Play sound if possible? 
    // const audio = new Audio("...");
    // audio.play();
  }, []);

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-700 ${show ? 'opacity-100' : 'opacity-0'}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl"></div>
      
      {/* Animated Particles (CSS) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 40 }).map((_, i) => (
          <div 
            key={i}
            className="absolute animate-fall"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-10%`,
              width: `${Math.random() * 10 + 5}px`,
              height: `${Math.random() * 10 + 5}px`,
              backgroundColor: ['#EC4899', '#06B6D4', '#F59E0B', '#10B981'][Math.floor(Math.random() * 4)],
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${Math.random() * 2 + 3}s`,
              opacity: 0.8
            }}
          ></div>
        ))}
      </div>

      {/* Content */}
      <div className={`relative z-10 text-center transform transition-all duration-1000 scale-90 ${show ? 'scale-100' : 'scale-50'}`}>
        <div className="mb-8 relative inline-block">
          <div className="absolute inset-0 bg-brand-pink blur-[60px] opacity-30 animate-pulse"></div>
          <span className="text-[120px] leading-none block animate-bounce-slow">🏆</span>
        </div>

        <h2 className="text-brand-cyan font-black text-2xl uppercase tracking-[0.3em] mb-4 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
          Grande Campeão
        </h2>

        <div className="mb-12 px-10">
          <h1 className="text-white text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-tight drop-shadow-2xl">
            {winnerName}
          </h1>
          <div className="h-2 w-full max-w-[200px] mx-auto bg-gradient-to-r from-brand-pink via-brand-cyan to-brand-pink mt-6 rounded-full shadow-[0_0_20px_#EC4899]"></div>
        </div>

        <button 
          onClick={onClose}
          className="bg-white text-black font-black px-12 py-4 rounded-2xl hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-sm shadow-[0_10px_30px_rgba(255,255,255,0.2)]"
        >
          Fechar Galeria
        </button>
      </div>

      <style>{`
        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg); }
          100% { transform: translateY(110vh) rotate(720deg); }
        }
        .animate-fall {
          animation-name: fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
