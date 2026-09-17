/** Museum navigation is independent of optional exercise completion. */
export function nextVisitRoom(roomIds: readonly string[], lastVisited: string | null): string {
  if (lastVisited === 'leader') return 'leader';
  const index = lastVisited === null ? -1 : roomIds.indexOf(lastVisited);
  return roomIds[index + 1] ?? 'leader';
}
