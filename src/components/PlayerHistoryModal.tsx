import React, { useState, useEffect } from 'react';
import { PlayerProfile } from '../types.js';
import {
  X,
  Trophy,
  Target,
  Flame,
  Calendar,
  AlertTriangle,
  Shield,
  TrendingUp,
  Award,
  CheckCircle,
  AlertOctagon,
  ChevronRight,
  Activity,
  ArrowUpRight,
  MapPin
} from 'lucide-react';

interface PlayerHistoryModalProps {
  player: PlayerProfile | null;
  onClose: () => void;
  onSelectTeam?: (teamId: string) => void;
}

export const PlayerHistoryModal: React.FC<PlayerHistoryModalProps> = ({
  player,
  onClose,
  onSelectTeam,
}) => {
  const [activeSeasonTab, setActiveSeasonTab] = useState<'all' | 'host' | 'var'>('all');

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!player) return null;

  const filteredLogs = player.matchHistory.filter((log) => {
    if (activeSeasonTab === 'host') return log.season === 'Høst';
    if (activeSeasonTab === 'var') return log.season === 'Vår';
    return true;
  });

  const isSuspended = player.cardStatus === 'Karantene';
  const isWarning = player.cardStatus.includes('Advarsel');

  // SVG sparkline coordinates for the form curve
  const ratings = [...player.matchHistory].reverse().map((m) => m.rating);
  const minRating = 5.0;
  const maxRating = 10.0;
  const svgWidth = 400;
  const svgHeight = 64;
  const paddingX = 16;
  const paddingY = 8;
  const availableWidth = svgWidth - paddingX * 2;
  const availableHeight = svgHeight - paddingY * 2;

  const points = ratings.map((r, idx) => {
    const x = paddingX + (idx / Math.max(1, ratings.length - 1)) * availableWidth;
    const y = paddingY + availableHeight - ((r - minRating) / (maxRating - minRating)) * availableHeight;
    return { x, y, rating: r };
  });

  const polylineStr = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div
      id="player-history-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="player-history-modal-card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          id="player-modal-header"
          className="relative bg-gradient-to-r from-slate-950 via-[#0B2545] to-slate-900 text-white p-5 sm:p-6 border-b border-slate-800 shrink-0"
        >
          {/* Close button */}
          <button
            id="btn-close-player-modal"
            onClick={onClose}
            aria-label="Lukk spillerprofil"
            className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-full p-1.5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-8">
            <div className="flex items-start sm:items-center space-x-3.5">
              {/* Jersey Number Badge */}
              <div className="relative shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-[#165094] to-[#0A2240] border-2 border-blue-400/40 shadow-inner flex flex-col items-center justify-center text-white">
                <span className="text-[10px] uppercase font-bold text-blue-300 tracking-wider">Drakt</span>
                <span className="text-xl font-black font-mono leading-none text-amber-300">
                  #{player.jerseyNumber}
                </span>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#3E8A37] text-white">
                    Bønes IL
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-900/60 text-blue-200 border border-blue-700/50">
                    {player.position}
                  </span>
                  {player.topScorerRank && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-amber-400 text-slate-950 flex items-center space-x-1">
                      <Trophy className="w-3 h-3 text-slate-950 inline mr-0.5" />
                      <span>#{player.topScorerRank} Toppscorer</span>
                    </span>
                  )}
                  {player.recentGoalStreak ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-red-500/20 text-red-300 border border-red-500/40 flex items-center space-x-0.5">
                      <Flame className="w-3 h-3 text-red-400 inline mr-0.5" />
                      <span>{player.recentGoalStreak} kamper på rad</span>
                    </span>
                  ) : null}
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                  {player.name}
                </h2>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 mt-0.5">
                  <span className="font-semibold text-blue-200">{player.teamName}</span>
                  <span>•</span>
                  <span>{player.division}</span>
                  {onSelectTeam && (
                    <button
                      onClick={() => {
                        onSelectTeam(player.teamId);
                        onClose();
                      }}
                      className="inline-flex items-center text-xs text-amber-300 hover:text-amber-200 underline font-semibold ml-1"
                    >
                      <span>Se lagets tabell</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Status Pill */}
            <div className="sm:text-right shrink-0">
              <span
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                  isSuspended
                    ? 'bg-red-600 text-white shadow-xs'
                    : isWarning
                    ? 'bg-amber-400 text-slate-950 font-extrabold shadow-xs'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {isSuspended ? (
                  <>
                    <AlertOctagon className="w-3.5 h-3.5" />
                    <span>Karantenestatus: Soner</span>
                  </>
                ) : isWarning ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Advarsel: 1 gult fra soning</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Disiplinær: Spilleklar</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          
          {/* Season Breakdown Cards: Vår vs Høst vs Totalt */}
          <section id="season-comparison-section" className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#165094]" />
                <span>Sesongstatistikk 2026: Vår vs. Høst</span>
              </h3>
              <span className="text-[11px] text-slate-400">Offisiell NFF Hordaland registrering</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              
              {/* Card 1: Vårsesongen 2026 */}
              <div
                id="season-card-spring"
                className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between hover:border-emerald-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md">
                      🌸 Vårsesong 2026
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">Fullført</span>
                  </div>

                  <div className="mt-3">
                    <p className="text-[11px] text-slate-500 uppercase font-semibold">Spilte kamper</p>
                    <div className="flex items-baseline space-x-1 mt-0.5">
                      <span className="text-2xl font-black font-mono text-slate-900">
                        {player.spring.matches}
                      </span>
                      <span className="text-xs font-bold text-slate-600">kamper</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-500 block">Mål i vår:</span>
                      <span className="font-extrabold text-red-600 font-mono text-sm">
                        {player.spring.goals} mål
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Snitt/kamp:</span>
                      <span className="font-bold text-slate-700 font-mono text-sm">
                        {player.spring.goalsPerMatch.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
                  <span>Kort vår:</span>
                  <span className="font-mono font-semibold">
                    🟨 {player.spring.yellowCards} &nbsp; 🟥 {player.spring.redCards}
                  </span>
                </div>
              </div>

              {/* Card 2: Høstsesongen 2026 */}
              <div
                id="season-card-autumn"
                className="bg-amber-50/40 border border-amber-200 rounded-xl p-3.5 flex flex-col justify-between ring-1 ring-amber-300/60"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-amber-900 bg-amber-200/80 border border-amber-300 px-2 py-0.5 rounded-md">
                      🍂 Høstsesong 2026
                    </span>
                    <span className="text-[11px] text-amber-800 font-bold">Aktiv nå</span>
                  </div>

                  <div className="mt-3">
                    <p className="text-[11px] text-slate-500 uppercase font-semibold">Spilte kamper</p>
                    <div className="flex items-baseline space-x-1 mt-0.5">
                      <span className="text-2xl font-black font-mono text-slate-900">
                        {player.autumn.matches}
                      </span>
                      <span className="text-xs font-bold text-slate-600">kamper</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-amber-200 text-xs">
                    <div>
                      <span className="text-slate-500 block">Mål i høst:</span>
                      <span className="font-extrabold text-red-600 font-mono text-sm">
                        {player.autumn.goals} mål
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Snitt/kamp:</span>
                      <span className="font-bold text-slate-700 font-mono text-sm">
                        {player.autumn.goalsPerMatch.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-amber-200 flex items-center justify-between text-[11px] text-slate-600">
                  <span>Kort høst:</span>
                  <span className="font-mono font-semibold">
                    🟨 {player.autumn.yellowCards} &nbsp; 🟥 {player.autumn.redCards}
                  </span>
                </div>
              </div>

              {/* Card 3: Totalt for sesongen 2026 */}
              <div
                id="season-card-total"
                className="bg-gradient-to-br from-[#0B2545] to-[#165094] text-white rounded-xl p-3.5 flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-white bg-white/20 border border-white/30 px-2 py-0.5 rounded-md">
                      ⚡ Samlet Sesong 2026
                    </span>
                    <span className="text-[11px] text-blue-200">Vår + Høst</span>
                  </div>

                  <div className="mt-3">
                    <p className="text-[11px] text-blue-200 uppercase font-semibold">Totalt spilte kamper</p>
                    <div className="flex items-baseline space-x-1 mt-0.5">
                      <span className="text-3xl font-black font-mono text-amber-300">
                        {player.total.matches}
                      </span>
                      <span className="text-xs font-bold text-blue-100">kamper</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/20 text-xs">
                    <div>
                      <span className="text-blue-200 block">Totalt mål:</span>
                      <span className="font-extrabold text-amber-300 font-mono text-sm">
                        {player.total.goals} mål
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-200 block">Totalt snitt:</span>
                      <span className="font-bold text-white font-mono text-sm">
                        {player.total.goalsPerMatch.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-white/20 flex items-center justify-between text-[11px] text-blue-200">
                  <span>Disiplinærpoeng:</span>
                  <span className="font-mono font-bold text-white">
                    {player.total.points} p ({player.total.yellowCards}G / {player.total.redCards}R)
                  </span>
                </div>
              </div>

            </div>
          </section>

          {/* Formkurve & Momentum */}
          <section id="player-form-curve-section" className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                  <TrendingUp className="w-4 h-4 text-[#165094]" />
                  <span>Formkurve & Kampinnsats</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Prestasjonsutvikling og kampbørs i offisielle NFF-oppgjør
                </p>
              </div>

              {/* Form Pills */}
              <div className="flex items-center space-x-1 self-start sm:self-auto">
                <span className="text-xs text-slate-500 mr-1.5 font-medium">Siste 5:</span>
                {player.formSummary.map((res, i) => (
                  <span
                    key={i}
                    className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-mono font-black ${
                      res === 'W'
                        ? 'bg-emerald-500 text-white'
                        : res === 'D'
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-red-500 text-white'
                    }`}
                    title={res === 'W' ? 'Seier' : res === 'D' ? 'Uavgjort' : 'Tap'}
                  >
                    {res}
                  </span>
                ))}
              </div>
            </div>

            {/* Visual Sparkline Graph */}
            {ratings.length > 1 && (
              <div className="bg-white rounded-lg p-3 border border-slate-200/80">
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <span>Formbørs (skala 5 - 10)</span>
                  <span className="font-semibold text-blue-900">
                    Snittvurdering: {(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)} / 10
                  </span>
                </div>

                <div className="w-full overflow-hidden">
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="w-full h-16 overflow-visible"
                  >
                    {/* Grid lines */}
                    <line
                      x1={paddingX}
                      y1={paddingY}
                      x2={svgWidth - paddingX}
                      y2={paddingY}
                      stroke="#e2e8f0"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1={paddingX}
                      y1={svgHeight / 2}
                      x2={svgWidth - paddingX}
                      y2={svgHeight / 2}
                      stroke="#e2e8f0"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1={paddingX}
                      y1={svgHeight - paddingY}
                      x2={svgWidth - paddingX}
                      y2={svgHeight - paddingY}
                      stroke="#e2e8f0"
                      strokeDasharray="3 3"
                    />

                    {/* Polyline */}
                    <polyline
                      fill="none"
                      stroke="#165094"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={polylineStr}
                    />

                    {/* Data Points */}
                    {points.map((p, idx) => (
                      <g key={idx}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={p.rating >= 8.5 ? 4.5 : 3.5}
                          className={p.rating >= 8.5 ? 'fill-amber-400 stroke-slate-900' : 'fill-blue-600 stroke-white'}
                          strokeWidth="1.5"
                        />
                      </g>
                    ))}
                  </svg>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                  <span>Tidligste kamp</span>
                  <span>Trend: {player.formTrend === 'rising' ? '↗ Stigende form' : player.formTrend === 'declining' ? '↘ Avtagende' : '➡️ Stabil innsats'}</span>
                  <span>Siste kamp</span>
                </div>
              </div>
            )}
          </section>

          {/* Detailed Match History Timeline */}
          <section id="player-match-log-section" className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                  <Activity className="w-4 h-4 text-[#165094]" />
                  <span>Kamp-for-kamp sesonglogg ({filteredLogs.length} kamper)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Offisielle kamper spilt for {player.teamName} i 2026
                </p>
              </div>

              {/* Season Filter Tabs */}
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto text-xs">
                <button
                  onClick={() => setActiveSeasonTab('all')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    activeSeasonTab === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Alle ({player.matchHistory.length})
                </button>
                <button
                  onClick={() => setActiveSeasonTab('host')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    activeSeasonTab === 'host'
                      ? 'bg-amber-100 text-amber-900 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🍂 Høst ({player.matchHistory.filter((m) => m.season === 'Høst').length})
                </button>
                <button
                  onClick={() => setActiveSeasonTab('var')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    activeSeasonTab === 'var'
                      ? 'bg-emerald-100 text-emerald-900 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🌸 Vår ({player.matchHistory.filter((m) => m.season === 'Vår').length})
                </button>
              </div>
            </div>

            {/* Match History Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Dato</th>
                      <th className="py-2.5 px-2">Sesong</th>
                      <th className="py-2.5 px-3">Motstander</th>
                      <th className="py-2.5 px-2 text-center">Res.</th>
                      <th className="py-2.5 px-3 text-center">Spillerbidrag</th>
                      <th className="py-2.5 px-2 text-center">Børs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-500">
                          {log.date}
                        </td>

                        <td className="py-2.5 px-2 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              log.season === 'Høst'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {log.season}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] px-1 py-0.2 rounded bg-slate-100 text-slate-500 font-mono">
                              {log.isHome ? 'H' : 'B'}
                            </span>
                            <span>{log.opponent}</span>
                          </div>
                        </td>

                        <td className="py-2.5 px-2 text-center font-mono whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold ${
                              log.result === 'W'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.result === 'D'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {log.score}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5 flex-wrap">
                            {log.goals > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-bold font-mono text-[11px]">
                                ⚽ {log.goals} {log.goals > 1 ? 'mål' : 'mål'}
                              </span>
                            )}
                            {log.yellowCard && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[11px]">
                                🟨 Gult
                              </span>
                            )}
                            {log.redCard && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-600 text-white font-bold text-[11px]">
                                🟥 Rødt
                              </span>
                            )}
                            {log.goals === 0 && !log.yellowCard && !log.redCard && (
                              <span className="text-slate-400 text-[11px]">{log.minutes} min</span>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-2 text-center font-mono font-bold">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] ${
                              log.rating >= 8.5
                                ? 'bg-amber-100 text-amber-900 font-extrabold'
                                : log.rating >= 7.5
                                ? 'bg-blue-50 text-blue-900'
                                : 'text-slate-600'
                            }`}
                          >
                            {log.rating.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center space-x-1.5">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Klubb: Bønes Idrettslag • Kilde: NFF fotball.no & FIKS</span>
          </div>

          <button
            id="btn-close-modal-bottom"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold transition-colors"
          >
            Lukk
          </button>
        </div>

      </div>
    </div>
  );
};
