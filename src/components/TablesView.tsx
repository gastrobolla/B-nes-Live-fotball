import React, { useState, useEffect } from 'react';
import { DivisionTable, TeamInfo } from '../types.js';
import { Trophy, ArrowUpRight, TrendingUp, ExternalLink, Shield } from 'lucide-react';

interface TablesViewProps {
  tables: Record<string, DivisionTable>;
  teams: TeamInfo[];
  selectedTeamId: string;
  onSelectTeam: (teamId: string) => void;
}

export const TablesView: React.FC<TablesViewProps> = ({
  tables,
  teams,
  selectedTeamId,
  onSelectTeam
}) => {
  // If a specific team is selected (not 'all'), focus on that team's division; otherwise default to first team in list
  const [activeDivisionKey, setActiveDivisionKey] = useState<string>(
    selectedTeamId !== 'all' && tables[selectedTeamId] ? selectedTeamId : (teams[0]?.id || 'g13-1')
  );

  useEffect(() => {
    if (selectedTeamId !== 'all' && tables[selectedTeamId]) {
      setActiveDivisionKey(selectedTeamId);
    }
  }, [selectedTeamId, tables]);

  const activeTable = tables[activeDivisionKey] || tables['menn-1'] || Object.values(tables)[0];
  const activeTeamInfo = teams.find(t => t.id === activeDivisionKey);

  return (
    <div id="tables-view-container" className="space-y-4">
      
      {/* Division Selector Tabs */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
          Velg avdeling / serie:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {teams.map((team) => {
            const isActive = activeDivisionKey === team.id;
            return (
              <button
                key={team.id}
                id={`tab-division-${team.id}`}
                onClick={() => {
                  setActiveDivisionKey(team.id);
                  if (selectedTeamId !== 'all' && selectedTeamId !== team.id) {
                    onSelectTeam(team.id);
                  }
                }}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-900 text-white shadow-sm ring-1 ring-blue-800'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{team.shortName}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    isActive ? 'bg-blue-800 text-blue-200' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  #{team.currentRank}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Table Card */}
      {activeTable && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          
          {/* Table Header */}
          <div className="p-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                  {activeTable.divisionName}
                </h3>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Sesong {activeTable.season} • NFF Hordaland • Offisiell tabell
              </p>
            </div>

            {activeTeamInfo && (
              <div className="flex items-center space-x-2 text-xs bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-lg self-start sm:self-auto">
                <span className="text-slate-400">Bønes plassering:</span>
                <span className="font-bold text-amber-400 font-mono text-sm">
                  #{activeTeamInfo.currentRank}
                </span>
                <span className="text-slate-400">av {activeTable.rows.length} lag</span>
              </div>
            )}
          </div>

          {/* Table Data */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-100/80 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th scope="col" className="py-3 px-3 sm:px-4 text-center w-10">#</th>
                  <th scope="col" className="py-3 px-3 sm:px-4">Lag</th>
                  <th scope="col" className="py-3 px-2 sm:px-3 text-center">K</th>
                  <th scope="col" className="py-3 px-2 sm:px-3 text-center hidden sm:table-cell">V</th>
                  <th scope="col" className="py-3 px-2 sm:px-3 text-center hidden sm:table-cell">U</th>
                  <th scope="col" className="py-3 px-2 sm:px-3 text-center hidden sm:table-cell">T</th>
                  <th scope="col" className="py-3 px-2 sm:px-3 text-center hidden md:table-cell">Mål</th>
                  <th scope="col" className="py-3 px-2 sm:px-3 text-center">MF</th>
                  <th scope="col" className="py-3 px-3 sm:px-4 text-center font-extrabold text-slate-900">P</th>
                  <th scope="col" className="py-3 px-3 sm:px-4 text-center hidden lg:table-cell">Form</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {activeTable.rows.map((row) => {
                  const isBones = row.isBones;

                  return (
                    <tr
                      key={row.teamName}
                      className={`transition-colors ${
                        isBones
                          ? 'bg-red-50/80 hover:bg-red-100/70 font-bold border-y-2 border-red-400 text-slate-900'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3 px-3 sm:px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold font-mono ${
                            row.rank === 1
                              ? 'bg-amber-400 text-slate-900 shadow-xs'
                              : row.rank <= 2
                              ? 'bg-blue-100 text-blue-900'
                              : isBones
                              ? 'bg-red-600 text-white'
                              : 'text-slate-500'
                          }`}
                        >
                          {row.rank}
                        </span>
                      </td>

                      {/* Team Name */}
                      <td className="py-3 px-3 sm:px-4">
                        <div className="flex items-center space-x-2">
                          {isBones ? (
                            <div className="flex items-center space-x-1.5">
                              <Shield className="w-4 h-4 text-red-600 fill-red-600/20 shrink-0" />
                              <span className="font-extrabold text-red-900 text-sm tracking-tight">
                                {row.teamName}
                              </span>
                              <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.2 rounded font-bold uppercase">
                                Vårt lag
                              </span>
                            </div>
                          ) : (
                            <span className="font-semibold text-slate-800">
                              {row.teamName}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Played */}
                      <td className="py-3 px-2 sm:px-3 text-center font-mono">{row.played}</td>

                      {/* Won */}
                      <td className="py-3 px-2 sm:px-3 text-center font-mono text-emerald-700 hidden sm:table-cell">
                        {row.won}
                      </td>

                      {/* Drawn */}
                      <td className="py-3 px-2 sm:px-3 text-center font-mono text-amber-700 hidden sm:table-cell">
                        {row.drawn}
                      </td>

                      {/* Lost */}
                      <td className="py-3 px-2 sm:px-3 text-center font-mono text-red-700 hidden sm:table-cell">
                        {row.lost}
                      </td>

                      {/* Goals */}
                      <td className="py-3 px-2 sm:px-3 text-center font-mono text-slate-500 hidden md:table-cell">
                        {row.goalsFor} - {row.goalsAgainst}
                      </td>

                      {/* Goal Difference */}
                      <td className="py-3 px-2 sm:px-3 text-center font-mono">
                        <span className={row.goalDiff > 0 ? 'text-emerald-700 font-bold' : row.goalDiff < 0 ? 'text-red-600' : 'text-slate-500'}>
                          {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                        </span>
                      </td>

                      {/* Points */}
                      <td className="py-3 px-3 sm:px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded font-mono font-extrabold text-sm ${
                          isBones ? 'bg-red-600 text-white' : 'text-slate-900'
                        }`}>
                          {row.points}
                        </span>
                      </td>

                      {/* Form Guide */}
                      <td className="py-3 px-3 sm:px-4 text-center hidden lg:table-cell">
                        <div className="flex items-center justify-center space-x-1">
                          {row.form.map((res, i) => (
                            <span
                              key={i}
                              className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white ${
                                res === 'W'
                                  ? 'bg-emerald-600'
                                  : res === 'D'
                                  ? 'bg-amber-500'
                                  : 'bg-red-600'
                              }`}
                              title={res === 'W' ? 'Seier' : res === 'D' ? 'Uavgjort' : 'Tap'}
                            >
                              {res === 'W' ? 'S' : res === 'D' ? 'U' : 'T'}
                            </span>
                          ))}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                <span>Opprykksplass</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span>
                <span>Bønes IL uthevet</span>
              </span>
            </div>

            <div className="flex items-center space-x-1 text-slate-400">
              <span>Sist oppdatert fra NFF:</span>
              <span className="font-mono text-slate-600">
                {new Date(activeTable.updatedAt).toLocaleTimeString('no-NO')}
              </span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
