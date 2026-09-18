import React, { useState, useEffect, useMemo } from 'react';
import { Match, QuickCategoryFilter, BonesClubData } from '../types.js';
import {
  Radio,
  Clock,
  Calendar,
  MapPin,
  RefreshCw,
  Filter,
  CheckCircle2,
  ChevronRight,
  Shield,
  Activity,
  Home,
  WifiOff,
  Sparkles,
  Award
} from 'lucide-react';
import { MatchDetailModal } from './MatchDetailModal.js';
import { LaglederModal } from './LaglederModal.js';

interface LivescoreDashboardProps {
  data: BonesClubData;
  onRefreshData?: () => Promise<void>;
  onSelectPlayer?: (playerName: string, teamId?: string) => void;
  onViewLineup?: (match: Match) => void;
}

export const LivescoreDashboard: React.FC<LivescoreDashboardProps> = ({
  data,
  onRefreshData,
  onSelectPlayer,
  onViewLineup,
}) => {
  const [quickFilter, setQuickFilter] = useState<QuickCategoryFilter>('all');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const [onlyHome, setOnlyHome] = useState<boolean>(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isLaglederModalOpen, setIsLaglederModalOpen] = useState<boolean>(false);
  const [laglederMatch, setLaglederMatch] = useState<Match | null>(null);

  // Polling and "seconds ago" timer
  const [secondsAgo, setSecondsAgo] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Tick seconds ago timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter matches
  const filteredMatches = useMemo(() => {
    return data.matches.filter((m) => {
      // Category filter
      if (quickFilter === 'gutter') {
        const cat = (m.category || '').toLowerCase();
        const isGutt = cat.includes('ungdom') && (m.teamName.toLowerCase().includes('g') || m.teamId.startsWith('g'));
        if (!isGutt) return false;
      } else if (quickFilter === 'jenter') {
        const isJente = m.teamName.toLowerCase().includes('j') || m.teamId.startsWith('j');
        if (!isJente) return false;
      } else if (quickFilter === 'senior') {
        const cat = (m.category || '').toLowerCase();
        const isSenior = cat === 'senior' || m.teamId.includes('menn') || m.teamId.includes('bones-1');
        if (!isSenior) return false;
      }

      // Specific team filter
      if (selectedTeamId !== 'all' && m.teamId !== selectedTeamId) {
        return false;
      }

      // Only home ground filter
      if (onlyHome && !m.isHome) {
        return false;
      }

      return true;
    });
  }, [data.matches, quickFilter, selectedTeamId, onlyHome]);

  // Group into Live, Upcoming, Finished
  const liveMatches = useMemo(() => {
    return filteredMatches.filter((m) => m.status === 'live');
  }, [filteredMatches]);

  const upcomingMatches = useMemo(() => {
    return filteredMatches
      .filter((m) => m.status === 'upcoming')
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }, [filteredMatches]);

  const finishedMatches = useMemo(() => {
    return filteredMatches
      .filter((m) => m.status === 'finished')
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }, [filteredMatches]);

  // Adaptive Polling
  useEffect(() => {
    const hasLive = liveMatches.length > 0;
    const pollIntervalMs = hasLive ? 15000 : 45000;

    const interval = setInterval(async () => {
      if (onRefreshData && navigator.onLine) {
        try {
          await onRefreshData();
          setSecondsAgo(0);
        } catch {
          // silently handle network stutter
        }
      }
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [liveMatches.length, onRefreshData]);

  const handleManualRefresh = async () => {
    if (!onRefreshData || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefreshData();
      setSecondsAgo(0);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenMatchDetail = (m: Match) => {
    setSelectedMatch(m);
    setIsDetailModalOpen(true);
  };

  const handleOpenLagleder = (m: Match) => {
    setLaglederMatch(m);
    setIsLaglederModalOpen(true);
  };

  const handleSyncMatchEvents = async (m: Match) => {
    const res = await fetch(`/api/bones/match/${m.id}/events`, { method: 'POST' });
    if (res.ok) {
      const result = await res.json();
      if (result.match) {
        setSelectedMatch(result.match);
      }
      if (onRefreshData) await onRefreshData();
    }
  };

  // Helper for date formatting
  const formatDateHeader = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    if (dateStr === today) return 'I DAG';
    if (dateStr === tomorrow) return 'I MORGEN';

    try {
      const d = new Date(dateStr);
      const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
      return d.toLocaleDateString('no-NO', options).toUpperCase();
    } catch {
      return dateStr;
    }
  };

  // Determine Bønes match result (W / D / L)
  const getBonesResult = (m: Match): { label: string; bg: string; text: string } | null => {
    if (m.status !== 'finished' || m.homeScore === null || m.homeScore === undefined || m.awayScore === null || m.awayScore === undefined) {
      return null;
    }
    const isBonesHome = m.homeTeam.toLowerCase().includes('bønes');
    const bonesScore = isBonesHome ? m.homeScore : m.awayScore;
    const opponentScore = isBonesHome ? m.awayScore : m.homeScore;

    if (bonesScore > opponentScore) {
      return { label: 'S', bg: 'bg-emerald-600', text: 'text-white' };
    }
    if (bonesScore < opponentScore) {
      return { label: 'T', bg: 'bg-rose-600', text: 'text-white' };
    }
    return { label: 'U', bg: 'bg-slate-500', text: 'text-white' };
  };

  return (
    <div id="livescore-dashboard" className="space-y-4 pb-8">
      {/* Offline banner */}
      {isOffline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 rounded-xl font-medium text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span>Frakoblet internett. Viser lagrede data fra enheten.</span>
          </div>
        </div>
      )}

      {/* Livescore Sub-Header & Live Status Pill */}
      <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Indicator */}
          <div className="flex items-center gap-2.5">
            {liveMatches.length > 0 ? (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-full">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                </span>
                <span className="text-xs font-black tracking-wide">
                  {liveMatches.length} {liveMatches.length === 1 ? 'KAMP PÅGÅR NÅ' : 'KAMPER PÅGÅR NÅ'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-semibold">
                  {upcomingMatches.length > 0
                    ? `Neste kamp: ${upcomingMatches[0].homeTeam} (${upcomingMatches[0].time})`
                    : 'Ingen aktive kamper akkurat nå'}
                </span>
              </div>
            )}
          </div>

          {/* Refresh & Seconds Ago Counter */}
          <div className="flex items-center gap-3 text-xs text-slate-500 self-end sm:self-auto">
            <span className="hidden sm:inline">
              Oppdatert for {secondsAgo < 5 ? 'noen sekunder' : `${secondsAgo}s`} siden
            </span>
            <button
              id="livescore-refresh-btn"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#165094]' : ''}`} />
              <span>Oppdater</span>
            </button>
          </div>
        </div>

        {/* Quick Category Filters (Pills) */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
            <button
              id="filter-cat-all"
              onClick={() => setQuickFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                quickFilter === 'all'
                  ? 'bg-[#165094] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Alle lag ({data.teams.length})
            </button>
            <button
              id="filter-cat-gutter"
              onClick={() => setQuickFilter('gutter')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                quickFilter === 'gutter'
                  ? 'bg-[#165094] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Gutter
            </button>
            <button
              id="filter-cat-jenter"
              onClick={() => setQuickFilter('jenter')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                quickFilter === 'jenter'
                  ? 'bg-[#165094] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Jenter
            </button>
            <button
              id="filter-cat-senior"
              onClick={() => setQuickFilter('senior')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                quickFilter === 'senior'
                  ? 'bg-[#165094] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Senior / Old girls
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {/* Home matches toggle */}
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer font-medium select-none">
              <input
                type="checkbox"
                checked={onlyHome}
                onChange={(e) => setOnlyHome(e.target.checked)}
                className="rounded text-[#165094] focus:ring-[#165094] w-3.5 h-3.5"
              />
              <span className="flex items-center gap-1">
                <Home className="w-3.5 h-3.5 text-emerald-600" />
                Kun Bønesbanen
              </span>
            </label>

            {/* Team select dropdown */}
            <select
              id="livescore-team-dropdown"
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:ring-1 focus:ring-[#165094] focus:outline-hidden"
            >
              <option value="all">Velg spesifikt lag...</option>
              {data.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 1: 🔴 LIVE NÅ */}
      {liveMatches.length > 0 && (
        <section id="section-live-matches" className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
              </span>
              <h2 className="text-sm font-black uppercase tracking-wider text-red-600">
                Live Nå ({liveMatches.length})
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">Oppdateres hvert 15. sek.</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {liveMatches.map((m) => {
              const isBonesHome = m.homeTeam.toLowerCase().includes('bønes');
              const isBonesAway = m.awayTeam.toLowerCase().includes('bønes');
              const latestEvent = m.events && m.events.length > 0 ? m.events[m.events.length - 1] : null;

              return (
                <div
                  key={m.id}
                  id={`match-card-live-${m.id}`}
                  onClick={() => handleOpenMatchDetail(m)}
                  className="bg-white rounded-xl p-4 border-2 border-red-500/80 shadow-md hover:shadow-lg transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-bl-lg animate-pulse uppercase tracking-wider">
                    LIVE {m.currentMinute ? `${m.currentMinute}'` : ''}
                  </div>

                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    {m.division}
                  </div>

                  <div className="space-y-2">
                    {/* Home Team */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        {isBonesHome && (
                          <span className="w-2 h-2 rounded-full bg-[#165094] flex-shrink-0" />
                        )}
                        <span className={`text-base truncate ${isBonesHome ? 'font-black text-[#165094]' : 'font-semibold text-slate-800'}`}>
                          {m.homeTeam}
                        </span>
                      </div>
                      <span className="text-2xl font-black text-slate-900 ml-2">
                        {m.homeScore ?? 0}
                      </span>
                    </div>

                    {/* Away Team */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        {isBonesAway && (
                          <span className="w-2 h-2 rounded-full bg-[#165094] flex-shrink-0" />
                        )}
                        <span className={`text-base truncate ${isBonesAway ? 'font-black text-[#165094]' : 'font-semibold text-slate-800'}`}>
                          {m.awayTeam}
                        </span>
                      </div>
                      <span className="text-2xl font-black text-slate-900 ml-2">
                        {m.awayScore ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* Latest Event Ticker */}
                  {latestEvent && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-amber-700 bg-amber-50/70 -mx-4 -mb-4 px-4 py-2">
                      <span className="font-semibold truncate">
                        {latestEvent.type === 'goal' ? '⚽' : '⚡'} {latestEvent.description}
                      </span>
                      <ChevronRight className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 2: ⏱️ KOMMENDE KAMPER */}
      <section id="section-upcoming-matches" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#165094]" />
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Kommende Kamper ({upcomingMatches.length})
            </h2>
          </div>
          <span className="text-[11px] font-medium text-slate-500">Sortert kronologisk</span>
        </div>

        {upcomingMatches.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Ingen kommende kamper matcher filteret</p>
            <p className="text-xs text-slate-400 mt-1">Prøv å endre kategorifilteret eller fjerne Bønesbanen-filteret.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingMatches.slice(0, 15).map((m) => {
              const isBonesHome = m.homeTeam.toLowerCase().includes('bønes');
              const isBonesAway = m.awayTeam.toLowerCase().includes('bønes');
              const isHomeGround = m.venue.toLowerCase().includes('bønes') || m.venue.toLowerCase().includes('fjellsdalen');

              return (
                <div
                  key={m.id}
                  id={`match-card-upcoming-${m.id}`}
                  onClick={() => handleOpenMatchDetail(m)}
                  className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/90 hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  {/* Left: Time and division */}
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-50 border border-blue-200/80 rounded-lg px-2.5 py-1.5 text-center min-w-[65px] flex-shrink-0">
                      <div className="text-[10px] font-black text-[#165094] uppercase tracking-wider">
                        {formatDateHeader(m.date)}
                      </div>
                      <div className="text-sm font-black text-slate-900">{m.time}</div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                        {m.division}
                      </div>

                      {/* Team names row */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 mt-0.5">
                        <span className={`text-sm ${isBonesHome ? 'font-black text-[#165094]' : 'font-semibold text-slate-800'}`}>
                          {m.homeTeam}
                        </span>
                        <span className="hidden sm:inline text-xs text-slate-400 font-light">vs</span>
                        <span className={`text-sm ${isBonesAway ? 'font-black text-[#165094]' : 'font-semibold text-slate-800'}`}>
                          {m.awayTeam}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Venue Badge & Arrow */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      {isHomeGround ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-bold">
                          <Home className="w-3 h-3 text-emerald-600" />
                          Bønesbanen
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 text-[11px]">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[140px]">{m.venue}</span>
                        </span>
                      )}
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 3: 🏁 FERDIGSPILTE KAMPER */}
      <section id="section-finished-matches" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Ferdigspilte Kamper ({finishedMatches.length})
            </h2>
          </div>
          <span className="text-[11px] font-medium text-slate-500">Siste resultater</span>
        </div>

        {finishedMatches.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center border border-slate-200">
            <p className="text-xs text-slate-500">Ingen ferdigspilte kamper matcher filteret.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {finishedMatches.slice(0, 15).map((m) => {
              const isBonesHome = m.homeTeam.toLowerCase().includes('bønes');
              const isBonesAway = m.awayTeam.toLowerCase().includes('bønes');
              const result = getBonesResult(m);

              return (
                <div
                  key={m.id}
                  id={`match-card-finished-${m.id}`}
                  onClick={() => handleOpenMatchDetail(m)}
                  className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/90 hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* W / D / L Result Badge */}
                    {result ? (
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0 ${result.bg} ${result.text}`}
                        title={result.label === 'S' ? 'Seier' : result.label === 'T' ? 'Tap' : 'Uavgjort'}
                      >
                        {result.label}
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600 flex-shrink-0">
                        FT
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <span>{m.date}</span>
                        <span>•</span>
                        <span className="truncate">{m.division}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-0.5">
                        <div className="flex items-center justify-between pr-2">
                          <span className={`text-sm truncate ${isBonesHome ? 'font-black text-[#165094]' : 'font-medium text-slate-800'}`}>
                            {m.homeTeam}
                          </span>
                          <span className="font-black text-sm text-slate-900 ml-1.5">
                            {m.homeScore ?? 0}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pr-2">
                          <span className={`text-sm truncate ${isBonesAway ? 'font-black text-[#165094]' : 'font-medium text-slate-800'}`}>
                            {m.awayTeam}
                          </span>
                          <span className="font-black text-sm text-slate-900 ml-1.5">
                            {m.awayScore ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-400 flex-shrink-0">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Match Detail Modal */}
      <MatchDetailModal
        match={selectedMatch}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onOpenLagleder={handleOpenLagleder}
        onSyncMatchEvents={handleSyncMatchEvents}
        onSelectPlayer={onSelectPlayer}
        onViewLineup={onViewLineup}
      />

      {/* Lagleder Modal */}
      <LaglederModal
        isOpen={isLaglederModalOpen}
        onClose={() => setIsLaglederModalOpen(false)}
        matches={data.matches}
        initialMatch={laglederMatch}
        onReportSuccess={async (updatedMatch) => {
          setSelectedMatch(updatedMatch);
          if (onRefreshData) await onRefreshData();
        }}
      />
    </div>
  );
};
