import React from 'react';
import { RefreshCw, Radio, Shield, Sparkles, Activity } from 'lucide-react';
import { ScannerState } from '../types.js';

interface NavbarProps {
  scanner: ScannerState;
  onSyncNff: () => void;
  isSyncing: boolean;
  onOpenAiModal: () => void;
  onOpenScannerDrawer: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  scanner,
  onSyncNff,
  isSyncing,
  onOpenAiModal,
  onOpenScannerDrawer
}) => {
  return (
    <header id="app-header" className="sticky top-0 z-40 bg-[#0B2545] border-b border-[#165094]/60 text-white shadow-lg backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div id="club-badge" className="relative flex-shrink-0 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-white p-0.5 shadow-md border-2 border-[#165094] overflow-hidden flex items-center justify-center">
              <img
                src="/bones-logo.svg"
                alt="Bønes IL Klubblogo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/bones-logo.png';
                }}
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
                  BØNES IL
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#165094] text-blue-100 border border-blue-400/40 hidden sm:inline-block">
                  FOTBALL
                </span>
                <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/60 text-emerald-400 text-xs font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="hidden md:inline">LIVE NFF-MOTOR</span>
                </div>
              </div>
              <p className="text-xs text-blue-200/70 hidden sm:block">
                Offisiell NFF & fotball.no sanntidssporing for alle 16 Bønes-lag
              </p>
            </div>
          </div>

          {/* Quick Actions & Live Scanner Status */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Scanner Info Pill */}
            <button
              id="btn-open-scanner-drawer"
              onClick={onOpenScannerDrawer}
              className="flex items-center space-x-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs transition-colors"
              title="Vis kildestatus og skannerlogger"
            >
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden lg:inline text-slate-400">Neste skann:</span>
              <span className="font-mono font-bold text-blue-300">{scanner.nextScanSeconds}s</span>
            </button>

            {/* AI Assistant Insight */}
            <button
              id="btn-ai-analysis"
              onClick={onOpenAiModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-medium shadow-sm transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">AI-rapport</span>
            </button>

            {/* Unified NFF Sync & Scan Button */}
            <button
              id="btn-manual-scan"
              onClick={onSyncNff}
              disabled={isSyncing}
              className={`flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                isSyncing
                  ? 'bg-blue-900 text-blue-200 cursor-not-allowed border border-blue-700'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-md hover:shadow-red-600/30'
              }`}
              title="Fullstendig NFF-oppdatering: synkroniserer og skanner alle 16 Bønes-lag, tabeller, mål og kort"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Oppdaterer NFF...' : 'Oppdater fra NFF'}</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
