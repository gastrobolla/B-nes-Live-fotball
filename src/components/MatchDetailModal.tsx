import React, { useState } from 'react';
import { Match, MatchEvent } from '../types.js';
import {
  X,
  MapPin,
  Calendar,
  Clock,
  Radio,
  CheckCircle2,
  RefreshCw,
  Edit3,
  ExternalLink,
  Shield,
  Activity,
  AlertCircle
} from 'lucide-react';

interface MatchDetailModalProps {
  match: Match | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenLagleder?: (match: Match) => void;
  onSyncMatchEvents?: (match: Match) => Promise<void>;
  onSelectPlayer?: (playerName: string, teamId?: string) => void;
  onViewLineup?: (match: Match) => void;
}

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({
  match,
  isOpen,
  onClose,
  onOpenLagleder,
  onSyncMatchEvents,
  onSelectPlayer,
  onViewLineup,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  if (!isOpen || !match) return null;

  const isBonesHome = match.homeTeam.toLowerCase().includes('bønes');
  const isBonesAway = match.awayTeam.toLowerCase().includes('bønes');

  const handleSync = async () => {
    if (!onSyncMatchEvents) return;
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      await onSyncMatchEvents(match);
      setSyncStatus('Hendelser oppdatert fra NFF!');
    } catch {
      setSyncStatus('Kunne ikke hente fra NFF akkurat nå.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 3500);
    }
  };

  const events = match.events || [];

  return (
    <div
      id="match-detail-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="match-detail-modal-content"
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="bg-[#0B2545] text-white p-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
              {match.division || 'NFF Serie'}
            </span>
            {match.status === 'live' && (
              <span className="flex items-center space-x-1 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                <Radio className="w-3 h-3" />
                <span>LIVE {match.currentMinute ? `${match.currentMinute}'` : ''}</span>
              </span>
            )}
            {match.status === 'finished' && (
              <span className="bg-slate-700 text-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                SLUTTRESULTAT
              </span>
            )}
            {match.status === 'upcoming' && (
              <span className="bg-blue-800 text-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                KOMMENDE
              </span>
            )}
          </div>
          <button
            id="match-detail-modal-close"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Score Board Header */}
        <div className="bg-gradient-to-b from-[#0B2545] to-[#133A6B] text-white p-5 sm:p-6 text-center">
          <div className="grid grid-cols-5 items-center gap-2">
            {/* Home Team */}
            <div className="col-span-2 text-right">
              <div className={`font-bold text-base sm:text-lg leading-tight ${isBonesHome ? 'text-amber-300' : 'text-white'}`}>
                {match.homeTeam}
              </div>
              {isBonesHome && (
                <span className="inline-block mt-1 text-[10px] font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.5 rounded">
                  BØNES IL
                </span>
              )}
            </div>

            {/* Score or Kickoff */}
            <div className="col-span-1 flex flex-col items-center justify-center">
              {match.status === 'upcoming' ? (
                <div className="bg-white/10 px-3 py-1.5 rounded-xl text-center">
                  <div className="text-xs text-blue-200 font-medium">KLOKKEN</div>
                  <div className="text-xl sm:text-2xl font-black text-white tracking-tight">{match.time}</div>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="text-3xl sm:text-4xl font-black text-white">{match.homeScore ?? 0}</span>
                  <span className="text-xl text-blue-300 font-light">-</span>
                  <span className="text-3xl sm:text-4xl font-black text-white">{match.awayScore ?? 0}</span>
                </div>
              )}
              {match.status === 'live' && (
                <span className="text-xs text-red-400 font-bold mt-1">
                  {match.currentMinute ? `${match.currentMinute}' Spilt` : 'Pågår'}
                </span>
              )}
            </div>

            {/* Away Team */}
            <div className="col-span-2 text-left">
              <div className={`font-bold text-base sm:text-lg leading-tight ${isBonesAway ? 'text-amber-300' : 'text-white'}`}>
                {match.awayTeam}
              </div>
              {isBonesAway && (
                <span className="inline-block mt-1 text-[10px] font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.5 rounded">
                  BØNES IL
                </span>
              )}
            </div>
          </div>

          {/* Quick Match Meta info */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-blue-100/80 mt-4 pt-4 border-t border-white/10">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-300" />
              {match.date}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-300" />
              {match.time}
            </span>
            <span className="flex items-center gap-1 truncate max-w-[200px]">
              <MapPin className="w-3.5 h-3.5 text-blue-300" />
              {match.venue}
            </span>
          </div>
        </div>

        {/* Action button bar */}
        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              id="match-detail-sync-btn"
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#165094]' : ''}`} />
              <span>{isSyncing ? 'Henter...' : 'Oppdater'}</span>
            </button>

            {onViewLineup && (
              <button
                id="match-detail-lineup-btn"
                onClick={() => {
                  onViewLineup(match);
                }}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors shadow-2xs cursor-pointer"
              >
                <span>⚽ Lagoppstilling</span>
              </button>
            )}
          </div>

          {onOpenLagleder && (
            <button
              id="match-detail-lagleder-btn"
              onClick={() => {
                onClose();
                onOpenLagleder(match);
              }}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white transition-colors shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Rapporter</span>
            </button>
          )}
        </div>

        {syncStatus && (
          <div className="bg-emerald-50 text-emerald-800 text-xs px-4 py-2 flex items-center gap-2 border-b border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{syncStatus}</span>
          </div>
        )}

        {/* Scrollable body: Events Timeline */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Kamphendelser ({events.length})
            </h4>
            {match.fiksId && (
              <a
                href={`https://www.fotball.no/fotballdata/kamp/?fiksId=${match.fiksId}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#165094] hover:underline flex items-center gap-1"
              >
                <span>fotball.no</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {events.length === 0 ? (
            <div className="text-center py-8 px-4 bg-slate-50 rounded-xl border border-slate-200/60">
              <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600">Ingen hendelser registrert enda</p>
              <p className="text-xs text-slate-400 mt-1">
                {match.status === 'upcoming'
                  ? 'Hendelser oppdateres så snart kampen blåses i gang.'
                  : 'Klikk «Oppdater fra NFF» eller bruk laglederknappen for å legge inn scoringer.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {events.map((ev, idx) => {
                const isGoal = ev.type === 'goal';
                const isYellow = ev.type === 'yellow_card';
                const isRed = ev.type === 'red_card';
                const isSub = ev.type === 'sub';

                const isEventBones =
                  (ev.team && ev.team.toLowerCase().includes('bønes')) ||
                  (!ev.team && (isBonesHome || isBonesAway));

                return (
                  <div
                    key={ev.id || `ev-${idx}`}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                      isGoal
                        ? 'bg-amber-50/70 border-amber-200'
                        : isRed
                        ? 'bg-red-50/70 border-red-200'
                        : isYellow
                        ? 'bg-yellow-50/70 border-yellow-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Minute Badge */}
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0 ${
                        isGoal
                          ? 'bg-amber-500 text-white shadow-xs'
                          : isRed
                          ? 'bg-red-600 text-white'
                          : isYellow
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {ev.minute}'
                    </div>

                    {/* Event Description */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          {isGoal && '⚽ Mål'}
                          {isYellow && '🟨 Gult kort'}
                          {isRed && '🟥 Rødt kort'}
                          {isSub && '🔄 Bytte'}
                          {ev.type === 'whistle' && '⏱️ Dommersignal'}
                        </span>
                        {ev.source === 'lagleder' && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                            Lagleder
                          </span>
                        )}
                        {ev.source === 'NFF' && (
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                            NFF
                          </span>
                        )}
                      </div>

                      {ev.player && (
                        <div className="mt-0.5">
                          {isEventBones && onSelectPlayer ? (
                            <button
                              onClick={() => onSelectPlayer(ev.player!, match.teamId)}
                              className="text-sm font-bold text-[#165094] hover:underline cursor-pointer"
                            >
                              {ev.player}
                            </button>
                          ) : (
                            <span className="text-sm font-bold text-slate-800">{ev.player}</span>
                          )}
                        </div>
                      )}

                      <p className="text-xs text-slate-500 mt-0.5">{ev.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Details footer: Referee & Venue */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs text-slate-600 space-y-1.5 mt-4">
            <div className="flex justify-between">
              <span className="text-slate-400">Arena:</span>
              <span className="font-medium text-slate-700">{match.venue}</span>
            </div>
            {match.referee && (
              <div className="flex justify-between">
                <span className="text-slate-400">Dommer:</span>
                <span className="font-medium text-slate-700">{match.referee}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">NFF Fiks ID:</span>
              <span className="font-mono text-slate-700">{match.fiksId || match.id.replace('nff-', '')}</span>
            </div>
            {match.lastUpdatedAt && (
              <div className="flex justify-between">
                <span className="text-slate-400">Sist oppdatert:</span>
                <span className="text-slate-700">{match.lastUpdatedAt} ({match.lastUpdatedSource || 'NFF'})</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
