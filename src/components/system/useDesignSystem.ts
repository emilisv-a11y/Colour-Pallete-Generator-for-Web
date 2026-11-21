import { getSystem, setSystem, useStorageVersion } from '../../lib/storage'
import type { DesignSystem } from '../../lib/system'

/** Read the saved design system and update it immutably; re-renders on any change. */
export function useDesignSystem() {
  useStorageVersion()
  const sys = getSystem()
  const update = (fn: (s: DesignSystem) => void) => {
    const cur = getSystem()
    if (!cur) return
    const next = structuredClone(cur)
    fn(next)
    setSystem(next)
  }
  return { sys, update }
}
