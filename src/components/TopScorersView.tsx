import React, { useState } from 'react';
import { TopScorer, TeamInfo } from '../types.js';
import { Flame, Award, Crosshair, Target, ChevronDown } from 'lucide-react';

interface TopScorersViewProps {
  topScorers: TopScorer[];
  teams: TeamInfo[];
  selectedTeamId: string;
}

export const TopScorersView: React.FC<TopScorersViewProps> = ({
  topScorers,
  teams,
  selectedTeamId
}) => {
  const [localTeamFilter, setLocalTeamFilter] = useState<string>(selectedTeamId);

  // Sync if selectedTeamId changes from parent
  const activeTeamFilter = selectedTeamId !== 'all' ? selectedTeamId : localTeamFilter;

  const filteredScorers = topScorers
    .filter((s) => activeTeamFilter === 'all' || s.teamId === activeTeamFilter)
    .sort((a, b) => b.goals - a.goals);

  const clubTopScorer = topScorers[0];

  return (
    <div id="topscorers-view-container" className="space-y-4">
      
      {/* Top 3 Featured Podiums (if viewing all or enough scorers) */}
      {filteredScorers.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {filteredScorers.slice(0, 3).map((scorer, idx) => {
            const isLeader = idx === 0;
            return (
              <div
                key={scorer.id}
                id={`scorer-podium-${scorer.id}`}
                className={`p-4 rounded-xl border relative overflow-hidden flex flex-col justify-between ${
                  isLeader
                    ? 'bg-gradient-to-br from-amber-500/10 via-amber-100/30 to-white border-amber-300 ring-2 ring-amber-400/40 shadow-sm'
                    : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                {/* Badge */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                      idx === 0
                        ? 'bg-amber-400 text-slate-900 shadow-xs'
                        : idx === 1
                        ? 'bg-slate-300 text-slate-800'
                        : 'bg-amber-700/20 text-amber-900'
                    }`}
                  >
                    <span>#{idx + 1}</span>
                    {idx === 0 && <Award className="w-3 h-3 text-slate-900 ml-0.5" />}
                  </span>

                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {scorer.teamName}
                  </span>
                </div>

                <div className="my-3">
                  <h4 className="font-extrabold text-slate-900 text-base leading-tight">
                    {scorer.name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1">
                    <Target className="w-3 h-3 text-red-500" />
                    <span>{scorer.matches} kamper spilt</span>
                    <span>•</span>
                    <span>{scorer.goalsPerMatch.toFixed(2)} mål/kamp</span>
                  </p>
                </div>

                {/* Big Goal Display */}
                <div className="flex items-baseline justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500">Mål totalt:</span>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-2xl sm:text-3xl font-mono font-black text-red-700">
                      {scorer.goals}
                    </span>
                    <span className="text-xs font-bold text-slate-600">mål</span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Main Leaderboard Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        
        <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-red-400" />
              <h3 className="font-extrabold text-base tracking-tight">
                Toppscorerliste for Bønes IL
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Registrerte mål i offisielle NFF-kamper for alle avdelinger
            </p>
          </div>

          {/* Quick filter within scorers if on all teams */}
          {selectedTeamId === 'all' && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400">Filtrer lag:</span>
              <select
                id="select-scorer-team-filter"
                value={localTeamFilter}
                onChange={(e) => setLocalTeamFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Alle lag</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.shortName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-100 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th scope="col" className="py-3 px-4 text-center w-12">#</th>
                <th scope="col" className="py-3 px-4">Spiller</th>
                <th scope="col" className="py-3 px-3">Lag / Avdeling</th>
                <th scope="col" className="py-3 px-3 text-center">Kamper</th>
                <th scope="col" className="py-3 px-3 text-center hidden sm:table-cell">Straffer</th>
                <th scope="col" className="py-3 px-3 text-center hidden md:table-cell">Snitt/kamp</th>
                <th scope="col" className="py-3 px-4 text-center font-extrabold text-slate-900">Mål</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredScorers.map((scorer, index) => {
                const isLeader = index === 0;

                return (
                  <tr
                    key={scorer.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      isLeader ? 'bg-amber-50/40 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold font-mono ${
                          index === 0
                            ? 'bg-amber-400 text-slate-900'
                            : index === 1
                            ? 'bg-slate-300 text-slate-800'
                            : index === 2
                            ? 'bg-amber-700/20 text-amber-900'
                            : 'text-slate-500'
                        }`}
                      >
                        {index + 1}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {scorer.name}
                        </span>
                        {isLeader && (
                          <span className="text-[10px] bg-amber-200 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded font-extrabold">
                            Gullstøvel
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="inline-block bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded text-xs font-semibold">
                        {scorer.teamName}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center font-mono">
                      {scorer.matches}
                    </td>

                    <td className="py-3 px-3 text-center font-mono text-slate-500 hidden sm:table-cell">
                      {scorer.penalties > 0 ? scorer.penalties : '-'}
                    </td>

                    <td className="py-3 px-3 text-center font-mono text-slate-600 hidden md:table-cell">
                      {scorer.goalsPerMatch.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-3 py-1 rounded-lg bg-red-600 text-white font-mono font-extrabold text-sm shadow-xs">
                        {scorer.goals}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
