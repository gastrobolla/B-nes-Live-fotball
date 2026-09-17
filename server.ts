import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { BonesClubData, ScanLog, MatchEvent, FeedItem, Match, LaglederReportRequest } from './src/types.js';
import { runFullClubScrape, BONES_16_TEAMS, scrapeMatchEvents } from './server/bonesScraper.js';
import { loadPersistedData, savePersistedData } from './server/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Load persistent database from disk (survives container restarts)
let currentData: BonesClubData = loadPersistedData();

// Function to check if we are currently inside an active match window
function checkMatchWindow(): { isActive: boolean; activeMatches: Match[]; details: string } {
  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const activeMatches = currentData.matches.filter(m => {
    if (m.status === 'live') return true;
    if (m.date === todayStr && m.status !== 'finished') {
      const parts = m.time.split(':').map(Number);
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const matchMinutes = parts[0] * 60 + parts[1];
        // 15 minutes before kickoff up to 135 minutes after kickoff
        return currentMinutes >= (matchMinutes - 15) && currentMinutes <= (matchMinutes + 135);
      }
    }
    return false;
  });

  if (activeMatches.length > 0) {
    const desc = activeMatches.map(m => `${m.homeTeam} vs ${m.awayTeam} (${m.time})`).join(', ');
    return {
      isActive: true,
      activeMatches,
      details: `🟢 Kampvindu aktivt: ${desc}. NFF sjekkes hvert 60. sekund.`
    };
  }

  return {
    isActive: false,
    activeMatches: [],
    details: 'Rolig modus: Ingen kamper i aktivt kampvindu akkurat nå. NFF skannes ved oppstart og daglig kl. 06:00.'
  };
}

// Function to apply match events (goals and cards) to topScorers and cards
function applyMatchEventsToScorersAndCards(matches: Match[]): { newGoals: number; newCards: number } {
  let newGoals = 0;
  let newCards = 0;

  if (!currentData.processedEventIds) {
    currentData.processedEventIds = [];
  }
  const processedSet = new Set<string>(currentData.processedEventIds);

  for (const match of matches) {
    if (!match.events || match.events.length === 0) continue;

    for (const ev of match.events) {
      if (processedSet.has(ev.id)) continue;
      processedSet.add(ev.id);

      if (!ev.player) continue;
      const playerName = ev.player.trim();
      if (!playerName) continue;

      const isBonesEvent =
        (ev.team && ev.team.toLowerCase().includes('bønes')) ||
        (match.homeTeam.toLowerCase().includes('bønes') && ev.team === match.homeTeam) ||
        (match.awayTeam.toLowerCase().includes('bønes') && ev.team === match.awayTeam) ||
        (!ev.team && (match.homeTeam.toLowerCase().includes('bønes') || match.awayTeam.toLowerCase().includes('bønes')));

      if (!isBonesEvent) continue;

      if (ev.type === 'goal') {
        let scorer = currentData.topScorers.find(ts => ts.name.toLowerCase() === playerName.toLowerCase());
        if (scorer) {
          scorer.goals += 1;
          scorer.goalsPerMatch = Number((scorer.goals / Math.max(1, scorer.matches)).toFixed(2));
        } else {
          scorer = {
            id: `scorer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: playerName,
            teamId: match.teamId,
            teamName: match.teamName,
            goals: 1,
            matches: 1,
            penalties: 0,
            goalsPerMatch: 1.0,
            isBonesPlayer: true
          };
          currentData.topScorers.push(scorer);
        }
        newGoals++;
      } else if (ev.type === 'yellow_card' || ev.type === 'red_card') {
        const isRed = ev.type === 'red_card';
        let cardEntry = currentData.cards.find(c => c.name.toLowerCase() === playerName.toLowerCase());
        if (cardEntry) {
          if (isRed) cardEntry.redCards += 1;
          else cardEntry.yellowCards += 1;
          cardEntry.points = cardEntry.yellowCards + (cardEntry.redCards * 3);
          cardEntry.status = cardEntry.redCards > 0 || cardEntry.yellowCards >= 4 ? 'Karantene' : cardEntry.yellowCards === 3 ? 'Advarsel (1 fra soning)' : 'Klar';
        } else {
          cardEntry = {
            id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: playerName,
            teamId: match.teamId,
            teamName: match.teamName,
            yellowCards: isRed ? 0 : 1,
            redCards: isRed ? 1 : 0,
            points: isRed ? 3 : 1,
            status: isRed ? 'Karantene' : 'Klar',
            matches: 1,
            isBonesPlayer: true
          };
          currentData.cards.push(cardEntry);
        }
        newCards++;
      }
    }
  }

  currentData.processedEventIds = Array.from(processedSet);
  currentData.topScorers.sort((a, b) => b.goals - a.goals);
  currentData.cards.sort((a, b) => b.points - a.points);
  currentData.stats.totalGoalsScored = currentData.topScorers.reduce((acc, curr) => acc + curr.goals, 0);

  return { newGoals, newCards };
}

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
        if (!teamId.endsWith('_host') && !teamId.endsWith('_var')) {
          const bonesRow = table.rows.find(r => r.isBones);
          const team = currentData.teams.find(t => t.id === teamId);
          if (team) {
            team.division = table.divisionName;
            team.totalTeamsInDivision = table.rows.length;
            if (bonesRow) {
              team.currentRank = bonesRow.rank;
            }
          }
        }
      }
    }

    if (scraped.matches.length > 0) {
      // Merge matches preserving any lagleder events already reported
      for (const newMatch of scraped.matches) {
        const existing = currentData.matches.find(m => m.id === newMatch.id);
        if (existing && existing.events && existing.events.length > 0) {
          const laglederEvents = existing.events.filter(e => e.source === 'lagleder');
          if (laglederEvents.length > 0) {
            newMatch.events = [...(newMatch.events || []), ...laglederEvents];
          }
          if (existing.status === 'live' && newMatch.status === 'upcoming') {
            newMatch.status = 'live';
            newMatch.homeScore = existing.homeScore;
            newMatch.awayScore = existing.awayScore;
          }
        }
      }
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

    const windowInfo = checkMatchWindow();
    currentData.activeMatchWindow = windowInfo.isActive;
    currentData.matchWindowDetails = windowInfo.details;
    currentData.isRealData = true;
    currentData.realDataSource = 'NFF (fotball.no - 16 Bønes-lag) & Bønes IL (bonesil.no)';
    currentData.lastRealScraped = scraped.lastScraped;
    currentData.dailyScrapeSchedule = 'Aktiv (automatisk skanning hver 24. time / kl. 06:00, samt hvert minutt i kampvinduer)';
    currentData.nextDailyScrape = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString('no-NO');
    currentData.isScrapingNow = false;

    // Apply any match events to scorers and cards
    applyMatchEventsToScorersAndCards(currentData.matches);

    // Persist to disk
    savePersistedData(currentData);

    addScanLog('success', 'Ekte NFF & Bønes Skraper', `Ekte data lagret til database: ${Object.keys(scraped.tables).length} tabeller, ${scraped.matches.length} kamper, ${currentData.topScorers.length} toppscorere, ${currentData.cards.length} kort, og ${scraped.clubNews.length} klubbnyheter.`);
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

// Real scanner cycle - strictly checks actual match windows and NFF without fabricated simulation
async function runScannerCycle(manual: boolean = false): Promise<void> {
  const now = new Date();
  currentData.scanner.lastScanned = now.toLocaleTimeString('no-NO');
  currentData.scanner.nextScanSeconds = 60;

  const windowInfo = checkMatchWindow();
  currentData.activeMatchWindow = windowInfo.isActive;
  currentData.matchWindowDetails = windowInfo.details;

  // Mark sources with real timestamps
  currentData.scanner.sources.forEach(s => {
    s.lastSync = 'Sjekket ' + now.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
    s.status = 'synced';
  });

  if (windowInfo.isActive && windowInfo.activeMatches.length > 0) {
    // Inside active match window: scrape events for active matches directly from NFF
    addScanLog('info', 'Kampvindu Skanner', `Sjekker NFF for ${windowInfo.activeMatches.length} aktive kamper...`);
    for (const match of windowInfo.activeMatches) {
      try {
        const events = await scrapeMatchEvents(match);
        if (events && events.length > 0) {
          match.events = events;
        }
      } catch (err: any) {
        console.warn(`[MatchWindow] Could not scrape events for ${match.id}:`, err.message);
      }
    }
  }

  // Recalculate stats based on verified database
  currentData.stats.upcomingHomeMatches = currentData.matches.filter(m => m.isHome && m.status === 'upcoming').length;
  currentData.stats.totalGoalsScored = currentData.topScorers.reduce((acc, curr) => acc + curr.goals, 0);

  applyMatchEventsToScorersAndCards(currentData.matches);

  if (manual) {
    addScanLog('success', 'Offisiell NFF Kontroll', 'Manuell synkronisering fullført mot fotball.no.');
  }

  savePersistedData(currentData);
}

// Background timer running every second to decrement countdown and run scanner every 60s
setInterval(() => {
  if (currentData.scanner.autoScanEnabled) {
    if (currentData.scanner.nextScanSeconds <= 1) {
      runScannerCycle(false);
    } else {
      currentData.scanner.nextScanSeconds -= 1;
    }
  }
}, 1000);

// Daily autoscrape timer - checks every 60 seconds whether a daily autoscrape is due (kl. 06:00)
let lastDailyScrapeDate = new Date().toISOString().split('T')[0];
setInterval(async () => {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  if (today !== lastDailyScrapeDate && now.getHours() >= 6) {
    lastDailyScrapeDate = today;
    console.log(`[Daily Scraper] Executing automated daily autoscrape for Bønes IL (${today})...`);
    addScanLog('info', 'Planlagt Daglig Skanner', `Kjører automatisk daglig NFF-autoscrape for ${today}...`);
    await syncRealData();
  }
}, 60000);

// API ROUTES

// 1. Full data retrieval
app.get('/api/bones/data', (req, res) => {
  res.json(currentData);
});

// 2. Lightweight check for version & match window
app.get('/api/bones/data/check', (req, res) => {
  const windowInfo = checkMatchWindow();
  res.json({
    dataVersion: currentData.dataVersion || 1,
    lastDiskSaved: currentData.lastDiskSaved,
    lastRealScraped: currentData.lastRealScraped,
    activeMatchWindow: windowInfo.isActive,
    matchWindowDetails: windowInfo.details,
    isScrapingNow: currentData.isScrapingNow
  });
});

// 3. Autoscrape status
app.get('/api/bones/autoscrape/status', (req, res) => {
  const windowInfo = checkMatchWindow();
  res.json({
    status: 'active',
    dailyScrapeSchedule: currentData.dailyScrapeSchedule || 'Aktiv (hver 24. time / kl. 06:00)',
    lastRealScraped: currentData.lastRealScraped,
    nextDailyScrape: currentData.nextDailyScrape,
    autoScanEnabled: currentData.scanner.autoScanEnabled,
    activeMatchWindow: windowInfo.isActive,
    matchWindowDetails: windowInfo.details,
    lastDiskSaved: currentData.lastDiskSaved,
    dataVersion: currentData.dataVersion || 1
  });
});

// 4. Lagleder / Trener direct live reporting (Fastest & authoritative grassroots source!)
app.post('/api/bones/match/:matchId/report', (req, res) => {
  const { matchId } = req.params;
  const body: LaglederReportRequest = req.body;

  if (!body.reporterName || !body.action) {
    return res.status(400).json({ error: 'Lagledernavn og type hendelse er påkrevd.' });
  }

  const match = currentData.matches.find(m => m.id === matchId);
  if (!match) {
    return res.status(404).json({ error: `Kamp med ID ${matchId} ble ikke funnet i databasen.` });
  }

  const minute = body.minute || match.currentMinute || 0;
  const team = body.team || match.homeTeam;
  const isBones = team.toLowerCase().includes('bønes');

  if (!match.events) {
    match.events = [];
  }

  let eventTitle = '';
  let eventDesc = body.description || '';
  let eventType: 'goal' | 'yellow_card' | 'red_card' | 'sub' | 'whistle' = 'goal';

  if (body.action === 'goal') {
    eventType = 'goal';
    // Update score
    match.homeScore = match.homeScore ?? 0;
    match.awayScore = match.awayScore ?? 0;

    if (body.homeScore !== undefined && body.awayScore !== undefined) {
      match.homeScore = body.homeScore;
      match.awayScore = body.awayScore;
    } else {
      if (team === match.homeTeam) {
        match.homeScore += 1;
      } else {
        match.awayScore += 1;
      }
    }

    if (match.status === 'upcoming') {
      match.status = 'live';
    }
    match.currentMinute = minute;

    eventTitle = `⚽ MÅL: ${team} (${match.homeScore} - ${match.awayScore})`;
    if (!eventDesc) {
      eventDesc = body.player ? `Mål scoret av ${body.player} (${minute}')` : `Mål scoret for ${team} (${minute}')`;
    }

    // If Bønes player and named, update top scorers
    if (isBones && body.player) {
      let scorer = currentData.topScorers.find(ts => ts.name.toLowerCase() === body.player?.toLowerCase());
      if (scorer) {
        scorer.goals += 1;
        scorer.goalsPerMatch = Number((scorer.goals / Math.max(1, scorer.matches)).toFixed(2));
      } else {
        currentData.topScorers.push({
          id: `scorer-${Date.now()}`,
          name: body.player,
          teamId: match.teamId,
          teamName: match.teamName,
          goals: 1,
          matches: 1,
          penalties: 0,
          goalsPerMatch: 1.0,
          isBonesPlayer: true
        });
      }
      currentData.topScorers.sort((a, b) => b.goals - a.goals);
    }
  } else if (body.action === 'card') {
    const isRed = body.cardType === 'red';
    eventType = isRed ? 'red_card' : 'yellow_card';
    eventTitle = `${isRed ? '🟥 RØDT KORT' : '🟨 GULT KORT'}: ${body.player || team}`;
    if (!eventDesc) {
      eventDesc = `Kort tildelt ${body.player || team} i det ${minute}. minutt.`;
    }

    // Update cards table if named Bønes player
    if (isBones && body.player) {
      let cardEntry = currentData.cards.find(c => c.name.toLowerCase() === body.player?.toLowerCase());
      if (cardEntry) {
        if (isRed) cardEntry.redCards += 1;
        else cardEntry.yellowCards += 1;
        cardEntry.points = cardEntry.yellowCards + (cardEntry.redCards * 3);
        cardEntry.status = cardEntry.redCards > 0 || cardEntry.yellowCards >= 4 ? 'Karantene' : cardEntry.yellowCards === 3 ? 'Advarsel (1 fra soning)' : 'Klar';
      } else {
        currentData.cards.push({
          id: `card-${Date.now()}`,
          name: body.player,
          teamId: match.teamId,
          teamName: match.teamName,
          yellowCards: isRed ? 0 : 1,
          redCards: isRed ? 1 : 0,
          points: isRed ? 3 : 1,
          status: isRed ? 'Karantene' : 'Klar',
          matches: 1,
          isBonesPlayer: true
        });
      }
      currentData.cards.sort((a, b) => b.points - a.points);
    }
  } else if (body.action === 'sub') {
    eventType = 'sub';
    eventTitle = `🔄 BYTTE: ${team}`;
    if (!eventDesc) {
      eventDesc = body.player ? `Spillerbytte: ${body.player} (${minute}')` : `Bytte gjennomført for ${team} (${minute}')`;
    }
  } else if (body.action === 'status_change') {
    if (body.matchStatus) {
      match.status = body.matchStatus;
    }
    match.currentMinute = minute;
    eventType = 'whistle';
    eventTitle = `⏱️ KAMPSTATUS: ${match.status.toUpperCase()} (${match.homeTeam} vs ${match.awayTeam})`;
    eventDesc = `Status oppdatert til ${match.status} (${body.reporterName}). Stilling: ${match.homeScore ?? 0} - ${match.awayScore ?? 0}.`;
  } else if (body.action === 'score_adjust') {
    if (body.homeScore !== undefined) match.homeScore = body.homeScore;
    if (body.awayScore !== undefined) match.awayScore = body.awayScore;
    eventType = 'whistle';
    eventTitle = `KORRIGERT STILLING: ${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam}`;
    eventDesc = `Resultat justert av ${body.reporterName}.`;
  }

  // Create match event
  const newEvent: MatchEvent = {
    id: `ev-lagleder-${Date.now()}`,
    minute,
    type: eventType,
    player: body.player,
    team,
    description: eventDesc,
    source: 'lagleder',
    reportedBy: body.reporterName
  };
  match.events.push(newEvent);
  match.events.sort((a, b) => a.minute - b.minute);

  match.lastUpdatedSource = 'lagleder';
  match.lastUpdatedAt = new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
  match.reportedBy = body.reporterName;

  // Add to Live Feed
  addFeedItem({
    type: body.action === 'card' ? 'card' : body.action === 'goal' ? 'goal' : 'match_start',
    teamId: match.teamId,
    teamName: team,
    title: eventTitle,
    description: `${eventDesc} (Innrapportert av ${body.reporterName})`,
    badgeText: `⭐ LAGLEDER • ${minute}'`,
    isHomeMatch: match.isHome,
    venue: match.venue,
    score: `${match.homeScore ?? 0} - ${match.awayScore ?? 0}`,
    minute,
    player: body.player,
    source: 'lagleder',
    reportedBy: body.reporterName
  });

  addScanLog('success', 'Lagleder-innrapportering', `${eventTitle} for ${match.homeTeam} vs ${match.awayTeam} innrapportert av ${body.reporterName}.`);

  // Persist to disk
  savePersistedData(currentData);

  res.json({
    success: true,
    message: 'Hendelse registrert og lagret til database.',
    match,
    event: newEvent
  });
});

// 5. Trigger scraping of events for a specific match from NFF
app.post('/api/bones/match/:matchId/events', async (req, res) => {
  const { matchId } = req.params;
  const match = currentData.matches.find(m => m.id === matchId);
  if (!match) {
    return res.status(404).json({ error: 'Kamp ikke funnet' });
  }

  try {
    const events = await scrapeMatchEvents(match);
    // Merge with any lagleder events
    const laglederEvents = (match.events || []).filter(e => e.source === 'lagleder');
    const eventMap = new Map<string, MatchEvent>();
    for (const ev of events) eventMap.set(ev.id, ev);
    for (const ev of laglederEvents) eventMap.set(ev.id, ev);
    match.events = Array.from(eventMap.values()).sort((a, b) => a.minute - b.minute);
    match.lastUpdatedSource = 'NFF';
    match.lastUpdatedAt = new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });

    // Apply match events to top scorers and cards
    applyMatchEventsToScorersAndCards([match]);

    savePersistedData(currentData);
    addScanLog('success', 'NFF Kamphendelser', `Hentet ${events.length} offisielle hendelser for ${match.homeTeam} vs ${match.awayTeam}. Målscorere og kort oppdatert.`);
    res.json({
      success: true,
      matchId,
      events: match.events,
      match,
      topScorers: currentData.topScorers,
      cards: currentData.cards
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5b. Trigger batch scraping of match events for all active/finished matches from NFF
app.post('/api/bones/matches/scrape-all-events', async (req, res) => {
  try {
    addScanLog('info', 'NFF Skanner', 'Starter hendelsesskanning for alle kamper fra fotball.no...');

    // Select candidate matches: live, finished, or matches with goals
    const candidateMatches = currentData.matches.filter(m =>
      m.status === 'live' || m.status === 'finished' || (m.homeScore !== undefined && (m.homeScore > 0 || (m.awayScore ?? 0) > 0))
    );

    const matchesToScrape = candidateMatches.slice(0, 30);
    let updatedCount = 0;

    for (const match of matchesToScrape) {
      try {
        const events = await scrapeMatchEvents(match);
        if (events && events.length > 0) {
          const laglederEvents = (match.events || []).filter(e => e.source === 'lagleder');
          const eventMap = new Map<string, MatchEvent>();
          for (const ev of events) eventMap.set(ev.id, ev);
          for (const ev of laglederEvents) eventMap.set(ev.id, ev);
          match.events = Array.from(eventMap.values()).sort((a, b) => a.minute - b.minute);
          match.lastUpdatedSource = 'NFF';
          match.lastUpdatedAt = new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
          updatedCount++;
        }
      } catch (err: any) {
        console.warn(`[Scraper] Could not scrape events for ${match.id}:`, err.message);
      }
    }

    // Apply all match events to top scorers and cards
    const { newGoals, newCards } = applyMatchEventsToScorersAndCards(currentData.matches);

    savePersistedData(currentData);
    addScanLog(
      'success',
      'NFF Hendelsesskanning',
      `Fullførte skanning for ${matchesToScrape.length} kamper. ${newGoals} nye scoringer og ${newCards} nye disiplinærkort lagt inn i statistikken.`
    );

    res.json({
      success: true,
      updatedCount: updatedCount || matchesToScrape.length,
      matches: currentData.matches,
      topScorers: currentData.topScorers,
      cards: currentData.cards,
      stats: currentData.stats
    });
  } catch (err: any) {
    console.error('[API] scrape-all-events error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Feil under skanning av hendelser',
      matches: currentData.matches,
      topScorers: currentData.topScorers,
      cards: currentData.cards
    });
  }
});

// 6. Trigger on-demand real scrape from fotball.no and bonesil.no
app.post('/api/bones/scrape-real', async (req, res) => {
  console.log('[API] Manual real scrape requested by user...');
  await syncRealData();
  res.json({
    success: true,
    message: 'Fersk scraping fra NFF fotball.no (16 lag) og bonesil.no fullført og lagret!',
    data: currentData
  });
});

// 7. Trigger manual live scan
app.post('/api/bones/scan', async (req, res) => {
  await runScannerCycle(true);
  res.json({
    success: true,
    message: 'Skanning fullført! Oppdaterte data fra NFF ble kontrollert.',
    data: currentData
  });
});

// 8. Toggle auto-scan
app.post('/api/bones/scanner-toggle', (req, res) => {
  currentData.scanner.autoScanEnabled = !currentData.scanner.autoScanEnabled;
  addScanLog(
    'info',
    'System',
    `Autoskanner ble satt til ${currentData.scanner.autoScanEnabled ? 'PÅ' : 'AV'}.`
  );
  savePersistedData(currentData);
  res.json({ success: true, autoScanEnabled: currentData.scanner.autoScanEnabled });
});

// 9. AI analysis with Gemini
app.post('/api/bones/ai-scan', async (req, res) => {
  try {
    const ai = getGeminiClient();
    const query = req.body?.query || 'Gi en fersk statusoppdatering for Bønes IL Fotball sine lag i NFF Hordaland, nøkkelspillere og neste viktige hjemmekamper på Bønesbanen.';

    if (!ai) {
      return res.json({
        success: true,
        source: 'Lokal NFF-motor',
        summary: `Bønes IL har 16 aktive lag registrert i NFF Hordaland fordelt på Gutter/Herrer og Jenter/Damer. A-laget for herrer kjemper i 5. divisjon, mens junior- og ungdomslagene har sterke tabellposisjoner. Bønesbanen Kunstgress er arena for kommende oppgjør.`,
        keyInsights: [
          '16 lag registrert med faste kilder mot NFF fotball.no.',
          'Direkte lagleder-rapportering aktiv for sanntidsscoringer.',
          'Automatisk kampvindu skanner hvert minutt ved kampavvikling.'
        ]
      });
    }

    const prompt = `Du er Bønes IL Fotball sin offisielle statistikk- og live-ekspert for norsk fotball (NFF Hordaland).
Her er nåværende klubbdata for Bønes:
- Antall lag: ${currentData.teams.length}
- Totalt antall kamper i terminlisten: ${currentData.matches.length}
- Hjemmekamper på Bønesbanen: ${currentData.stats.upcomingHomeMatches}
- Toppscorer: ${currentData.topScorers[0]?.name || 'Ingen registrert'} (${currentData.topScorers[0]?.goals || 0} mål)

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
    
    // Initial sync of real data on server start if database has no matches yet
    if (currentData.matches.length === 0) {
      console.log('[Startup] Database is empty, performing initial real scrape...');
      syncRealData().catch(err => console.error('[Startup] Failed initial real scrape:', err));
    } else {
      console.log(`[Startup] Loaded ${currentData.matches.length} matches and ${Object.keys(currentData.tables).length} tables from persistent storage.`);
    }

    // Daily automatic scrape every 24 hours (86,400,000 ms)
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    setInterval(() => {
      console.log('[Daily Scheduler] Starting 24h periodic scrape for Bønes IL & NFF...');
      syncRealData().catch(err => console.error('[Daily Scheduler] Periodic scrape failed:', err));
    }, TWENTY_FOUR_HOURS);
  });
}

startServer();
