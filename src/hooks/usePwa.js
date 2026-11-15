import { useSyncExternalStore } from 'react'
import { getPwaState, subscribePwa } from '../utils/pwaRuntime'
export function usePwa() { return useSyncExternalStore(subscribePwa, getPwaState, getPwaState) }
