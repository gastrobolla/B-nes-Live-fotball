import React from 'react';
import { TeamInfo } from '../types.js';

interface TeamSelectorProps {
  teams: TeamInfo[];
  selectedTeamId: string;
  onSelectTeam: (teamId: string) => void;
}

export const TeamSelector: React.FC<TeamSelectorProps> = ({
  teams,
  selectedTeamId,
  onSelectTeam
}) => {
  return (
    <div id="team-selector-container" className="overflow-x-auto py-2 scrollbar-none">
      <div className="flex items-center space-x-2 min-w-max pb-1">
        
        {/* All teams option */}
        <button
          id="team-pill-all"
          onClick={() => onSelectTeam('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
            selectedTeamId === 'all'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20 ring-2 ring-red-500/50'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-xs'
          }`}
        >
          Alle lag i klubben ({teams.length})
        </button>

        {/* Individual team pills */}
        {teams.map((team) => {
          const isSelected = selectedTeamId === team.id;
          return (
            <button
              key={team.id}
              id={`team-pill-${team.id}`}
              onClick={() => onSelectTeam(team.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-blue-900 text-white shadow-md shadow-blue-900/20 ring-2 ring-blue-700/50'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-xs'
              }`}
            >
              <span className="font-semibold">{team.shortName}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-blue-800 text-blue-200' : 'bg-slate-100 text-slate-500'
                }`}
              >
                #{team.currentRank}
              </span>
            </button>
          );
        })}

      </div>
    </div>
  );
};
