import { useState, useCallback, useMemo } from "react";
import PresentationMode from "./components/tournament/PresentationMode";
import { StorageProvider } from "./services/storage/StorageContext";
import { ThemeProvider } from "./services/ThemeContext";
import { useTournamentState } from "./hooks/useTournamentState";
import type { TournamentConfig, TournamentEvent } from "./types/tournament";
import HomeScreen from "./components/layout/HomeScreen";
import TournamentWizard from "./components/wizard/TournamentWizard";
import TournamentDashboard from "./components/tournament/TournamentDashboard";
import { shufflePlayersIntoPairs } from "./engines/doublesEngine";

type AppView = "home" | "wizard" | "tournament";

interface AppData {
  tournaments: TournamentConfig[];
  players: Record<string, string[] | { manName: string; womanName: string }[]>;
  events: TournamentEvent[];
}

const DEFAULT_DATA: AppData = { tournaments: [], players: {}, events: [] };

function AppContent() {
  const { data, updateField, isLoaded } = useTournamentState<AppData>("wallbt_v2_app", DEFAULT_DATA);
  const [view, setView] = useState<AppView>("home");
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);

  // Detect TV mode from URL
  const tvTournamentId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tv");
  }, []);

  const tournaments = data?.tournaments || [];
  const playersMap = data?.players || {};
  const activeTournament = tournaments.find(t => t.id === activeTournamentId) || null;
  const activePlayers = activeTournamentId ? (playersMap[activeTournamentId] || []) : [];

  const handleWizardComplete = useCallback((
    config: TournamentConfig,
    players: string[] | { manName: string; womanName: string }[],
    eventId?: string
  ) => {
    const configWithEvent = eventId ? { ...config, eventId } : config;
    let finalPlayers = players;
    
    // For Draw Doubles, shuffle individual players into pairs immediately
    if (config.format === "drawdoubles" && Array.isArray(players) && typeof players[0] === "string") {
      finalPlayers = shufflePlayersIntoPairs(players as string[]);
    }

    const newTournaments = [...tournaments, configWithEvent];
    const newPlayers = { ...playersMap, [config.id]: finalPlayers };
    updateField("tournaments", newTournaments);
    updateField("players", newPlayers);
    setActiveTournamentId(config.id);
    setView("tournament");
  }, [tournaments, playersMap, updateField]);

  const handleOpenTournament = useCallback((id: string) => {
    setActiveTournamentId(id);
    setView("tournament");
  }, []);

  const handleUpdatePlayers = useCallback((newPlayers: any) => {
    if (!activeTournamentId) return;
    const newPlayersMap = { ...data.players, [activeTournamentId]: newPlayers };
    updateField("players", newPlayersMap);
  }, [data.players, activeTournamentId, updateField]);

  const handleUpdateTournament = useCallback((id: string, partial: Partial<TournamentConfig>) => {
    const newTournaments = tournaments.map(t =>
      t.id === id ? { ...t, ...partial } : t
    );
    updateField("tournaments", newTournaments);
  }, [tournaments, updateField]);

  // Event handlers
  const handleCreateEvent = useCallback((name: string): TournamentEvent => {
    const newEvent: TournamentEvent = {
      id: `event_${Date.now()}`,
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };
    updateField("events", [...(data.events || []), newEvent]);
    return newEvent;
  }, [data.events, updateField]);

  const handleDeleteEvent = useCallback((eventId: string) => {
    const newTournaments = data.tournaments.map(t =>
      t.eventId === eventId ? { ...t, eventId: undefined } : t
    );
    updateField("tournaments", newTournaments);
    updateField("events", (data.events || []).filter(e => e.id !== eventId));
  }, [data.events, data.tournaments, updateField]);

  const handleLinkTournament = useCallback((tournamentId: string, eventId: string | undefined) => {
    const newTournaments = data.tournaments.map(t =>
      t.id === tournamentId ? { ...t, eventId } : t
    );
    updateField("tournaments", newTournaments);
  }, [data.tournaments, updateField]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-page flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 border-4 border-brand-pink/20 border-t-brand-pink rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-black text-primary mb-2">Conectando...</h2>
        <p className="text-muted text-sm">Sincronizando com a nuvem</p>
      </div>
    );
  }

  // If in TV mode, render only the presentation screen
  if (tvTournamentId) {
    const tvConfig = tournaments.find(t => t.id === tvTournamentId);
    if (tvConfig) {
      return (
        <div className="min-h-screen bg-page">
          <PresentationMode 
            config={tvConfig} 
            onClose={() => {}} // No close in TV-only mode
            isStandalone={true}
          />
        </div>
      );
    }
  }

  if (view === "wizard") {
    return (
      <TournamentWizard
        events={data.events || []}
        onComplete={handleWizardComplete}
        onCancel={() => setView("home")}
      />
    );
  }

  if (view === "tournament" && activeTournament) {
    const siblingTournaments = activeTournament.eventId
      ? data.tournaments.filter(t => t.eventId === activeTournament.eventId && t.id !== activeTournament.id)
      : [];
    const activeEvent = activeTournament.eventId
      ? (data.events || []).find(e => e.id === activeTournament.eventId)
      : undefined;

    return (
      <TournamentDashboard
        config={activeTournament}
        initialPlayers={activePlayers}
        onUpdatePlayers={handleUpdatePlayers}
        onUpdateTournament={(partial) => handleUpdateTournament(activeTournament.id, partial)}
        onBack={() => setView("home")}
        siblingTournaments={siblingTournaments}
        activeEvent={activeEvent}
        onSwitchTournament={handleOpenTournament}
      />
    );
  }

  return (
    <HomeScreen
      tournaments={tournaments}
      events={data?.events || []}
      onNewTournament={() => setView("wizard")}
      onOpenTournament={handleOpenTournament}
      onCreateEvent={handleCreateEvent}
      onDeleteEvent={handleDeleteEvent}
      onLinkTournament={handleLinkTournament}
    />
  );
}

export default function App() {
  return (
    <StorageProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </StorageProvider>
  );
}
