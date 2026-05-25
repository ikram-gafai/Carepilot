let syncRunning = false

export function isSyncRunning() {
  return syncRunning
}

export function tryAcquireSyncLock(): boolean {
  if (syncRunning) return false
  syncRunning = true
  return true
}

export function releaseSyncLock() {
  syncRunning = false
}
