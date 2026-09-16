export type TeamCategory = 'Senior' | 'Ungdom' | 'Junior' | 'Barnefotball';

export interface TeamInfo {
  id: string;
  name: string;
  shortName: string;
  category: TeamCategory;
  division: string;
  krets: string;
  homeGround: string;
  currentRank: number;
  totalTeamsInDivision: number;
  nffCode: string;
  fiksId?: number;
  tourneyId?: number;
}

export interface TableRow {
  rank: number;
  teamName: string;
  isBones: boolean;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
}

export interface DivisionTable {
  teamId: string;
  teamName: string;
  divisionName: string;
  season: string;
  updatedAt: string;
  rows: TableRow[];
}

export interface TopScorer {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  goals: number;
  matches: number;
  penalties: number;
  goalsPerMatch: number;
  isBonesPlayer: boolean;
  recentGoalStreak?: number;
}

export interface CardStatistic {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  yellowCards: number;
  redCards: number;
  points: number; // Disciplinary points (e.g. Yellow = 1 pt, Red = 3 pts)
  status: 'Klar' | 'Advarsel (1 fra soning)' | 'Karantene';
  matches: number;
  isBonesPlayer: boolean;
}

export interface MatchEvent {
  id: string;
  minute: number;
  type: 'goal' | 'yellow_card' | 'red_card' | 'sub' | 'whistle';
  player?: string;
  team: string;
  description: string;
}

export interface Match {
  id: string;
  teamId: string;
  teamName: string;
  division: string;
  round: string;
  homeTeam: string;
  awayTeam: string;
  isHome: boolean; // true if Bønes is the home team
  date: string;
  time: string;
  venue: string;
  venueCity: string;
  status: 'upcoming' | 'live' | 'finished';
  homeScore?: number;
  awayScore?: number;
  currentMinute?: number;
  referee?: string;
  events?: MatchEvent[];
  attendance?: number;
}

export interface ScanLog {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'update' | 'warning';
  source: string;
  message: string;
}

export interface ScannerState {
  isActive: boolean;
  lastScanned: string;
  nextScanSeconds: number;
  autoScanEnabled: boolean;
  sources: {
    name: string;
    url: string;
    status: 'online' | 'synced' | 'scanning';
    lastSync: string;
  }[];
  logs: ScanLog[];
}

export type FeedItemType = 'goal' | 'card' | 'table' | 'match_start' | 'match_end' | 'fixture' | 'scanner_sync' | 'announcement';

export interface FeedItem {
  id: string;
  timestamp: string;
  timeAgo: string;
  type: FeedItemType;
  teamId?: string;
  teamName: string;
  title: string;
  description: string;
  badgeText?: string;
  isHomeMatch?: boolean;
  venue?: string;
  score?: string;
  minute?: number;
  player?: string;
  impact?: {
    type: 'topscorer' | 'card_warning' | 'table_rank' | 'fixture';
    detail: string;
  };
}

export interface BonesClubData {
  teams: TeamInfo[];
  tables: Record<string, DivisionTable>;
  topScorers: TopScorer[];
  cards: CardStatistic[];
  matches: Match[];
  scanner: ScannerState;
  feed: FeedItem[];
  stats: {
    totalTeams: number;
    totalMatchesRecorded: number;
    upcomingHomeMatches: number;
    totalGoalsScored: number;
    fairPlayScore: number;
  };
  isRealData?: boolean;
  realDataSource?: string;
  lastRealScraped?: string;
  dailyScrapeSchedule?: string;
  nextDailyScrape?: string;
  isScrapingNow?: boolean;
}
