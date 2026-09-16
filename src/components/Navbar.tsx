import React from 'react';
import { RefreshCw, Radio, Shield, Sparkles, Activity } from 'lucide-react';
import { ScannerState } from '../types.js';

interface NavbarProps {
  scanner: ScannerState;
  onManualScan: () => void;
  isScanning: boolean;
  onOpenAiModal: () => void;
  onOpenScannerDrawer: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  scanner,
  onManualScan,
  isScanning,
  onOpenAiModal,
  onOpenScannerDrawer
}) => {
  return (
    <header id="app-header" className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-lg backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div id="club-badge" className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-red-600 to-blue-900 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center border border-white/20">
                <Shield className="w-6 h-6 text-red-500 fill-red-500/20" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
                  BØNES IL
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 hidden sm:inline-block">
                  FOTBALL
                </span>
                <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 text-xs font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="hidden md:inline">LIVE MOTOR</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Offisiell NFF & fotball.no sanntidssporing for alle lag
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

            {/* Manual Scan Button */}
            <button
              id="btn-manual-scan"
              onClick={onManualScan}
              disabled={isScanning}
              className={`flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                isScanning
                  ? 'bg-blue-800 text-blue-200 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-md hover:shadow-red-600/30'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Skanner...' : 'Skann nå'}</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
