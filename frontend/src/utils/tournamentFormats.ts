// NEW: Tournament format utilities for frontend
// Handles format-specific logic without breaking existing components

export type TournamentFormat = 'league' | 'knockout' | 'combination';
export type CombinationType = 'combinationA' | 'combinationB';

export interface TournamentStructure {
  combination_type?: CombinationType;
  [key: string]: any;
}

export interface Group {
  name: string;
  teams: any[];
}

/**
 * Generate balanced groups for combinationB format (Groups → Knockout)
 * Matches backend logic for consistency
 */
export function generateGroups(teams: any[], type: CombinationType = 'combinationB'): Group[] {
  if (!teams || teams.length === 0) {
    return [];
  }

  const numTeams = teams.length;

  // Determine optimal group configuration
  if (numTeams <= 4) {
    return [{ name: 'Group A', teams }];
  } else if (numTeams <= 8) {
    const mid = Math.floor(numTeams / 2);
    return [
      { name: 'Group A', teams: teams.slice(0, mid) },
      { name: 'Group B', teams: teams.slice(mid) }
    ];
  } else if (numTeams === 10) {
    return [
      { name: 'Group A', teams: teams.slice(0, 5) },
      { name: 'Group B', teams: teams.slice(5) }
    ];
  } else if (numTeams === 12) {
    return [
      { name: 'Group A', teams: teams.slice(0, 3) },
      { name: 'Group B', teams: teams.slice(3, 6) },
      { name: 'Group C', teams: teams.slice(6, 9) },
      { name: 'Group D', teams: teams.slice(9, 12) }
    ];
  } else if (numTeams <= 16) {
    const groupsCount = 4;
    const perGroup = Math.floor(numTeams / groupsCount);
    const remainder = numTeams % groupsCount;

    const groups: Group[] = [];
    let startIdx = 0;
    for (let i = 0; i < groupsCount; i++) {
      const groupSize = perGroup + (i < remainder ? 1 : 0);
      groups.push({
        name: `Group ${String.fromCharCode(65 + i)}`, // A, B, C, D
        teams: teams.slice(startIdx, startIdx + groupSize)
      });
      startIdx += groupSize;
    }
    return groups;
  } else {
    // For larger tournaments, use 4-5 teams per group
    const idealGroupSize = numTeams % 4 === 0 ? 4 : 5;
    const numGroups = Math.ceil(numTeams / idealGroupSize);

    const groups: Group[] = [];
    let startIdx = 0;
    for (let i = 0; i < numGroups; i++) {
      const groupSize = Math.min(idealGroupSize, numTeams - startIdx);
      groups.push({
        name: `Group ${String.fromCharCode(65 + i)}`,
        teams: teams.slice(startIdx, startIdx + groupSize)
      });
      startIdx += groupSize;
    }
    return groups;
  }
}

/**
 * Get format display name
 */
export function getFormatDisplayName(format: TournamentFormat, structure?: TournamentStructure): string {
  switch (format) {
    case 'league':
      return 'League / Round Robin';
    case 'knockout':
      return 'Knockout';
    case 'combination':
      const comboType = structure?.combination_type || 'combinationA';
      return comboType === 'combinationA' 
        ? 'League → Knockout' 
        : 'Groups → Knockout';
    default:
      return format;
  }
}

/**
 * Get combination type options for dropdown
 */
export function getCombinationTypeOptions(): Array<{ value: CombinationType; label: string }> {
  return [
    { value: 'combinationA', label: 'League → Knockout (Champions League style)' },
    { value: 'combinationB', label: 'Groups → Knockout (World Cup style)' }
  ];
}

