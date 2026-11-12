import type { Universe } from '../domain'

export const universes: Universe[] = [
  {
    id: 'donnie-darko', title: 'Donnie Darko', subtitle: 'Primary Universe / Tangent Universe',
    description: 'A branching timeline formed by an artifact, and the return that restores the original world.',
    worlds: [
      { id: 'primary', name: 'Primary Universe', summary: 'The stable timeline, restored after the artifact returns.', tone: 'teal' },
      { id: 'tangent', name: 'Tangent Universe', summary: 'A temporary, unstable branch that ends in collapse.', tone: 'coral' },
    ],
    characters: [
      { id: 'donnie', name: 'Donnie Darko', description: 'The central figure in the tangent timeline.' },
      { id: 'frank', name: 'Frank', description: 'A guide whose warnings point toward the timeline’s end.' },
      { id: 'gretchen', name: 'Gretchen Ross' },
    ],
    sources: [
      { id: 'film', title: 'Donnie Darko (2001)', kind: 'film' },
      { id: 'philosophy', title: 'The Philosophy of Time Travel', kind: 'reference' },
    ],
    events: [
      { id: 'engine-crash', title: 'Jet engine crash', description: 'An engine appears in Donnie’s bedroom while he is away.', placement: { kind: 'exact', label: 'Oct 2, 1988', value: '1988-10-02' }, worldId: 'primary', spoiler: 'mild', sourceIds: ['film'], characterIds: ['donnie'] },
      { id: 'frank-warning', title: 'Frank’s warning', description: 'Frank begins directing Donnie toward events in the tangent world.', placement: { kind: 'exact', label: 'Oct 2, 1988', value: '1988-10-02' }, worldId: 'primary', spoiler: 'mild', sourceIds: ['film'], characterIds: ['frank', 'donnie'] },
      { id: 'grandma-death', title: 'Grandma Death / time travel book', description: 'The book lays out rules that help explain the unstable timeline.', placement: { kind: 'range', label: 'Oct 3–4, 1988', start: '1988-10-03', end: '1988-10-04' }, worldId: 'primary', spoiler: 'mild', sourceIds: ['film', 'philosophy'], characterIds: ['donnie'] },
      { id: 'school-fire', title: 'School fire', description: 'A destructive fire accelerates events in the tangent universe.', placement: { kind: 'exact', label: 'Oct 30, 1988', value: '1988-10-30' }, worldId: 'tangent', spoiler: 'major', uncertainty: 'This event belongs to the tangent timeline; it does not occur in the restored primary universe.', sourceIds: ['film'], characterIds: ['donnie'] },
      { id: 'halloween', title: 'Halloween party', description: 'Events converge as the tangent timeline nears its end.', placement: { kind: 'exact', label: 'Oct 31, 1988', value: '1988-10-31' }, worldId: 'tangent', spoiler: 'major', sourceIds: ['film'], characterIds: ['donnie', 'gretchen'] },
      { id: 'portal', title: 'Portal opens', description: 'The artifact’s return path becomes visible.', placement: { kind: 'exact', label: 'Nov 1, 1988', value: '1988-11-01' }, worldId: 'tangent', spoiler: 'major', sourceIds: ['film'], characterIds: ['donnie'] },
      { id: 'collapse', title: 'Tangent Universe collapses', description: 'The branch ends and the artifact returns to the primary universe.', placement: { kind: 'exact', label: 'Nov 2, 1988', value: '1988-11-02' }, worldId: 'tangent', spoiler: 'major', sourceIds: ['film', 'philosophy'], characterIds: ['donnie'] },
      { id: 'restored', title: 'Universe restored', description: 'The primary timeline continues without the tangent events.', placement: { kind: 'relative', label: 'After the artifact returns', after: 'collapse' }, worldId: 'primary', spoiler: 'major', sourceIds: ['film'], characterIds: ['donnie'] },
    ],
    edges: [
      { id: 'e1', fromEventId: 'engine-crash', toEventId: 'frank-warning', kind: 'leads-to' }, { id: 'e2', fromEventId: 'frank-warning', toEventId: 'grandma-death', kind: 'leads-to' },
      { id: 'branch', fromEventId: 'grandma-death', toEventId: 'school-fire', kind: 'branches-to' }, { id: 'e3', fromEventId: 'school-fire', toEventId: 'halloween', kind: 'leads-to' },
      { id: 'e4', fromEventId: 'halloween', toEventId: 'portal', kind: 'leads-to' }, { id: 'e5', fromEventId: 'portal', toEventId: 'collapse', kind: 'leads-to' }, { id: 'return', fromEventId: 'collapse', toEventId: 'restored', kind: 'returns-to' },
    ],
  },
  {
    id: 'star-wars', title: 'Star Wars', subtitle: 'The Skywalker Saga',
    description: 'A cross-era view of the central Skywalker story. Dates are kept in the familiar BBY / ABY format.',
    worlds: [{ id: 'galaxy', name: 'A galaxy far, far away', summary: 'Chronology spans the Republic, Empire, and New Republic eras.', tone: 'gold' }],
    characters: [{ id: 'anakin', name: 'Anakin Skywalker' }, { id: 'luke', name: 'Luke Skywalker' }, { id: 'rey', name: 'Rey' }],
    sources: [{ id: 'ep1', title: 'The Phantom Menace', kind: 'film' }, { id: 'ep4', title: 'A New Hope', kind: 'film' }, { id: 'ep9', title: 'The Rise of Skywalker', kind: 'film' }],
    events: [
      { id: 'naboo', title: 'Battle of Naboo', description: 'The Republic encounters the return of the Sith.', placement: { kind: 'exact', label: '32 BBY', value: '-0032' }, worldId: 'galaxy', spoiler: 'mild', sourceIds: ['ep1'], characterIds: ['anakin'] },
      { id: 'death-star', title: 'Destruction of the first Death Star', description: 'The Rebellion wins a major victory over the Empire.', placement: { kind: 'exact', label: '0 BBY', value: '0000' }, worldId: 'galaxy', spoiler: 'mild', sourceIds: ['ep4'], characterIds: ['luke'] },
      { id: 'exegol', title: 'Battle of Exegol', description: 'The Resistance confronts the Sith Eternal.', placement: { kind: 'range', label: '35 ABY', start: '0035', end: '0035' }, worldId: 'galaxy', spoiler: 'major', sourceIds: ['ep9'], characterIds: ['rey'] },
    ],
    edges: [{ id: 's1', fromEventId: 'naboo', toEventId: 'death-star', kind: 'leads-to' }, { id: 's2', fromEventId: 'death-star', toEventId: 'exegol', kind: 'leads-to' }],
  },
  ...[
    { id: 'back-to-the-future', title: 'Back to the Future', subtitle: 'A time-traveling family tree', description: 'A dedicated chronology can use the same lane and relationship model.', event: 'Marty travels to 1955' },
    { id: 'marvel-cinematic-universe', title: 'Marvel Cinematic Universe', subtitle: 'One universe, many branches', description: 'A shared chronology can represent alternate worlds and time-travel branches.', event: 'The Avengers assemble' },
  ].map((item): Universe => ({
    ...item,
    worlds: [{ id: `${item.id}-world`, name: 'Main timeline', summary: 'Chronology fixture; expanded canon coverage is separate work.', tone: 'teal' }],
    characters: [{ id: `${item.id}-hero`, name: 'Story characters' }],
    sources: [],
    events: [{ id: `${item.id}-event`, title: item.event, description: 'This selectable universe uses the shared timeline renderer and data contract.', placement: { kind: 'unknown', label: 'Date not set' }, worldId: `${item.id}-world`, spoiler: 'none', sourceIds: [], characterIds: [`${item.id}-hero`] }],
    edges: [],
  })),
]
