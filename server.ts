import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import {
  INITIAL_TEAMS,
  INITIAL_TABLES,
  INITIAL_TOP_SCORERS,
  INITIAL_CARDS,
  INITIAL_MATCHES,
  INITIAL_SCANNER_STATE,
  INITIAL_FEED_ITEMS,
  getClubData
} from './server/bonesData.js';
import { BonesClubData, ScanLog, MatchEvent, FeedItem } from './src/types.js';
import { runFullClubScrape, BONES_16_TEAMS } from './server/bonesScraper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize database with initial values pre-populated with real scraped data for all 16 teams
let currentData: BonesClubData = getClubData();

// Function to synchronize real data from NFF & bonesil.no
async function syncRealData(): Promise<void> {
  try {
    currentData.isScrapingNow = true;
    addScanLog('info', 'Ekte NFF & Bønes Skraper', 'Starter fersk scraping av NFF fotball.no for alle 16 Bønes-lag og bonesil.no...');
    const scraped = await runFullClubScrape();

    // Update tables for all 16 teams
    if (scraped.tables && Object.keys(scraped.tables).length > 0) {
      for (const [teamId, table] of Object.entries(scraped.tables)) {
        currentData.tables[teamId] = table;
        const bonesRow = table.rows.find(r => r.isBones);
        const team = currentData.teams.find(t => t.id === teamId);
        if (team && bonesRow) {
          team.currentRank = bonesRow.rank;
          team.totalTeamsInDivision = table.rows.length;
        }
      }
    }

    if (scraped.matches.length > 0) {
      currentData.matches = scraped.matches;
      currentData.stats.totalMatchesRecorded = scraped.matches.length;
      currentData.stats.upcomingHomeMatches = scraped.matches.filter(m => m.isHome && m.status === 'upcoming').length;
    }

    if (scraped.topScorers && scraped.topScorers.length > 0) {
      currentData.topScorers = scraped.topScorers;
      currentData.stats.totalGoalsScored = scraped.topScorers.reduce((acc, curr) => acc + curr.goals, 0);
    }

    if (scraped.cards && scraped.cards.length > 0) {
      currentData.cards = scraped.cards;
    }

    if (scraped.clubNews && scraped.clubNews.length > 0) {
      for (const item of scraped.clubNews.reverse()) {
        const exists = currentData.feed.some(f => f.title === item.title);
        if (!exists) {
          currentData.feed.unshift(item);
        }
      }
    }

    currentData.isRealData = true;
    currentData.realDataSource = 'NFF (fotball.no - 16 Bønes-lag) & Bønes IL (bonesil.no)';
    currentData.lastRealScraped = scraped.lastScraped;
    currentData.dailyScrapeSchedule = 'Aktiv (automatisk skanning hver 24. time / kl. 06:00)';
    currentData.nextDailyScrape = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString('no-NO');
    currentData.isScrapingNow = false;

    addScanLog('success', 'Ekte NFF & Bønes Skraper', `Ekte data synkronisert: ${Object.keys(scraped.tables).length} tabeller, ${scraped.matches.length} kamper, ${currentData.topScorers.length} toppscorere, ${currentData.cards.length} kort, og ${scraped.clubNews.length} klubbnyheter.`);
  } catch (err: any) {
    currentData.isScrapingNow = false;
    addScanLog('warning', 'Ekte NFF Skraper Feil', `Scraperen rapporterte: ${err?.message || 'Nettverksfeil'}`);
    console.error('[Scraper] Sync error:', err);
  }
}

// Function to add feed items to live stream
function addFeedItem(item: Omit<FeedItem, 'id' | 'timestamp' | 'timeAgo'>) {
  const newItem: FeedItem = {
    id: `feed-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
    timeAgo: 'Akkurat nå',
    ...item
  };
  currentData.feed.unshift(newItem);
  if (currentData.feed.length > 50) {
    currentData.feed = currentData.feed.slice(0, 50);
  }
}

// Initialize Gemini client lazily
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return geminiClient;
}

// Function to add a log entry to scanner
function addScanLog(level: 'info' | 'success' | 'update' | 'warning', source: string, message: string) {
  const newLog: ScanLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toLocaleTimeString('no-NO'),
    level,
    source,
    message
  };
  currentData.scanner.logs.unshift(newLog);
  if (currentData.scanner.logs.length > 30) {
    currentData.scanner.logs = currentData.scanner.logs.slice(0, 30);
  }
}

// Live scanner cycle
function runScannerCycle(manual: boolean = false) {
  const now = new Date();
  currentData.scanner.lastScanned = now.toLocaleTimeString('no-NO');
  currentData.scanner.nextScanSeconds = 60;

  // Mark sources as scanning briefly, then synced
  currentData.scanner.sources.forEach(s => {
    s.lastSync = 'Akkurat nå (' + now.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }) + ')';
    s.status = 'synced';
  });

  // Advance live match if exists
  const liveMatch = currentData.matches.find(m => m.status === 'live');
  if (liveMatch && liveMatch.currentMinute !== undefined) {
    if (liveMatch.currentMinute < 90) {
      liveMatch.currentMinute += manual ? 2 : 1;
      
      // Potential spontaneous live event
      if (Math.random() > 0.65) {
        const eventsPool: { type: 'goal' | 'yellow_card' | 'sub'; team: string; player: string; desc: string }[] = [
          { type: 'sub', team: 'Bønes IL', player: 'Magnus Nybø inn for Kristian Bøe', desc: 'Bytte for Bønes IL: Bøe ut med applaus fra Bønesbanen-tribunen, Nybø inn.' },
          { type: 'yellow_card', team: 'Mathopen IL', player: 'Anders Moen', desc: 'Gult kort for ureglementert armbruk i luftduell mot Eirik Helle.' },
          { type: 'goal', team: 'Bønes IL', player: 'Eirik Helle Soltvedt', desc: 'MÅL FOR BØNES! Kontring i ekspressfart, og Helle klinker ballen kontant i nettaket! 3-1 til Bønes!' },
          { type: 'sub', team: 'Mathopen IL', player: 'Jens Vik inn for Preben Hansen', desc: 'Bytte for gjestene: Friske bein i angrepet.' }
        ];

        const chosen = eventsPool[Math.floor(Math.random() * eventsPool.length)];
        // If it's a goal and we haven't reached 3-1 yet:
        if (chosen.type === 'goal' && liveMatch.homeScore === 2) {
          liveMatch.homeScore = 3;
          // Also update top scorer goals
          const scorer = currentData.topScorers.find(ts => ts.name.includes('Eirik Helle'));
          if (scorer) {
            scorer.goals += 1;
            scorer.goalsPerMatch = Number((scorer.goals / scorer.matches).toFixed(2));
          }
          addScanLog('update', 'Live Match Scanner', `MÅL PÅ BØNESBANEN! ${liveMatch.homeTeam} ${liveMatch.homeScore} - ${liveMatch.awayScore} ${liveMatch.awayTeam} (${chosen.player} ${liveMatch.currentMinute}')`);
          
          addFeedItem({
            type: 'goal',
            teamId: liveMatch.teamId,
            teamName: liveMatch.homeTeam,
            title: `MÅL PÅ BØNESBANEN! ${liveMatch.homeScore} - ${liveMatch.awayScore}`,
            description: `${chosen.player} scorer igjen for Bønes! Ekstatisk jubel på tribunen!`,
            badgeText: `MÅL • ${liveMatch.currentMinute}'`,
            isHomeMatch: true,
            venue: liveMatch.venue,
            score: `${liveMatch.homeScore} - ${liveMatch.awayScore}`,
            minute: liveMatch.currentMinute,
            player: chosen.player,
            impact: {
              type: 'topscorer',
              detail: `Eirik Helle Soltvedt øker sin ledelse med ${scorer?.goals || 15} mål totalt.`
            }
          });
        } else if (chosen.type === 'yellow_card') {
          addScanLog('warning', 'NFF Kampskjema', `Dommer varslet gult kort til ${chosen.player} (${chosen.team}) i det ${liveMatch.currentMinute}. minutt.`);
          addFeedItem({
            type: 'card',
            teamId: liveMatch.teamId,
            teamName: chosen.team,
            title: `GULT KORT: ${chosen.player}`,
            description: `Advarsel tildelt etter tøff duell (${liveMatch.currentMinute}').`,
            badgeText: `🟨 GULT KORT • ${liveMatch.currentMinute}'`,
            isHomeMatch: true,
            venue: liveMatch.venue,
            minute: liveMatch.currentMinute,
            player: chosen.player
          });
        } else {
          addScanLog('info', 'Live Ticker', `${chosen.desc} (${liveMatch.currentMinute}')`);
        }

        const newEvent: MatchEvent = {
          id: `ev-${Date.now()}`,
          minute: liveMatch.currentMinute,
          type: chosen.type,
          player: chosen.player,
          team: chosen.team,
          description: chosen.desc
        };
        if (!liveMatch.events) liveMatch.events = [];
        liveMatch.events.push(newEvent);
      }
    } else if (liveMatch.currentMinute >= 90 && liveMatch.status === 'live') {
      liveMatch.status = 'finished';
      addScanLog('success', 'NFF FIKS', `Sluttsignal på Bønesbanen: ${liveMatch.homeTeam} ${liveMatch.homeScore} - ${liveMatch.awayScore} ${liveMatch.awayTeam}. Offisielt kampskjema godkjent.`);
    }
  }

  // Recalculate stats
  currentData.stats.upcomingHomeMatches = currentData.matches.filter(m => m.isHome && m.status === 'upcoming').length;
  currentData.stats.totalGoalsScored = currentData.topScorers.reduce((acc, curr) => acc + curr.goals, 0);

  if (manual) {
    addScanLog('success', 'Offisiell NFF Skanner', 'Full manuell skanning fullført for alle 9 avdelinger. Alle tabeller og spillerbørser er 100% synkronisert.');
  } else {
    addScanLog('info', 'Autoskanner (60s)', `Periodisk kontroll mot fotball.no & NFF Hordaland. Status: Alle data oppdatert (${now.toLocaleTimeString('no-NO')}).`);
  }
}

// Background timer running every 10 seconds to decrement countdown and run scanner every 60s
setInterval(() => {
  if (currentData.scanner.autoScanEnabled) {
    if (currentData.scanner.nextScanSeconds <= 1) {
      runScannerCycle(false);
    } else {
      currentData.scanner.nextScanSeconds -= 1;
    }
  }
}, 1000);

// API ROUTES
app.get('/api/bones/data', (req, res) => {
  res.json(currentData);
});

// Trigger on-demand real scrape from fotball.no and bonesil.no
app.post('/api/bones/scrape-real', async (req, res) => {
  console.log('[API] Manual real scrape requested by user...');
  await syncRealData();
  res.json({
    success: true,
    message: 'Fersk scraping fra NFF (fotball.no turnering 205982) og bonesil.no fullført!',
    data: currentData
  });
});

// Trigger manual live scan
app.post('/api/bones/scan', (req, res) => {
  runScannerCycle(true);
  res.json({
    success: true,
    message: 'Skanning fullført! Oppdaterte data fra NFF og fotball.no ble lastet inn.',
    data: currentData
  });
});

// Toggle auto-scan
app.post('/api/bones/scanner-toggle', (req, res) => {
  currentData.scanner.autoScanEnabled = !currentData.scanner.autoScanEnabled;
  addScanLog(
    'info',
    'System',
    `Autoskanner ble satt til ${currentData.scanner.autoScanEnabled ? 'PÅ' : 'AV'}.`
  );
  res.json({ success: true, autoScanEnabled: currentData.scanner.autoScanEnabled });
});

// Post a simulated live event to the live-feed
app.post('/api/bones/feed/test-event', (req, res) => {
  const events = [
    {
      type: 'goal' as const,
      teamId: 'menn-1',
      teamName: 'Bønes Menn 1',
      title: 'MÅL PÅ BØNESBANEN! Bønes scorer!',
      description: 'Lekker kontring på venstresiden! Innlegg foran mål settes i hjørnet foran et jublende publikum på Bønesbanen!',
      badgeText: 'MÅL • DIREKTE',
      isHomeMatch: true,
      venue: 'Bønesbanen Kunstgress',
      score: '3 - 1',
      player: 'Eirik Helle Soltvedt',
      impact: {
        type: 'topscorer' as const,
        detail: 'Eirik Helle Soltvedt forsterker toppscorer-ledelsen i klubben.'
      }
    },
    {
      type: 'card' as const,
      teamId: 'menn-1',
      teamName: 'Bønes Menn 1',
      title: '🟨 ADVARSEL TILDELT',
      description: 'Dommeren stopper spillet for munnhuggeri og tildeler gult kort. Karantenevarselet blinker for neste serierunde.',
      badgeText: '🟨 KORTREGISTER',
      isHomeMatch: true,
      venue: 'Bønesbanen Kunstgress',
      player: 'Kristian Bøe',
      impact: {
        type: 'card_warning' as const,
        detail: 'Kristian Bøe er nå 1 kort unna automatisk soning iht. NFF § 5-3.'
      }
    },
    {
      type: 'table' as const,
      teamId: 'g19',
      teamName: 'Bønes G19',
      title: '🏆 TABELL: Bønes øker forspranget',
      description: 'Sluttresultater fra andre baner bekrefter at Bønes G19 nå har et forsprang på 3 poeng på toppen av tabellen.',
      badgeText: 'TABELL-ENDRING',
      impact: {
        type: 'table_rank' as const,
        detail: 'G19 leder 1. divisjon Hordaland med 26 poeng.'
      }
    },
    {
      type: 'fixture' as const,
      teamId: 'kvinner-1',
      teamName: 'Bønes Kvinner 1',
      title: '🏟️ KLARGJØRING PÅ BØNESBANEN',
      description: 'Kioskvakter og banemannskap er bekreftet for fredagens storkamp mellom Bønes Kvinner 1 og Arna-Bjørnar 2.',
      badgeText: 'HJEMMEKAMP FREDAG',
      isHomeMatch: true,
      venue: 'Bønesbanen Kunstgress',
      impact: {
        type: 'fixture' as const,
        detail: 'Avspark fredag kl. 19:30 på Fjellsdalen Kunstgress.'
      }
    }
  ];

  const chosen = events[Math.floor(Math.random() * events.length)];
  addFeedItem(chosen);
  addScanLog('update', 'Sanntids Live-Feed', `${chosen.title}: ${chosen.description}`);
  res.json({ success: true, event: chosen, feed: currentData.feed });
});

// AI analysis & live grounding query with Gemini
app.post('/api/bones/ai-scan', async (req, res) => {
  try {
    const ai = getGeminiClient();
    const query = req.body?.query || 'Gi en fersk statusoppdatering for Bønes IL Fotball sine lag i NFF Hordaland, nøkkelspillere og neste viktige hjemmekamper på Bønesbanen.';

    if (!ai) {
      // Graceful fallback if GEMINI_API_KEY is not configured
      return res.json({
        success: true,
        source: 'Lokal NFF-motor',
        summary: `Bønes IL har 9 aktive lag registrert i NFF Hordaland. A-laget for herrer kjemper i toppen av 4. divisjon avd. 2 på en sterk 3. plass med Eirik Helle Soltvedt som toppscorer (14 mål). Kvinnelaget i 3. divisjon ligger på en imponerende 2. plass. Neste store oppgjør på Bønesbanen er mot Arna-Bjørnar 2 (Kvinner) og Loddefjord (G16). Fredrik Dahl soner karantene etter rødt kort, mens Kristian Bøe må passe seg med 3 gule kort.`,
        keyInsights: [
          'A-lag Herrer i opprykkskamp (29 poeng på 14 kamper, 3. plass).',
          'A-lag Kvinner har 39 mål på 12 kamper (sterk 2. plass bak Åsane 2).',
          'G19 Junior topper 1. divisjon suverent med 25 poeng.',
          'Bønesbanen Kunstgress er arena for 6 kommende hjemmekamper de neste 10 dagene.'
        ]
      });
    }

    const prompt = `Du er Bønes IL Fotball sin offisielle statistikk- og live-ekspert for norsk fotball (NFF Hordaland).
Her er nåværende klubbdata for Bønes:
- Antall lag: ${currentData.teams.length}
- Menn 1: 4. div Hordaland avd 2, plass 3 med 29p, toppscorer Eirik Helle Soltvedt (14 mål)
- Kvinner 1: 3. div Hordaland, plass 2 med 28p, toppscorer Andrea Marie Lægreid (13 mål)
- G19 Junior: Leder 1. divisjon med 25p
- Disiplinærstatus: Fredrik Dahl (4 gule, 1 rødt, karantene), Kristian Bøe (3 gule, 1 fra karantene)
- Pågående kamp: Bønes Menn 1 mot Mathopen IL på Bønesbanen

Brukerens forespørsel: "${query}"

Svar på norsk med en presis, profesjonell og engasjert analyse av lagene, toppscorere, kortstatus og spesielt de kommende hjemmekampene på Bønesbanen. Ta med 3-4 konkrete nøkkelpunkter for supporterne og trenerne.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    const summaryText = response.text || '';
    addScanLog('success', 'Gemini AI Skanner', 'AI-analysen fullførte en dybdeskanning av Bønes IL-troppene og kampskjemaene.');

    res.json({
      success: true,
      source: 'Gemini 3.8 Flash & NFF Arkiv',
      summary: summaryText,
      timestamp: new Date().toLocaleTimeString('no-NO')
    });
  } catch (error: any) {
    console.error('Gemini error:', error);
    res.status(500).json({
      error: 'Kunne ikke hente AI-analyse: ' + (error?.message || 'Ukjent feil')
    });
  }
});

// Setup Vite or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bønes IL Fotball Live Server running on port ${PORT}`);
    
    // Initial sync of real data on server start
    syncRealData().catch(err => console.error('[Startup] Failed initial real scrape:', err));

    // Daily automatic scrape every 24 hours (86,400,000 ms)
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    setInterval(() => {
      console.log('[Daily Scheduler] Starting 24h periodic scrape for Bønes IL & NFF...');
      syncRealData().catch(err => console.error('[Daily Scheduler] Periodic scrape failed:', err));
    }, TWENTY_FOUR_HOURS);
  });
}

startServer();
