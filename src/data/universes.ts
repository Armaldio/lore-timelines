import type { Universe } from '../domain'
import { backToTheFuture } from './back-to-the-future.ts'
import { dark } from './dark.ts'
import { donnieDarko } from './donnie-darko.ts'
import { mcu } from './mcu.ts'
import { starWars } from './star-wars.ts'

export const universes: Universe[] = [dark, starWars, donnieDarko, backToTheFuture, mcu]
