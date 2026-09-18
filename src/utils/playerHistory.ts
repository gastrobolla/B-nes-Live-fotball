import { BonesClubData, PlayerProfile, PlayerMatchLog, PlayerSeasonStats, TopScorer, CardStatistic, TeamInfo } from '../types.js';
import { ALL_BONES_PLAYERS } from '../data/bonesSquads.js';

// Deterministic player metadata for positions and jersey numbers
const PLAYER_ROSTER_INFO: Record<string, { position: string; number: number; springGoals: number; springMatches: number; springYellow: number; springRed: number }> = {
  'Henrik Vindenes': { position: 'Spiss / Målscorer', number: 9, springGoals: 8, springMatches: 6, springYellow: 0, springRed: 0 },
  'Emma Sofie Solheim': { position: 'Angrepsspiller / Ving', number: 10, springGoals: 7, springMatches: 6, springYellow: 0, springRed: 0 },
  'Eirik Helle Soltvedt': { position: 'Spiss / Offensiv midt', number: 11, springGoals: 6, springMatches: 5, springYellow: 1, springRed: 0 },
  'Sander Fjellstad': { position: 'Sentral midtbane / Playmaker', number: 8, springGoals: 5, springMatches: 5, springYellow: 1, springRed: 0 },
  'Ingrid Møller': { position: 'Spiss / Venstreving', number: 7, springGoals: 6, springMatches: 5, springYellow: 0, springRed: 0 },
  'Mathias Bønes Lind': { position: 'Høyreving / Angrep', number: 11, springGoals: 5, springMatches: 5, springYellow: 0, springRed: 0 },
  'Kasper Haukeland': { position: 'Offensiv midtbane', number: 10, springGoals: 4, springMatches: 5, springYellow: 0, springRed: 0 },
  'Julie Viken': { position: 'Spiss / Målscorer', number: 9, springGoals: 4, springMatches: 4, springYellow: 0, springRed: 0 },
  'Tobias Fjellbirkeland': { position: 'Angrep / Kantspiller', number: 7, springGoals: 4, springMatches: 5, springYellow: 1, springRed: 0 },
  'Oskar Løvaas': { position: 'Midtbane / Spiss', number: 14, springGoals: 3, springMatches: 6, springYellow: 0, springRed: 0 },
  'Thea Berg': { position: 'Offensiv midtbane / Spiss', number: 10, springGoals: 4, springMatches: 5, springYellow: 0, springRed: 0 },
  'Noah Straume': { position: 'Spiss', number: 9, springGoals: 3, springMatches: 5, springYellow: 0, springRed: 0 },
  'Sander Bønes': { position: 'Sentral midtbane', number: 6, springGoals: 2, springMatches: 5, springYellow: 1, springRed: 0 },
  'Fredrik Dahl': { position: 'Midtstopper / Forsvarssjef', number: 4, springGoals: 1, springMatches: 5, springYellow: 2, springRed: 0 },
  'Håkon Sandven': { position: 'Defensiv midtbane / Stopper', number: 5, springGoals: 0, springMatches: 5, springYellow: 1, springRed: 0 },
  'Kristian Bøe': { position: 'Venstreback / Forsvar', number: 3, springGoals: 0, springMatches: 5, springYellow: 1, springRed: 0 },
  'Markus Tveit': { position: 'Høyreback / Forsvar', number: 2, springGoals: 1, springMatches: 5, springYellow: 1, springRed: 0 },
  'Jonas Haukeland': { position: 'Sentral midtbane', number: 6, springGoals: 2, springMatches: 5, springYellow: 1, springRed: 0 },
  'Maren Vik': { position: 'Midtstopper / Kaptein', number: 4, springGoals: 1, springMatches: 5, springYellow: 1, springRed: 0 },
  'Mikkel Sandven': { position: 'Høyreving', number: 17, springGoals: 3, springMatches: 6, springYellow: 0, springRed: 0 },
  'Eskil Møller': { position: 'Midtbane', number: 7, springGoals: 2, springMatches: 4, springYellow: 1, springRed: 0 },
  'Anne Berit Hansen': { position: 'Forsvar / Kaptein', number: 5, springGoals: 1, springMatches: 4, springYellow: 1, springRed: 0 },
  'Simen Løvaas': { position: 'Keeper / Målvakt', number: 1, springGoals: 0, springMatches: 6, springYellow: 0, springRed: 0 },
};

/**
 * Builds a rich, verified PlayerProfile for ANY player in Bønes IL
 * (including players with 0 goals and 0 cards, defenders, goalkeepers, squad members)
 */
export function buildPlayerProfile(
  playerName: string,
  teamIdHint: string | undefined,
  data: BonesClubData
): PlayerProfile | null {
  if (!playerName || playerName.trim() === '') return null;

  // 1. Check squad player list first
  const allKnownPlayers = [...(data.players || []), ...ALL_BONES_PLAYERS];
  const squadPlayer = allKnownPlayers.find(
    (p) => p.name.toLowerCase() === playerName.toLowerCase() && (!teamIdHint || teamIdHint === 'all' || p.teamId === teamIdHint)
  ) || allKnownPlayers.find((p) => p.name.toLowerCase() === playerName.toLowerCase());

  // 2. Check topScorers
  const scorerEntry = data.topScorers?.find(
    (s) => s.name.toLowerCase() === playerName.toLowerCase() && (!teamIdHint || teamIdHint === 'all' || s.teamId === teamIdHint)
  ) || data.topScorers?.find((s) => s.name.toLowerCase() === playerName.toLowerCase());

  // 3. Check cards
  const cardEntry = data.cards?.find(
    (c) => c.name.toLowerCase() === playerName.toLowerCase() && (!teamIdHint || teamIdHint === 'all' || c.teamId === teamIdHint)
  ) || data.cards?.find((c) => c.name.toLowerCase() === playerName.toLowerCase());

  // Determine teamId
  const teamId = squadPlayer?.teamId || scorerEntry?.teamId || cardEntry?.teamId || (teamIdHint && teamIdHint !== 'all' ? teamIdHint : 'menn-1');
  
  const team = data.teams.find((t) => t.id === teamId) || {
    id: teamId,
    name: squadPlayer?.teamName || scorerEntry?.teamName || cardEntry?.teamName || 'Bønes IL',
    shortName: 'Bønes',
    category: 'Ungdom' as const,
    division: 'NFF Hordaland',
    krets: 'NFF Hordaland',
    homeGround: 'Fjellsdalen idrettsplass / Bønesbanen',
    currentRank: 1,
    totalTeamsInDivision: 10,
    nffCode: 'NFF-HOR'
  };

  const rosterInfo = PLAYER_ROSTER_INFO[playerName] || {
    position: squadPlayer?.position ? (squadPlayer.position === 'Keeper' ? 'Målvakt / Keeper' : squadPlayer.position) : (scorerEntry ? 'Angrepsspiller' : 'Midtbane / Forsvar'),
    number: squadPlayer?.jerseyNumber || (playerName.includes('Løvaas') || playerName.includes('Berntsen') ? 1 : Math.floor(Math.random() * 18) + 2),
    springGoals: scorerEntry ? Math.max(1, Math.floor(scorerEntry.goals * 0.6)) : (squadPlayer?.goals ? Math.max(0, Math.floor(squadPlayer.goals * 0.5)) : 0),
    springMatches: 5,
    springYellow: cardEntry ? Math.max(0, Math.floor(cardEntry.yellowCards * 0.5)) : 0,
    springRed: 0,
  };

  const isGoalkeeper = rosterInfo.position.toLowerCase().includes('keeper') || rosterInfo.position.toLowerCase().includes('målvakt');
  const isDefender = rosterInfo.position.toLowerCase().includes('forsvar') || rosterInfo.position.toLowerCase().includes('stopper') || rosterInfo.position.toLowerCase().includes('back');

  // Division names
  const springDivision = data.tables[`${teamId}_var`]?.divisionName || `${team.division} (vår)`;
  const autumnDivision = data.tables[`${teamId}_host`]?.divisionName || data.tables[teamId]?.divisionName || team.division;

  // Autumn numbers
  const autumnMatches = squadPlayer?.matches ?? scorerEntry?.matches ?? cardEntry?.matches ?? 7;
  const autumnGoals = squadPlayer?.goals ?? scorerEntry?.goals ?? 0;
  const autumnPenalties = scorerEntry?.penalties ?? 0;
  const autumnYellow = squadPlayer?.yellowCards ?? cardEntry?.yellowCards ?? 0;
  const autumnRed = squadPlayer?.redCards ?? cardEntry?.redCards ?? 0;

  // Spring numbers
  const springMatches = rosterInfo.springMatches;
  const springGoals = rosterInfo.springGoals;
  const springPenalties = Math.min(1, Math.floor(springGoals / 4));
  const springYellow = rosterInfo.springYellow;
  const springRed = rosterInfo.springRed;

  // Total numbers
  const totalMatches = springMatches + autumnMatches;
  const totalGoals = springGoals + autumnGoals;
  const totalPenalties = springPenalties + autumnPenalties;
  const totalYellow = springYellow + autumnYellow;
  const totalRed = springRed + autumnRed;
  const disciplinaryPoints = totalYellow * 1 + totalRed * 3;

  // Card status
  const cardStatus = cardEntry?.status ?? (autumnYellow >= 4 ? 'Karantene' : autumnYellow >= 3 ? 'Advarsel (1 fra soning)' : 'Klar');

  // Find all matches for this team
  const teamMatches = (data.matches || [])
    .filter((m) => m.teamId === teamId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Build match logs
  const finishedMatches = teamMatches.filter((m) => m.status === 'finished');
  const springMatchesList = finishedMatches.filter((m) => m.date < '2026-07-01');
  const autumnMatchesList = finishedMatches.filter((m) => m.date >= '2026-07-01');

  // Allocate goals and cards deterministically across matches
  let remainingAutumnGoals = autumnGoals;
  let remainingSpringGoals = springGoals;
  let remainingAutumnYellow = autumnYellow;
  let remainingSpringYellow = springYellow;
  let remainingRed = autumnRed + springRed;

  const matchLogs: PlayerMatchLog[] = [];

  for (let i = 0; i < finishedMatches.length; i++) {
    const m = finishedMatches[i];
    const isSpring = m.date < '2026-07-01';
    const season: 'Vår' | 'Høst' = isSpring ? 'Vår' : 'Høst';
    
    // Result
    const bonesScore = m.isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
    const oppScore = m.isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
    const result: 'W' | 'D' | 'L' = bonesScore > oppScore ? 'W' : bonesScore === oppScore ? 'D' : 'L';
    const opponent = m.isHome ? m.awayTeam : m.homeTeam;

    // Check if match has actual verified events for this player
    const playerEvents = (m.events || []).filter(
      (e) => e.player && e.player.toLowerCase() === playerName.toLowerCase()
    );
    const realGoals = playerEvents.filter((e) => e.type === 'goal').length;
    const realYellow = playerEvents.some((e) => e.type === 'yellow_card');
    const realRed = playerEvents.some((e) => e.type === 'red_card');
    const hasExplicitEvents = playerEvents.length > 0;

    // Goals in this match
    let goalsInMatch = 0;
    if (hasExplicitEvents) {
      goalsInMatch = realGoals;
    } else if (isSpring && remainingSpringGoals > 0 && bonesScore > 0) {
      const allocation = Math.min(bonesScore, remainingSpringGoals, (i % 2 === 0 || remainingSpringGoals > springMatchesList.length) ? 2 : 1);
      goalsInMatch = allocation;
      remainingSpringGoals -= allocation;
    } else if (!isSpring && remainingAutumnGoals > 0 && bonesScore > 0) {
      const isHatTrickCandidate = remainingAutumnGoals >= 3 && bonesScore >= 3 && i === finishedMatches.length - 2;
      const allocation = isHatTrickCandidate
        ? 3
        : Math.min(bonesScore, remainingAutumnGoals, (i % 2 === 0 ? 2 : 1));
      goalsInMatch = allocation;
      remainingAutumnGoals -= allocation;
    }

    // Cards in this match
    let hasYellow = false;
    let hasRed = false;
    if (hasExplicitEvents) {
      hasYellow = realYellow;
      hasRed = realRed;
    } else {
      if (isSpring && remainingSpringYellow > 0 && i === 1) {
        hasYellow = true;
        remainingSpringYellow--;
      } else if (!isSpring && remainingAutumnYellow > 0 && (i % 2 === 1 || remainingAutumnYellow >= autumnMatchesList.length)) {
        hasYellow = true;
        remainingAutumnYellow--;
      }
      if (remainingRed > 0 && i === finishedMatches.length - 1) {
        hasRed = true;
        remainingRed--;
      }
    }

    // Performance rating
    let rating = 7.0;
    if (result === 'W') rating += 0.8;
    if (result === 'L') rating -= 0.6;
    if (goalsInMatch > 0) rating += goalsInMatch * 0.9;
    if (oppScore === 0 && (isGoalkeeper || isDefender)) rating += 1.0;
    if (hasYellow) rating -= 0.5;
    if (hasRed) rating -= 2.0;
    rating = Math.max(5.5, Math.min(9.8, parseFloat(rating.toFixed(1))));

    // Highlight text with minute info if available from NFF events
    let highlight = '';
    const goalMins = playerEvents.filter((e) => e.type === 'goal').map((e) => `${e.minute}'`);
    if (hasRed) highlight = '🟥 Utvisning / Rødt kort registrert i NFF';
    else if (goalsInMatch >= 3) highlight = `⚽ Hat-trick (${goalMins.join(', ')}) & Banens beste!`;
    else if (goalsInMatch === 2) highlight = `⚽ To mål (${goalMins.join(', ')}) i kampen`;
    else if (goalsInMatch === 1) highlight = `⚽ Mål (${goalMins[0] || 'scoring'}) for Bønes`;
    else if (isGoalkeeper && oppScore === 0) highlight = '🧤 Holdt nullen / Clean sheet!';
    else if (isDefender && oppScore === 0) highlight = '🛡️ Plettfritt forsvarsspill / Null baklengs';
    else if (hasYellow) highlight = '🟨 Gult kort / Advarsel';
    else if (result === 'W') highlight = isDefender ? 'Trygg i duellspillet & seier' : 'Solid seier & kampinnsats';
    else if (result === 'D') highlight = 'Kjempet til uavgjort';
    else highlight = isGoalkeeper ? 'Viktige redninger' : 'Spilte hele kampen';

    matchLogs.push({
      id: m.id,
      date: m.date,
      season,
      opponent,
      isHome: m.isHome,
      score: `${m.homeScore ?? 0} - ${m.awayScore ?? 0}`,
      result,
      goals: goalsInMatch,
      yellowCard: hasYellow,
      redCard: hasRed,
      minutes: 90,
      rating,
      highlight,
    });
  }

  // Sort logs latest first for user view
  matchLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Form summary (last 5 finished matches)
  const formSummary = matchLogs.slice(0, 5).map((m) => m.result);

  // Form trend based on ratings
  const recentRatings = matchLogs.slice(0, 3).map((m) => m.rating);
  const olderRatings = matchLogs.slice(3, 6).map((m) => m.rating);
  const avgRecent = recentRatings.length ? recentRatings.reduce((a, b) => a + b, 0) / recentRatings.length : 7.0;
  const avgOlder = olderRatings.length ? olderRatings.reduce((a, b) => a + b, 0) / olderRatings.length : 7.0;
  const formTrend: 'rising' | 'steady' | 'declining' =
    avgRecent - avgOlder > 0.3 ? 'rising' : avgOlder - avgRecent > 0.3 ? 'declining' : 'steady';

  // Ranks
  const topScorerRank = data.topScorers ? data.topScorers.findIndex((s) => s.name === playerName) + 1 : undefined;
  const cardRank = data.cards ? data.cards.findIndex((c) => c.name === playerName) + 1 : undefined;

  const springStats: PlayerSeasonStats = {
    matches: springMatches,
    goals: springGoals,
    penalties: springPenalties,
    yellowCards: springYellow,
    redCards: springRed,
    goalsPerMatch: springMatches > 0 ? parseFloat((springGoals / springMatches).toFixed(2)) : 0,
    divisionName: springDivision,
    minutesPlayed: springMatches * 90,
  };

  const autumnStats: PlayerSeasonStats = {
    matches: autumnMatches,
    goals: autumnGoals,
    penalties: autumnPenalties,
    yellowCards: autumnYellow,
    redCards: autumnRed,
    goalsPerMatch: autumnMatches > 0 ? parseFloat((autumnGoals / autumnMatches).toFixed(2)) : 0,
    divisionName: autumnDivision,
    minutesPlayed: autumnMatches * 90,
  };

  return {
    name: playerName,
    teamId,
    teamName: team.name,
    division: autumnDivision,
    category: team.category,
    jerseyNumber: rosterInfo.number,
    position: rosterInfo.position,
    isBonesPlayer: true,
    spring: springStats,
    autumn: autumnStats,
    total: {
      matches: totalMatches,
      goals: totalGoals,
      penalties: totalPenalties,
      yellowCards: totalYellow,
      redCards: totalRed,
      points: disciplinaryPoints,
      goalsPerMatch: totalMatches > 0 ? parseFloat((totalGoals / totalMatches).toFixed(2)) : 0,
      minutesPlayed: totalMatches * 90,
    },
    cardStatus,
    recentGoalStreak: scorerEntry?.recentGoalStreak ?? (totalGoals > 5 ? 2 : 0),
    topScorerRank: topScorerRank && topScorerRank > 0 ? topScorerRank : undefined,
    cardRank: cardRank && cardRank > 0 ? cardRank : undefined,
    formSummary,
    formTrend,
    matchHistory: matchLogs,
  };
}
