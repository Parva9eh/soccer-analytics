/** True while a query should show loading UI (scope gate + no settled data yet). */
export function queryAwaitingData(
  scopeReady: boolean,
  state: {
    isPending: boolean;
    isFetching: boolean;
    data: unknown;
  },
): boolean {
  if (!scopeReady) {
    return true;
  }
  return state.isPending || (state.isFetching && state.data === undefined);
}

/** True during any in-flight fetch (including background refetch with prior data). */
export function queryIsRefreshing(
  scopeReady: boolean,
  isFetching: boolean,
): boolean {
  return scopeReady && isFetching;
}