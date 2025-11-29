import { motion } from "framer-motion";
import TeamChip from "./TeamChip";

interface Team {
  id: string;
  name: string;
  crest?: string;
  initials?: string;
}

interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore?: number;
  awayScore?: number;
  homePenalties?: number | null;
  awayPenalties?: number | null;
  status: "upcoming" | "live" | "completed";
  time?: string;
  pitch?: string;
}

interface KnockoutBracketProps {
  matches: Match[];
}

type TeamSlot = { name?: string; score?: number; penalties?: number | null; team?: Team };

type BracketMatch = {
  id: string;
  round: "QF" | "SF" | "F";
  home: TeamSlot;
  away: TeamSlot;
  status?: "upcoming" | "live" | "completed";
  time?: string;
};

type KnockoutBracketData = {
  quarterFinals: BracketMatch[];
  semiFinals: BracketMatch[];
  final: BracketMatch | null;
};

// Parse matches into bracket structure
const parseMatchesToBracket = (matches: Match[]): KnockoutBracketData => {
  const bracket: KnockoutBracketData = {
    quarterFinals: [],
    semiFinals: [],
    final: null,
  };

  // Group matches by round name from pitch field
  const quarterFinalsMatches: Match[] = [];
  const semiFinalsMatches: Match[] = [];
  let finalMatch: Match | null = null;

  matches.forEach((match) => {
    const pitch = match.pitch || "";
    const pitchLower = pitch.toLowerCase();

    if (pitchLower.includes("quarter") || pitchLower.includes("round of 8")) {
      quarterFinalsMatches.push(match);
    } else if (pitchLower.includes("semi")) {
      semiFinalsMatches.push(match);
    } else if (pitchLower.includes("final")) {
      finalMatch = match;
    }
  });

  // Convert to bracket format
  bracket.quarterFinals = quarterFinalsMatches.map((match) => ({
    id: match.id,
    round: "QF" as const,
    home: {
      name: match.homeTeam?.name,
      score: match.homeScore,
      penalties: match.homePenalties,
      team: match.homeTeam,
    },
    away: {
      name: match.awayTeam?.name,
      score: match.awayScore,
      penalties: match.awayPenalties,
      team: match.awayTeam,
    },
    status: match.status,
    time: match.time,
  }));

  bracket.semiFinals = semiFinalsMatches.map((match) => ({
    id: match.id,
    round: "SF" as const,
    home: {
      name: match.homeTeam?.name,
      score: match.homeScore,
      penalties: match.homePenalties,
      team: match.homeTeam,
    },
    away: {
      name: match.awayTeam?.name,
      score: match.awayScore,
      penalties: match.awayPenalties,
      team: match.awayTeam,
    },
    status: match.status,
    time: match.time,
  }));

  if (finalMatch) {
    bracket.final = {
      id: finalMatch.id,
      round: "F" as const,
      home: {
        name: finalMatch.homeTeam?.name,
        score: finalMatch.homeScore,
        penalties: finalMatch.homePenalties,
        team: finalMatch.homeTeam,
      },
      away: {
        name: finalMatch.awayTeam?.name,
        score: finalMatch.awayScore,
        penalties: finalMatch.awayPenalties,
        team: finalMatch.awayTeam,
      },
      status: finalMatch.status,
      time: finalMatch.time,
    };
  }

  // Ensure we have 4 quarter-final slots (even if empty)
  while (bracket.quarterFinals.length < 4) {
    bracket.quarterFinals.push({
      id: `qf-empty-${bracket.quarterFinals.length}`,
      round: "QF",
      home: {},
      away: {},
      status: "upcoming",
    });
  }

  // Ensure we have 2 semi-final slots (even if empty)
  while (bracket.semiFinals.length < 2) {
    bracket.semiFinals.push({
      id: `sf-empty-${bracket.semiFinals.length}`,
      round: "SF",
      home: {},
      away: {},
      status: "upcoming",
    });
  }

  return bracket;
};

// MatchCard component
const MatchCard = ({ match, roundLabel }: { match: BracketMatch; roundLabel: string }) => {
  const isCompleted = match.status === "completed";
  const isLive = match.status === "live";
  const isDraw = match.home.score !== undefined && match.away.score !== undefined && 
                 (match.home.score || 0) === (match.away.score || 0);
  const homeWonOnPenalties = isCompleted && isDraw && match.home.penalties !== null && match.home.penalties !== undefined &&
                             match.away.penalties !== null && match.away.penalties !== undefined &&
                             (match.home.penalties || 0) > (match.away.penalties || 0);
  const awayWonOnPenalties = isCompleted && isDraw && match.home.penalties !== null && match.home.penalties !== undefined &&
                             match.away.penalties !== null && match.away.penalties !== undefined &&
                             (match.away.penalties || 0) > (match.home.penalties || 0);
  const homeWon = isCompleted && match.home.score !== undefined && match.away.score !== undefined && 
                  ((match.home.score || 0) > (match.away.score || 0) || homeWonOnPenalties);
  const awayWon = isCompleted && match.home.score !== undefined && match.away.score !== undefined && 
                  ((match.home.score || 0) < (match.away.score || 0) || awayWonOnPenalties);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-zinc-800/70 border-2 border-zinc-600 rounded-xl p-3 lg:p-4 mb-3 lg:mb-4 min-w-[200px] lg:min-w-[260px] max-w-[220px] lg:max-w-[280px] w-full lg:w-auto shadow-lg hover:shadow-yellow-500/20 transition-all flex-shrink-0"
    >
      <div className="flex items-center justify-between mb-2 lg:mb-3">
        <span className="text-xs text-yellow-500 font-bold uppercase tracking-wider">
          {roundLabel}
        </span>
        {match.time && (
          <span className="text-xs text-gray-300 font-medium">{match.time}</span>
        )}
      </div>

      {/* Home Team */}
      <div
        className={`flex items-center justify-between py-2 lg:py-2.5 px-2.5 lg:px-3 rounded-lg mb-2 ${
          homeWon
            ? "bg-yellow-500/30 border-2 border-yellow-500/70 shadow-lg shadow-yellow-500/20"
            : "bg-zinc-900/70 border border-zinc-700"
        }`}
      >
        {match.home.team ? (
          <TeamChip
            name={match.home.team.name}
            initials={match.home.team.initials}
            size="sm"
          />
        ) : (
          <span className="text-gray-400 text-xs lg:text-sm font-medium">TBC</span>
        )}
        <div className="flex flex-col items-end">
          <span
            className={`text-lg lg:text-xl font-bold ${
              homeWon ? "text-yellow-400" : "text-white"
            }`}
          >
            {match.home.score !== undefined ? match.home.score : "-"}
          </span>
          {match.home.penalties !== null && match.home.penalties !== undefined && (
            <span className="text-xs text-yellow-400/80 font-semibold">
              ({match.home.penalties})
            </span>
          )}
        </div>
      </div>

      {/* Away Team */}
      <div
        className={`flex items-center justify-between py-2 lg:py-2.5 px-2.5 lg:px-3 rounded-lg ${
          awayWon
            ? "bg-yellow-500/30 border-2 border-yellow-500/70 shadow-lg shadow-yellow-500/20"
            : "bg-zinc-900/70 border border-zinc-700"
        }`}
      >
        {match.away.team ? (
          <TeamChip
            name={match.away.team.name}
            initials={match.away.team.initials}
            size="sm"
          />
        ) : (
          <span className="text-gray-400 text-xs lg:text-sm font-medium">TBC</span>
        )}
        <div className="flex flex-col items-end">
          <span
            className={`text-lg lg:text-xl font-bold ${
              awayWon ? "text-yellow-400" : "text-white"
            }`}
          >
            {match.away.score !== undefined ? match.away.score : "-"}
          </span>
          {match.away.penalties !== null && match.away.penalties !== undefined && (
            <span className="text-xs text-yellow-400/80 font-semibold">
              ({match.away.penalties})
            </span>
          )}
        </div>
      </div>

      {isLive && (
        <div className="mt-2 lg:mt-3 text-center">
          <span className="px-2 py-1 bg-red-500/30 border-2 border-red-500/70 rounded-lg text-red-300 text-xs font-bold animate-pulse">
            LIVE
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default function KnockoutBracket({ matches }: KnockoutBracketProps) {
  const bracket = parseMatchesToBracket(matches);

  // Split quarters: 2 on left, 2 on right
  const leftQuarters = bracket.quarterFinals.slice(0, 2);
  const rightQuarters = bracket.quarterFinals.slice(2, 4);

  return (
    <div className="w-full py-4 lg:py-6">
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 justify-start items-start overflow-x-auto pb-4 px-2 lg:px-4" style={{ scrollBehavior: 'smooth' }}>
        {/* Quarter-Finals - Left Column (2 matches) */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="mb-3 lg:mb-4 text-center">
            <h4 className="text-lg lg:text-xl font-bold text-yellow-300 mb-1">Quarter-Finals</h4>
            <p className="text-xs text-gray-300 font-medium">
              {bracket.quarterFinals.filter(m => m.home.team || m.away.team).length} matches
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:gap-4">
            {leftQuarters.map((match, index) => (
              <MatchCard
                key={match.id}
                match={match}
                roundLabel={`QF${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Semi-Finals - Center-Left Column */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="mb-3 lg:mb-4 text-center">
            <h4 className="text-lg lg:text-xl font-bold text-yellow-400 mb-1">Semi-Finals</h4>
            <p className="text-xs text-gray-300 font-medium">
              {bracket.semiFinals.filter(m => m.home.team || m.away.team).length} matches
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:gap-4">
            {bracket.semiFinals[0] ? (
              <MatchCard
                key={bracket.semiFinals[0].id}
                match={bracket.semiFinals[0]}
                roundLabel="SF1"
              />
            ) : (
              <div className="bg-zinc-800/70 border-2 border-zinc-600 rounded-xl p-3 lg:p-4 mb-3 lg:mb-4 min-w-[200px] lg:min-w-[260px] max-w-[220px] lg:max-w-[280px] w-full lg:w-auto shadow-lg flex-shrink-0">
                <div className="flex items-center justify-between mb-2 lg:mb-3">
                  <span className="text-xs text-yellow-500 font-bold uppercase tracking-wider">SF1</span>
                </div>
                <div className="flex items-center justify-between py-2 lg:py-2.5 px-2.5 lg:px-3 rounded-lg mb-2 bg-zinc-900/70 border border-zinc-700">
                  <span className="text-gray-400 text-xs lg:text-sm font-medium">TBC</span>
                  <span className="text-lg lg:text-xl font-bold text-white">-</span>
                </div>
                <div className="flex items-center justify-between py-2 lg:py-2.5 px-2.5 lg:px-3 rounded-lg bg-zinc-900/70 border border-zinc-700">
                  <span className="text-gray-400 text-xs lg:text-sm font-medium">TBC</span>
                  <span className="text-lg lg:text-xl font-bold text-white">-</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Final - Center Column */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="mb-3 lg:mb-4 text-center">
            <h4 className="text-xl lg:text-2xl font-bold text-yellow-500 mb-1">Final</h4>
            {bracket.final && (bracket.final.home.team || bracket.final.away.team) && (
              <p className="text-xs text-gray-300 font-medium">1 match</p>
            )}
          </div>
          {bracket.final ? (
            <MatchCard match={bracket.final} roundLabel="FINAL" />
          ) : (
            <div className="bg-zinc-800/70 border-2 border-zinc-600 rounded-xl p-3 lg:p-4 mb-3 lg:mb-4 min-w-[200px] lg:min-w-[260px] max-w-[220px] lg:max-w-[280px] w-full lg:w-auto shadow-lg flex-shrink-0">
              <div className="flex items-center justify-between mb-2 lg:mb-3">
                <span className="text-xs text-yellow-500 font-bold uppercase tracking-wider">
                  FINAL
                </span>
              </div>
              <div className="flex items-center justify-between py-2 lg:py-2.5 px-2.5 lg:px-3 rounded-lg mb-2 bg-zinc-900/70 border border-zinc-700">
                <span className="text-gray-400 text-xs lg:text-sm font-medium">TBC</span>
                <span className="text-lg lg:text-xl font-bold text-white">-</span>
              </div>
              <div className="flex items-center justify-between py-2 lg:py-2.5 px-2.5 lg:px-3 rounded-lg bg-zinc-900/70 border border-zinc-700">
                <span className="text-gray-400 text-xs lg:text-sm font-medium">TBC</span>
                <span className="text-lg lg:text-xl font-bold text-white">-</span>
              </div>
            </div>
          )}
        </div>

        {/* Semi-Finals - Center-Right Column */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="mb-3 lg:mb-4 text-center">
            <h4 className="text-lg lg:text-xl font-bold text-yellow-400 mb-1">Semi-Finals</h4>
            <p className="text-xs text-gray-300 font-medium">
              {bracket.semiFinals.filter(m => m.home.team || m.away.team).length} matches
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:gap-4">
            {bracket.semiFinals[1] ? (
              <MatchCard
                key={bracket.semiFinals[1].id}
                match={bracket.semiFinals[1]}
                roundLabel="SF2"
              />
            ) : (
              <div className="bg-zinc-800/70 border-2 border-zinc-600 rounded-xl p-3 lg:p-4 mb-3 lg:mb-4 min-w-[200px] lg:min-w-[260px] max-w-[220px] lg:max-w-[280px] w-full lg:w-auto shadow-lg flex-shrink-0">
                <div className="flex items-center justify-between mb-2 lg:mb-3">
                  <span className="text-xs text-yellow-500 font-bold uppercase tracking-wider">SF2</span>
                </div>
                <div className="flex items-center justify-between py-2 lg:py-2.5 px-2.5 lg:px-3 rounded-lg mb-2 bg-zinc-900/70 border border-zinc-700">
                  <span className="text-gray-400 text-xs lg:text-sm font-medium">TBC</span>
                  <span className="text-lg lg:text-xl font-bold text-white">-</span>
                </div>
                <div className="flex items-center justify-between py-2 lg:py-2.5 px-2.5 lg:px-3 rounded-lg bg-zinc-900/70 border border-zinc-700">
                  <span className="text-gray-400 text-xs lg:text-sm font-medium">TBC</span>
                  <span className="text-lg lg:text-xl font-bold text-white">-</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quarter-Finals - Right Column (2 matches) */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="mb-3 lg:mb-4 text-center">
            <h4 className="text-lg lg:text-xl font-bold text-yellow-300 mb-1">Quarter-Finals</h4>
            <p className="text-xs text-gray-300 font-medium">
              {bracket.quarterFinals.filter(m => m.home.team || m.away.team).length} matches
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:gap-4">
            {rightQuarters.map((match, index) => (
              <MatchCard
                key={match.id}
                match={match}
                roundLabel={`QF${index + 3}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 lg:mt-8 pt-4 lg:pt-6 border-t border-zinc-700 flex flex-wrap gap-3 lg:gap-4 justify-center text-xs lg:text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500/20 border border-yellow-500/50 rounded"></div>
          <span className="text-gray-400">Winner</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-zinc-900/50 rounded"></div>
          <span className="text-gray-400">Team</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-xs">
            LIVE
          </span>
          <span className="text-gray-400">Live Match</span>
        </div>
      </div>
    </div>
  );
}
