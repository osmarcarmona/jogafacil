/**
 * Pure utility functions for roster selection logic.
 */

/**
 * Filters students to return only active players belonging to the given team.
 *
 * @param {Array<{teamIds: string[], status: string, id: string}>} students
 * @param {string} teamId
 * @returns {Array} students whose teamIds includes teamId and status is 'active'
 */
export function filterPlayersByTeam(students, teamId) {
  return students.filter(
    (s) => s.status === 'active' && Array.isArray(s.teamIds) && s.teamIds.includes(teamId)
  );
}

/**
 * Toggles a player ID in the roster: adds if absent, removes if present.
 *
 * @param {string[]} roster - current roster array of player IDs
 * @param {string} playerId - player ID to toggle
 * @returns {string[]} new roster array
 */
export function togglePlayer(roster, playerId) {
  if (roster.includes(playerId)) {
    return roster.filter((id) => id !== playerId);
  }
  return [...roster, playerId];
}

/**
 * Returns an array of all player IDs from the given player list.
 *
 * @param {Array<{id: string}>} players
 * @returns {string[]} array of all player IDs
 */
export function selectAll(players) {
  return players.map((p) => p.id);
}

/**
 * Returns an empty roster array.
 *
 * @returns {string[]} empty array
 */
export function deselectAll() {
  return [];
}
