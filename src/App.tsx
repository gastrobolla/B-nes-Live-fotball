import React, { useState, useEffect, useMemo } from 'react';
import { BonesClubData, Match } from './types.js';
import { Navbar } from './components/Navbar.js';
import { LiveTickerBanner } from './components/LiveTickerBanner.js';
import { TeamSelector } from './components/TeamSelector.js';
import { MatchesView } from './components/MatchesView.js';
import { TablesView } from './components/TablesView.js';
import { TopScorersView } from './components/TopScorersView.js';
import { CardsView } from './components/CardsView.js';
import { LiveFeedView } from './components/LiveFeedView.js';
import { NffHubView } from './components/NffHubView.js';
import { ScannerStatusDrawer } from './components/ScannerStatusDrawer.js';
import { AiAnalysisModal } from './components/AiAnalysisModal.js';
import { PlayerHistoryModal } from './components/PlayerHistoryModal.js';
import { buildPlayerProfile } from './utils/playerHistory.js';
import {
  Calendar,
  Trophy,
  Flame,
  Scale,
  Shield,
  Home,
  CheckCircle2,
  AlertTriangle,
  Radio,
  RefreshCw,
  ExternalLink,
  MapPin,
  Clock,
  Activity,
  Database
} from 'lucide-react';

export default function App() {
  const [data, setData] = useState<BonesClubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'feed' | 'matches' | 'tables' | 'scorers' | 'cards' | 'nff'>('feed');
  const [isScannerDrawerOpen, setIsScannerDrawerOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isRealScraping, setIsRealScraping] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Player history modal state
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);
  const [selectedPlayerTeamId, setSelectedPlayerTeamId] = useState<string | undefined>(undefined);

  const activePlayerProfile = useMemo(() => {
    if (!selectedPlayerName || !data) return null;
    return buildPlayerProfile(selectedPlayerName, selectedPlayerTeamId, data);
  }, [selectedPlayerName, selectedPlayerTeamId, data]);

  const handleSelectPlayer = (playerName: string, teamId?: string) => {
    setSelectedPlayerName(playerName);
    setSelectedPlayerTeamId(teamId);
  };

  // Show temporary toast message
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Fetch full data from backend
  const fetchData = async () => {
    try {
      const res = await fetch('/api/bones/data');
      if (res.ok) {
        const json: BonesClubData = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch Bønes club data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger on-demand real scrape from fotball.no and bonesil.no
  const handleRealScrape = async () => {
    setIsRealScraping(true);
    try {
      const res = await fetch('/api/bones/scrape-real', { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        setData(result.data);
        showToast('Fersk scraping fullført! Alle 16 Bønes-lag, tabeller og kamper er lagret til databasen.');
      } else {
        showToast('Kunne ikke fullføre scraping akkurat nå.');
      }
    } catch (err) {
      showToast('Nettverksfeil under scraping.');
    } finally {
      setIsRealScraping(false);
    }
  };

  // Trigger manual scan
  const handleManualScan = async () => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/bones/scan', { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        setData(result.data);
        showToast('NFF-kontroll fullført! Resultater og tabeller er oppdatert.');
      }
    } catch (err) {
      showToast('Kunne ikke fullføre manuell skanning akkurat nå.');
    } finally {
      setIsScanning(false);
    }
  };

  // Toggle auto-scan
  const handleToggleAutoScan = async () => {
    try {
      const res = await fetch('/api/bones/scanner-toggle', { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        fetchData();
        showToast(`Autoskanner satt til ${result.autoScanEnabled ? 'PÅ' : 'AV'}.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Adaptive smart polling: avoids pulling full database every 4 seconds
  useEffect(() => {
    fetchData();

    let lastKnownVersion = 0;

    const checkInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/bones/data/check');
        if (res.ok) {
          const check = await res.json();
          // If data version increased or active match window is ongoing, pull full data
          if (check.dataVersion !== lastKnownVersion || check.activeMatchWindow) {
            lastKnownVersion = check.dataVersion;
            fetchData();
          }
        }
      } catch (err) {
        // Fallback fetch every 30s
        fetchData();
      }
    }, 15000); // Check every 15s instead of heavy pull every 4s

    return () => clearInterval(checkInterval);
  }, []);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-blue-900 flex items-center justify-center animate-pulse">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold tracking-tight">Bønes IL Fotball Live</h2>
          <p className="text-xs text-slate-400 mt-1">Laster persistent klubbdatabase for alle 16 lag...</p>
        </div>
        <RefreshCw className="w-5 h-5 text-red-500 animate-spin" />
      </div>
    );
  }

  // Ongoing live match
  const liveMatch = data.matches.find(m => m.status === 'live');
  const clubTopScorer = data.topScorers[0];
  const mostCarded = data.cards[0];
  const upcomingHomeCount = data.matches.filter(m => m.isHome && m.status !== 'finished').length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Bar */}
      <Navbar
        scanner={data.scanner}
        onSyncNff={handleRealScrape}
        isSyncing={isRealScraping || isScanning}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onOpenScannerDrawer={() => setIsScannerDrawerOpen(true)}
      />

      {/* Live Match Ticker Banner (Always visible if live match is active) */}
      <LiveTickerBanner liveMatch={liveMatch} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Real Data & Persistent Database Status Banner */}
        <section id="real-data-scraper-banner" className="bg-gradient-to-r from-[#0B2545] via-[#103867] to-[#165094] border border-[#165094]/60 rounded-2xl p-4 sm:p-5 text-white shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="relative flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white p-0.5 shadow-md border-2 border-white/80 overflow-hidden flex items-center justify-center">
                <img
                  src="/bones-logo.svg"
                  alt="Bønes IL"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/bones-logo.png';
                  }}
                />
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#3E8A37] text-white text-[11px] font-black uppercase tracking-wider shadow-2xs">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse"></span>
                    <span>Persistent Database</span>
                  </span>
                  <span className="text-xs text-blue-100 font-bold bg-[#165094]/80 px-2.5 py-0.5 rounded-full border border-blue-400/30">
                    Bønes IL • Stiftet 1995
                  </span>
                  <span className="text-[11px] text-blue-200/90 font-medium">
                    {data.activeMatchWindow ? (
                      <strong className="text-emerald-300">🟢 Aktivt kampvindu (skanning hvert minutt)</strong>
                    ) : (
                      <span>Rolig modus (neste NFF-sjekk kl. 06:00)</span>
                    )}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                  Sanntidssenter for alle 16 lag i Bønes Idrettslag
                </h3>
                <p className="text-xs text-blue-100/80 leading-relaxed max-w-3xl">
                  Ekte kilder med faste kamp-ID-er. Ingen oppdiktede simuleringer. Sist NFF-synkronisert: <strong className="text-emerald-300 font-mono">{data.lastRealScraped || 'Synkronisert'}</strong>. Lagret til disk: <strong className="text-blue-200 font-mono">{data.lastDiskSaved ? new Date(data.lastDiskSaved).toLocaleTimeString('no-NO') : 'OK'}</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
              <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-blue-100">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>NFF fotball.no synkronisert</span>
              </div>
            </div>
          </div>
        </section>

        {/* Club Quick Metric Summary */}
        <section id="club-summary-cards" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Card 1: Active Teams */}
          <div
            id="summary-card-teams"
            className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Aktive lag
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-mono font-black text-slate-900 mt-2">
              {data.teams.length}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Senior, Ungdom & Junior i NFF
            </p>
          </div>

          {/* Card 2: Upcoming Home Matches Highlight */}
          <div
            id="summary-card-home-matches"
            onClick={() => setActiveTab('matches')}
            className="bg-gradient-to-br from-[#165094] to-[#0F3A6D] p-3.5 sm:p-4 rounded-xl text-white shadow-sm hover:shadow-md cursor-pointer transition-all relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-blue-100 uppercase tracking-wider flex items-center space-x-1">
                <Home className="w-3.5 h-3.5 text-emerald-300 mr-1" />
                Hjemmekamper
              </span>
              <span className="text-[10px] bg-[#3E8A37] text-white px-2 py-0.5 rounded-full font-bold">
                Bønesbanen
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-mono font-black text-white mt-2">
              {upcomingHomeCount}
            </p>
            <p className="text-[11px] text-blue-100 mt-0.5 flex items-center space-x-1">
              <span>Klikk for å se alle oppgjør</span>
            </p>
          </div>

          {/* Card 3: Top Scorer Overall */}
          <div
            id="summary-card-topscorer"
            onClick={() => setActiveTab('scorers')}
            className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs hover:border-[#165094]/40 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Klubbtoppscorer
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <p className="text-sm sm:text-base font-extrabold text-slate-900 truncate max-w-[130px] sm:max-w-none">
                  {clubTopScorer?.name || 'Ingen'}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {clubTopScorer?.teamName}
                </p>
              </div>
              <span className="text-xl sm:text-2xl font-mono font-black text-[#165094] ml-2">
                {clubTopScorer?.goals} mål
              </span>
            </div>
          </div>

          {/* Card 4: Most Cards & Disciplinary */}
          <div
            id="summary-card-cards"
            onClick={() => setActiveTab('cards')}
            className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs hover:border-[#165094]/40 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Kort & Disiplinær
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Scale className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <p className="text-sm sm:text-base font-extrabold text-slate-900 truncate max-w-[130px] sm:max-w-none">
                  {mostCarded?.name || 'Ingen'}
                </p>
                <p className="text-[11px] text-[#165094] font-bold truncate">
                  {mostCarded?.status}
                </p>
              </div>
              <span className="text-xl sm:text-2xl font-mono font-black text-amber-600 ml-2">
                {mostCarded?.yellowCards}🟨 {mostCarded?.redCards > 0 ? `${mostCarded?.redCards}🟥` : ''}
              </span>
            </div>
          </div>

        </section>

        {/* Team Selector Pills */}
        <section id="team-selector-section" className="bg-white p-3.5 rounded-xl border border-[#165094]/20 shadow-xs">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-extrabold text-[#165094] uppercase tracking-wider">
                Velg lag i Bønes IL:
              </h3>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                (Inndelt i Gutter & Herrer og Jenter & Damer)
              </span>
            </div>
            {selectedTeamId !== 'all' && (
              <button
                onClick={() => setSelectedTeamId('all')}
                className="text-xs text-[#165094] hover:text-[#0F3A6D] font-bold"
              >
                Nullstill filter (vis alle)
              </button>
            )}
          </div>
          <TeamSelector
            teams={data.teams}
            selectedTeamId={selectedTeamId}
            onSelectTeam={(id) => setSelectedTeamId(id)}
          />
        </section>

        {/* Navigation Tabs */}
        <section id="navigation-tabs" className="border-b border-slate-200 pb-2">
          <div className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto scrollbar-none">
            
            {/* Tab: Live Feed */}
            <button
              id="main-tab-feed"
              onClick={() => setActiveTab('feed')}
              className={`flex items-center space-x-2 py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'feed'
                  ? 'bg-[#165094] text-white shadow-sm ring-1 ring-[#165094]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <div className="relative">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute inset-0"></span>
                <span className="w-2 h-2 rounded-full bg-emerald-300 relative inline-block"></span>
              </div>
              <span>Sanntids Live-Feed</span>
              <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'feed' ? 'bg-[#0F3A6D] text-white' : 'bg-blue-100 text-[#165094]'
              }`}>
                {data.feed?.length || 0}
              </span>
            </button>

            {/* Tab: Matches */}
            <button
              id="main-tab-matches"
              onClick={() => setActiveTab('matches')}
              className={`flex items-center space-x-2 py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'matches'
                  ? 'bg-[#165094] text-white shadow-sm ring-1 ring-[#165094]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Framtidige kamper & Resultater</span>
              <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'matches' ? 'bg-[#0F3A6D] text-white' : 'bg-blue-100 text-[#165094]'
              }`}>
                {data.matches.length}
              </span>
            </button>

            {/* Tab: Tables */}
            <button
              id="main-tab-tables"
              onClick={() => setActiveTab('tables')}
              className={`flex items-center space-x-2 py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'tables'
                  ? 'bg-[#165094] text-white shadow-sm ring-1 ring-[#165094]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Tabellplasseringer ({Object.keys(data.tables).length} serier)</span>
            </button>

            {/* Tab: Top Scorers */}
            <button
              id="main-tab-scorers"
              onClick={() => setActiveTab('scorers')}
              className={`flex items-center space-x-2 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs ${
                activeTab === 'scorers'
                  ? 'bg-gradient-to-r from-[#165094] to-[#1e3a8a] text-white shadow-md ring-2 ring-amber-400/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Flame className={`w-4 h-4 ${activeTab === 'scorers' ? 'text-amber-300 animate-pulse' : 'text-amber-500'}`} />
              <span>Toppscorere</span>
              <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                activeTab === 'scorers' ? 'bg-amber-400 text-slate-900' : 'bg-slate-200 text-slate-700'
              }`}>
                {data.topScorers.length}
              </span>
            </button>

            {/* Tab: Cards */}
            <button
              id="main-tab-cards"
              onClick={() => setActiveTab('cards')}
              className={`flex items-center space-x-2 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs ${
                activeTab === 'cards'
                  ? 'bg-gradient-to-r from-[#165094] to-[#0F3A6D] text-white shadow-md ring-2 ring-yellow-400/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Scale className={`w-4 h-4 ${activeTab === 'cards' ? 'text-yellow-300' : 'text-amber-500'}`} />
              <span>Mest kort & Disiplinær</span>
              <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                activeTab === 'cards' ? 'bg-yellow-400 text-slate-900' : 'bg-slate-200 text-slate-700'
              }`}>
                {data.cards.length}
              </span>
            </button>

            {/* Tab: Offisiell NFF & MinFotball (Alternativ 3) */}
            <button
              id="main-tab-nff"
              onClick={() => setActiveTab('nff')}
              className={`flex items-center space-x-2 py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'nff'
                  ? 'bg-[#3E8A37] text-white shadow-sm ring-1 ring-[#3E8A37]'
                  : 'text-[#165094] hover:text-[#0F3A6D] hover:bg-blue-50/80'
              }`}
            >
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Offisiell NFF & MinFotball</span>
              <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'nff' ? 'bg-[#2E6C29] text-white' : 'bg-blue-100 text-[#165094]'
              }`}>
                Alt. 3
              </span>
            </button>

          </div>
        </section>

        {/* View Panes */}
        {activeTab === 'feed' && (
          <LiveFeedView
            feed={data.feed || []}
            selectedTeamId={selectedTeamId}
            onManualScan={handleManualScan}
            isScanning={isScanning}
            scanner={data.scanner}
          />
        )}

        {activeTab === 'matches' && (
          <MatchesView
            matches={data.matches}
            selectedTeamId={selectedTeamId}
            onSyncComplete={fetchData}
            onSelectPlayer={handleSelectPlayer}
            onMatchUpdated={(updatedMatch) => {
              setData(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  matches: prev.matches.map(m => m.id === updatedMatch.id ? updatedMatch : m)
                };
              });
            }}
          />
        )}

        {activeTab === 'tables' && (
          <TablesView
            tables={data.tables}
            teams={data.teams}
            selectedTeamId={selectedTeamId}
            onSelectTeam={(id) => setSelectedTeamId(id)}
          />
        )}

        {activeTab === 'scorers' && (
          <TopScorersView
            topScorers={data.topScorers}
            teams={data.teams}
            selectedTeamId={selectedTeamId}
            onSelectPlayer={handleSelectPlayer}
          />
        )}

        {activeTab === 'cards' && (
          <CardsView
            cards={data.cards}
            teams={data.teams}
            selectedTeamId={selectedTeamId}
            onSelectPlayer={handleSelectPlayer}
          />
        )}

        {activeTab === 'nff' && (
          <NffHubView
            teams={data.teams}
            selectedTeamId={selectedTeamId}
            onSelectTeam={(id) => setSelectedTeamId(id)}
            onRealScrape={handleRealScrape}
            isRealScraping={isRealScraping}
            lastRealScraped={data.lastRealScraped}
            dailyScrapeSchedule={data.dailyScrapeSchedule}
          />
        )}

      </main>

      {/* Footer */}
      <footer id="app-footer" className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-red-500" />
            <span className="font-bold text-white">Bønes Idrettslag Fotball</span>
            <span>•</span>
            <span>Hjemmebane: Bønesbanen Kunstgress (Fjellsdalen)</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px]">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping"></span>
              <span>Sanntidsskanner operativ</span>
            </span>
            <span>Kilder: fotball.no & NFF Hordaland</span>
          </div>
        </div>
      </footer>

      {/* Scanner Status Drawer */}
      <ScannerStatusDrawer
        isOpen={isScannerDrawerOpen}
        onClose={() => setIsScannerDrawerOpen(false)}
        scanner={data.scanner}
        onManualScan={handleManualScan}
        isScanning={isScanning}
        onToggleAutoScan={handleToggleAutoScan}
      />

      {/* AI Analysis Modal */}
      <AiAnalysisModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />

      {/* Player History Modal */}
      {activePlayerProfile && (
        <PlayerHistoryModal
          player={activePlayerProfile}
          onClose={() => setSelectedPlayerName(null)}
        />
      )}

    </div>
  );
}
