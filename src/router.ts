export type View = 'timeline' | 'graph'
export interface Route { universeId?: string; view: View; occurrenceId?: string }

/** Shareable hash routes: `#/` landing, `#/u/<universe>?view=graph&o=<occurrence>`. */
export function parseRoute(hash: string): Route {
  const [path = '', query = ''] = hash.replace(/^#/, '').split('?')
  const params = new URLSearchParams(query)
  const match = /^\/u\/([^/]+)\/?$/.exec(path)
  return {
    universeId: match ? decodeURIComponent(match[1]!) : undefined,
    view: params.get('view') === 'graph' ? 'graph' : 'timeline',
    occurrenceId: params.get('o') ?? undefined,
  }
}

export function formatRoute(route: Route): string {
  if (!route.universeId) return '#/'
  const params = new URLSearchParams()
  if (route.view === 'graph') params.set('view', 'graph')
  if (route.occurrenceId) params.set('o', route.occurrenceId)
  const query = params.toString()
  return `#/u/${encodeURIComponent(route.universeId)}${query ? `?${query}` : ''}`
}
