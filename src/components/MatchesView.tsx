import React, { useState } from 'react';
import { Match } from '../types.js';
import { Calendar, Clock, MapPin, Shield, ChevronRight, CheckCircle2, Radio, Filter, Home, Sparkles } from 'lucide-react';

interface MatchesViewProps {
  matches: Match[];
  selectedTeamId: string;
}

export const MatchesView: React.FC<MatchesViewProps> = ({ matches, selectedTeamId }) => {
  const [onlyHomeMatches, setOnlyHomeMatches] = useState(false);
  const [tab, setTab] = useState<'upcoming' | 'finished'>('upcoming');

  // Filter matches
  const filteredMatches = matches.filter((m) => {
    // Team filter
    if (selectedTeamId !== 'all' && m.teamId !== selectedTeamId) {
      return false;
    }
    // Status filter
    if (tab === 'upcoming' && m.status === 'finished') {
      return false;
    }
    if (tab === 'finished' && m.status !== 'finished') {
      return false;
    }
    // Only home matches filter
    if (onlyHomeMatches && !m.isHome) {
      return false;
    }
    return true;
  });

  const totalHomeUpcoming = matches.filter(m => m.isHome && m.status !== 'finished').length;

  return (
    <div id="matches-view-container" className="space-y-4">
      
      {/* View Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        
        {/* Tab switcher: Kommende vs Ferdigspilte */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
          <button
            id="tab-upcoming-matches"
            onClick={() => setTab('upcoming')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              tab === 'upcoming'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-red-600" />
            <span>Framtidige kamper</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-red-100 text-red-700">
              {matches.filter(m => m.status !== 'finished').length}
            </span>
          </button>

          <button
            id="tab-finished-matches"
            onClick={() => setTab('finished')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              tab === 'finished'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Siste resultater</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
              {matches.filter(m => m.status === 'finished').length}
            </span>
          </button>
        </div>

        {/* Home Match Filter Highlight Toggle */}
        <div className="flex items-center space-x-2">
          <button
            id="toggle-home-only"
            onClick={() => setOnlyHomeMatches(!onlyHomeMatches)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              onlyHomeMatches
                ? 'bg-red-600 text-white border-red-700 shadow-sm shadow-red-600/20'
                : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Highlight hjemmekamper på Bønesbanen</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              onlyHomeMatches ? 'bg-red-800 text-red-100' : 'bg-amber-200 text-amber-900'
            }`}>
              {totalHomeUpcoming}
            </span>
          </button>
        </div>

      </div>

      {/* Match Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMatches.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
            <Calendar className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-60" />
            <p className="font-semibold">Ingen kamper funnet med gjeldende filter.</p>
            <p className="text-xs text-slate-400 mt-1">Prøv å velge "Alle lag" eller nullstill hjemmekamp-filteret.</p>
          </div>
        ) : (
          filteredMatches.map((match) => {
            const isLive = match.status === 'live';
            const isHome = match.isHome;

            return (
              <div
                key={match.id}
                id={`match-card-${match.id}`}
                className={`relative rounded-xl transition-all overflow-hidden border ${
                  isLive
                    ? 'bg-gradient-to-br from-red-950/20 via-slate-900/10 to-blue-950/20 border-red-500 ring-2 ring-red-500/30 shadow-md'
                    : isHome
                    ? 'bg-gradient-to-b from-red-50/60 to-white border-red-300 ring-1 ring-red-400/30 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                
                {/* Home Match Top Highlight Banner */}
                {isHome && (
                  <div className="bg-gradient-to-r from-red-600 to-blue-900 text-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <Home className="w-3.5 h-3.5 text-amber-300" />
                      <span>HJEMMEKAMP PÅ BØNESBANEN</span>
                    </div>
                    <span className="text-[10px] font-medium bg-black/30 px-2 py-0.2 rounded">
                      Fjellsdalen Kunstgress
                    </span>
                  </div>
                )}

                <div className="p-4 space-y-3">
                  
                  {/* Division & Round Meta */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1.5 text-slate-600 font-medium">
                      <span className="font-bold text-blue-900">{match.teamName}</span>
                      <span>•</span>
                      <span className="text-slate-500">{match.division}</span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-[11px]">
                        {match.round}
                      </span>
                      {isLive && (
                        <span className="bg-red-600 text-white font-extrabold px-2 py-0.5 rounded text-[11px] flex items-center space-x-1 animate-pulse">
                          <Radio className="w-3 h-3" />
                          <span>LIVE {match.currentMinute}'</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Match Teams & Score */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                    
                    {/* Home Team */}
                    <div className="flex-1 text-center sm:text-left">
                      <p className={`font-bold text-sm sm:text-base ${
                        match.homeTeam.includes('Bønes') ? 'text-red-700' : 'text-slate-800'
                      }`}>
                        {match.homeTeam}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {match.homeTeam.includes('Bønes') ? 'Hjemmelag (Bønes)' : 'Hjemme'}
                      </p>
                    </div>

                    {/* Score or VS */}
                    <div className="px-4 py-1.5 text-center">
                      {match.status === 'upcoming' ? (
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-mono font-bold text-slate-400">VS</span>
                          <span className="text-[11px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded mt-0.5">
                            {match.time}
                          </span>
                        </div>
                      ) : (
                        <div className="bg-slate-900 text-white px-3 py-1 rounded-lg font-mono font-extrabold text-base tracking-wider shadow-inner">
                          {match.homeScore} - {match.awayScore}
                        </div>
                      )}
                    </div>

                    {/* Away Team */}
                    <div className="flex-1 text-center sm:text-right">
                      <p className={`font-bold text-sm sm:text-base ${
                        match.awayTeam.includes('Bønes') ? 'text-red-700' : 'text-slate-800'
                      }`}>
                        {match.awayTeam}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {match.awayTeam.includes('Bønes') ? 'Bortelag (Bønes)' : 'Borte'}
                      </p>
                    </div>

                  </div>

                  {/* Venue & Date Footer */}
                  <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 border-t border-slate-100">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-700">
                        {new Date(match.date).toLocaleDateString('no-NO', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short'
                        })}
                      </span>
                      <span>kl. {match.time}</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <MapPin className={`w-3.5 h-3.5 ${isHome ? 'text-red-600' : 'text-slate-400'}`} />
                      <span className={`font-medium ${isHome ? 'font-bold text-red-800' : 'text-slate-600'}`}>
                        {match.venue}
                      </span>
                    </div>
                  </div>

                  {/* Referee or events if available */}
                  {match.referee && (
                    <p className="text-[11px] text-slate-400 italic">
                      Dommer: {match.referee}
                    </p>
                  )}

                  {/* Match events summary if finished or live */}
                  {match.events && match.events.length > 0 && (
                    <div className="mt-2 bg-slate-100/70 p-2 rounded-lg text-xs space-y-1">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        Høydepunkter & Mål:
                      </p>
                      {match.events.slice(-3).map(ev => (
                        <div key={ev.id} className="flex items-start space-x-1.5 text-[11px] text-slate-700">
                          <span className="font-mono font-bold text-slate-900">{ev.minute}'</span>
                          <span>{ev.type === 'goal' ? '⚽' : ev.type === 'yellow_card' ? '🟨' : '🔄'}</span>
                          <span className="font-medium text-slate-800">{ev.player || ev.team}:</span>
                          <span className="text-slate-600">{ev.description}</span>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
