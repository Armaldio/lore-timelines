import type { Universe } from '../domain'

const S1 = 'dark-s1'
const S2 = 'dark-s2'
const S3 = 'dark-s3'
const S1E1 = 'dark-s1e1'
const S1E6 = 'dark-s1e6'
const S1E10 = 'dark-s1e10'
const S2E8 = 'dark-s2e8'
const S3E8 = 'dark-s3e8'
const REF = 'dark-wiki'

export const dark: Universe = {
  id: 'dark-netflix',
  title: 'Dark',
  subtitle: 'Two worlds born from one origin',
  description: 'Story chronology of the Winden mystery, split by world: the first world where Jonas grows up, the parallel world of Martha, and the origin world whose tragedy started the knot.',
  continuities: [{ id: 'dark-continuity', name: 'Winden cycle', summary: 'The connected events and family histories of Winden across three worlds.' }],
  worlds: [
    { id: 'dark-world-jonas', continuityId: 'dark-continuity', name: 'Jonas’s world (Adam’s world)', summary: 'The world of the Nov 2019 disappearances, where Jonas becomes Adam.', tone: 'teal' },
    { id: 'dark-world-martha', continuityId: 'dark-continuity', name: 'Martha’s world (Eva’s world)', summary: 'A parallel Winden led by an older Martha, reached through the cave and the God Particle.', tone: 'coral' },
    { id: 'dark-world-origin', continuityId: 'dark-continuity', name: 'Origin world', summary: 'The third world where the Tannhaus tragedy and the split began.', tone: 'gold' },
  ],
  characters: [
    { id: 'dark-jonas', name: 'Jonas Kahnwald', description: 'Teenager who later becomes Adam.' },
    { id: 'dark-martha', name: 'Martha Nielsen', description: 'Jonas’s love interest; counterparts exist in each world.' },
    { id: 'dark-mikkel', name: 'Mikkel Nielsen', description: 'Youngest Nielsen child.' },
    { id: 'dark-michael', name: 'Michael Kahnwald', description: 'Jonas’s father.' },
    { id: 'dark-adam', name: 'Adam', description: 'Older Jonas, leader of Sic Mundus.' },
    { id: 'dark-eva', name: 'Eva', description: 'Older Martha, leader of Erit Lux.' },
    { id: 'dark-tannhaus', name: 'H.G. Tannhaus', description: 'Clockmaker and author who builds a time machine.' },
    { id: 'dark-claudia', name: 'Claudia Tiedemann', description: 'Time-travel strategist.' },
    { id: 'dark-hannah', name: 'Hannah Kahnwald', description: 'Jonas’s mother in the first world.' },
  ],
  sources: [
    { id: S1, title: 'Dark, Season 1 (2017)', kind: 'reference' },
    { id: S2, title: 'Dark, Season 2 (2019)', kind: 'reference' },
    { id: S3, title: 'Dark, Season 3 (2020)', kind: 'reference' },
    { id: S1E1, title: 'Dark S1E1 “Secrets”', kind: 'episode' },
    { id: S1E6, title: 'Dark S1E6 “Sic Mundus Creatus Est”', kind: 'episode' },
    { id: S1E10, title: 'Dark S1E10 “Alpha and Omega”', kind: 'episode' },
    { id: S2E8, title: 'Dark S2E8 “Endings and Beginnings”', kind: 'episode' },
    { id: S3E8, title: 'Dark S3E8 “Paradise”', kind: 'episode' },
    { id: REF, title: 'Dark (TV series), Wikipedia plot summary', kind: 'reference', url: 'https://en.wikipedia.org/wiki/Dark_(TV_series)' },
  ],
  events: [
    { id: 'dark-michael-suicide', title: 'Michael Kahnwald’s suicide', description: 'Jonas’s father takes his own life, leaving a letter to be opened later.', characterIds: ['dark-michael', 'dark-jonas'], icon: 'book' },
    { id: 'dark-mikkel-disappears', title: 'Mikkel vanishes near the cave', description: 'The youngest Nielsen disappears, starting the search that exposes the cave.', characterIds: ['dark-mikkel', 'dark-jonas'], icon: 'portal' },
    { id: 'dark-mikkel-1986', title: 'Mikkel arrives in 1986', description: 'The missing boy wakes in the past and is cast into a new identity, closing a family loop.', characterIds: ['dark-mikkel', 'dark-michael'], icon: 'portal' },
    { id: 'dark-jonas-first-travel', title: 'Jonas travels through time for the first time', description: 'Jonas follows the cave passage and emerges decades earlier.', characterIds: ['dark-jonas'], icon: 'portal' },
    { id: 'dark-tannhaus-device', title: 'Tannhaus completes a time device in 1986', description: 'The clockmaker finishes a working machine with help drawn from the future.', characterIds: ['dark-tannhaus', 'dark-jonas'], icon: 'restore' },
    { id: 'dark-2052', title: 'Jonas wakes in the ruined 2052', description: 'Jonas finds a devastated Winden decades after the catastrophe.', characterIds: ['dark-jonas'], icon: 'burst' },
    { id: 'dark-apocalypse', title: 'The apocalypse and the God Particle', description: 'Adam triggers the machine in the plant at the moment of the catastrophe, destroying Winden.', characterIds: ['dark-adam', 'dark-martha'], icon: 'burst' },
    { id: 'dark-martha-shot', title: 'Adam shoots Martha', description: 'Jonas reunites with Martha as Adam’s plan reaches its climax.', characterIds: ['dark-adam', 'dark-martha', 'dark-jonas'], icon: 'battle' },
    { id: 'dark-cross-worlds', title: 'Jonas meets a Martha from another world', description: 'After the catastrophe, Jonas is brought to a parallel world.', characterIds: ['dark-jonas', 'dark-martha'], icon: 'portal' },
    { id: 'dark-knot-revealed', title: 'The knot and the third world are revealed', description: 'Claudia tells Adam and Eva that their conflict originates in a world beyond both of theirs.', characterIds: ['dark-claudia', 'dark-adam', 'dark-eva'], icon: 'book' },
    { id: 'dark-adam-spares-eva', title: 'Adam spares Eva', description: 'Adam brings Jonas to Martha’s world but refuses to kill Eva.', characterIds: ['dark-adam', 'dark-eva', 'dark-jonas', 'dark-martha'], icon: 'battle' },
    { id: 'dark-tannhaus-crash', title: 'Tannhaus loses his family in a car crash', description: 'A fatal accident sets the clockmaker on the path to time travel.', characterIds: ['dark-tannhaus'], icon: 'burst' },
    { id: 'dark-tannhaus-machine', title: 'Tannhaus uses his machine and splits the world', description: 'The attempt to undo the loss creates the two branching worlds.', characterIds: ['dark-tannhaus'], icon: 'portal' },
    { id: 'dark-family-saved', title: 'Jonas and Martha save the Tannhaus family', description: 'They reach the origin world and prevent the accident, ending both worlds.', characterIds: ['dark-jonas', 'dark-martha', 'dark-tannhaus'], icon: 'restore' },
    { id: 'dark-hannah-dinner', title: 'Hannah names her child Jonas', description: 'In the restored world a dinner party ends with a familiar sense of déjà vu.', characterIds: ['dark-hannah'], icon: 'restore' },
  ],
  occurrences: [
    { id: 'dark-michael-suicide-j', eventId: 'dark-michael-suicide', worldId: 'dark-world-jonas', placement: { kind: 'exact', label: 'Jun 21, 2019', value: '2019-06-21' }, spoiler: 'none', sourceIds: [S1E1] },
    { id: 'dark-mikkel-disappears-j', eventId: 'dark-mikkel-disappears', worldId: 'dark-world-jonas', placement: { kind: 'range', label: 'Nov 4–5, 2019', start: '2019-11-04', end: '2019-11-05' }, spoiler: 'none', uncertainty: 'Exact day not confirmed; early Nov 2019, shortly after Jonas returns to school.', sourceIds: [S1E1, REF] },
    { id: 'dark-mikkel-1986-j', eventId: 'dark-mikkel-1986', worldId: 'dark-world-jonas', placement: { kind: 'range', label: 'Early Nov 1986', start: '1986-11-01', end: '1986-11-30' }, spoiler: 'major', uncertainty: 'Exact day within Nov 1986 not verified.', sourceIds: [S1, REF] },
    { id: 'dark-jonas-first-travel-j', eventId: 'dark-jonas-first-travel', worldId: 'dark-world-jonas', placement: { kind: 'relative', label: 'Weeks after Mikkel vanishes (arrives in 1986)', after: 'dark-mikkel-disappears-j' }, spoiler: 'major', uncertainty: 'Arrival date in 1986 not verified.', sourceIds: [S1E6] },
    { id: 'dark-tannhaus-device-j', eventId: 'dark-tannhaus-device', worldId: 'dark-world-jonas', placement: { kind: 'range', label: '1986', start: '1986', end: '1986' }, spoiler: 'major', uncertainty: 'Source summary places it in 1986; detail and exact timing not verified.', sourceIds: [S1E10, REF] },
    { id: 'dark-2052-j', eventId: 'dark-2052', worldId: 'dark-world-jonas', placement: { kind: 'range', label: '2052', start: '2052', end: '2052' }, spoiler: 'major', uncertainty: 'Year only.', sourceIds: [S1E10] },
    { id: 'dark-apocalypse-j', eventId: 'dark-apocalypse', worldId: 'dark-world-jonas', placement: { kind: 'exact', label: 'Jun 27, 2020', value: '2020-06-27' }, spoiler: 'major', sourceIds: [S2, REF] },
    { id: 'dark-martha-shot-j', eventId: 'dark-martha-shot', worldId: 'dark-world-jonas', placement: { kind: 'relative', label: 'Around the 2020 apocalypse', before: 'dark-apocalypse-j' }, spoiler: 'major', uncertainty: 'Ordering against the apocalypse is approximate.', sourceIds: [S2E8] },
    { id: 'dark-cross-worlds-j', eventId: 'dark-cross-worlds', worldId: 'dark-world-jonas', placement: { kind: 'relative', label: 'After the apocalypse', after: 'dark-apocalypse-j' }, spoiler: 'major', sourceIds: [S2E8], uncertainty: 'Placed after the apocalypse by story order only; the series gives no calendar date for this meeting.' },
    { id: 'dark-apocalypse-m', eventId: 'dark-apocalypse', worldId: 'dark-world-martha', placement: { kind: 'exact', label: 'Jun 27, 2020', value: '2020-06-27' }, spoiler: 'major', uncertainty: 'Parallel apocalypse occurs at the same moment as the first world’s.', sourceIds: [S3, REF] },
    { id: 'dark-cross-worlds-m', eventId: 'dark-cross-worlds', worldId: 'dark-world-martha', placement: { kind: 'relative', label: 'After the apocalypse', after: 'dark-apocalypse-m' }, spoiler: 'major', sourceIds: [S2E8, REF], uncertainty: 'Placed after the apocalypse by story order only; the series gives no calendar date for this meeting.' },
    { id: 'dark-knot-revealed-m', eventId: 'dark-knot-revealed', worldId: 'dark-world-martha', placement: { kind: 'unknown', label: 'Outside normal time' }, spoiler: 'major', uncertainty: 'Meeting happens outside any dated moment; lane placement is a presentation choice.', sourceIds: [S3E8] },
    { id: 'dark-adam-spares-eva-m', eventId: 'dark-adam-spares-eva', worldId: 'dark-world-martha', placement: { kind: 'relative', label: 'Apocalypse day, Martha’s world', after: 'dark-knot-revealed-m' }, spoiler: 'major', sourceIds: [S3E8, REF], uncertainty: 'Sequenced by story order on the day of the apocalypse in Martha’s world; no clock time is established here.' },
    { id: 'dark-tannhaus-crash-o', eventId: 'dark-tannhaus-crash', worldId: 'dark-world-origin', placement: { kind: 'unknown', label: 'Date not stated' }, spoiler: 'major', uncertainty: 'The series does not state the date of the accident.', sourceIds: [S3, REF] },
    { id: 'dark-tannhaus-machine-o', eventId: 'dark-tannhaus-machine', worldId: 'dark-world-origin', placement: { kind: 'relative', label: 'After the crash', after: 'dark-tannhaus-crash-o' }, spoiler: 'major', uncertainty: 'Timing is not given.', sourceIds: [S3E8, REF] },
    { id: 'dark-family-saved-o', eventId: 'dark-family-saved', worldId: 'dark-world-origin', placement: { kind: 'range', label: '1971', start: '1971', end: '1971' }, spoiler: 'major', uncertainty: 'Year from a secondary summary; exact date not stated.', sourceIds: [S3E8, REF] },
    { id: 'dark-hannah-dinner-o', eventId: 'dark-hannah-dinner', worldId: 'dark-world-origin', placement: { kind: 'range', label: '2019', start: '2019', end: '2019' }, spoiler: 'major', uncertainty: 'Year only; no exact date stated.', sourceIds: [S3E8, REF] },
  ],
  edges: [
    { id: 'dark-e1', fromOccurrenceId: 'dark-michael-suicide-j', toOccurrenceId: 'dark-mikkel-disappears-j', kind: 'leads-to' },
    { id: 'dark-e2', fromOccurrenceId: 'dark-mikkel-disappears-j', toOccurrenceId: 'dark-mikkel-1986-j', kind: 'leads-to' },
    { id: 'dark-e3', fromOccurrenceId: 'dark-mikkel-1986-j', toOccurrenceId: 'dark-jonas-first-travel-j', kind: 'leads-to' },
    { id: 'dark-e4', fromOccurrenceId: 'dark-jonas-first-travel-j', toOccurrenceId: 'dark-tannhaus-device-j', kind: 'leads-to' },
    { id: 'dark-e5', fromOccurrenceId: 'dark-tannhaus-device-j', toOccurrenceId: 'dark-2052-j', kind: 'leads-to' },
    { id: 'dark-e6', fromOccurrenceId: 'dark-2052-j', toOccurrenceId: 'dark-apocalypse-j', kind: 'leads-to' },
    { id: 'dark-e7', fromOccurrenceId: 'dark-apocalypse-j', toOccurrenceId: 'dark-martha-shot-j', kind: 'leads-to' },
    { id: 'dark-e8', fromOccurrenceId: 'dark-martha-shot-j', toOccurrenceId: 'dark-cross-worlds-j', kind: 'leads-to' },
    { id: 'dark-e9', fromOccurrenceId: 'dark-cross-worlds-j', toOccurrenceId: 'dark-cross-worlds-m', kind: 'branches-to' },
    { id: 'dark-e10', fromOccurrenceId: 'dark-apocalypse-j', toOccurrenceId: 'dark-apocalypse-m', kind: 'related' },
    { id: 'dark-e11', fromOccurrenceId: 'dark-apocalypse-m', toOccurrenceId: 'dark-cross-worlds-m', kind: 'leads-to' },
    { id: 'dark-e12', fromOccurrenceId: 'dark-cross-worlds-m', toOccurrenceId: 'dark-knot-revealed-m', kind: 'leads-to' },
    { id: 'dark-e13', fromOccurrenceId: 'dark-knot-revealed-m', toOccurrenceId: 'dark-adam-spares-eva-m', kind: 'leads-to' },
    { id: 'dark-e14', fromOccurrenceId: 'dark-tannhaus-crash-o', toOccurrenceId: 'dark-tannhaus-machine-o', kind: 'leads-to' },
    { id: 'dark-e15', fromOccurrenceId: 'dark-tannhaus-machine-o', toOccurrenceId: 'dark-family-saved-o', kind: 'leads-to' },
    { id: 'dark-e16', fromOccurrenceId: 'dark-family-saved-o', toOccurrenceId: 'dark-hannah-dinner-o', kind: 'leads-to' },
    { id: 'dark-e17', fromOccurrenceId: 'dark-tannhaus-machine-o', toOccurrenceId: 'dark-michael-suicide-j', kind: 'branches-to' },
    { id: 'dark-e18', fromOccurrenceId: 'dark-tannhaus-machine-o', toOccurrenceId: 'dark-apocalypse-m', kind: 'branches-to' },
    { id: 'dark-e19', fromOccurrenceId: 'dark-adam-spares-eva-m', toOccurrenceId: 'dark-family-saved-o', kind: 'returns-to' },
  ],
}
