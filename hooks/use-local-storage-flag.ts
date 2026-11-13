"use client"

import * as React from "react"

const CHANGE_EVENT = "carepilot:local-storage-flag"

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => window.removeEventListener(CHANGE_EVENT, onChange)
}

/**
 * Boolean preference persisted in localStorage ("1" / "0").
 * Server render and hydration use `fallback`; the stored value is applied right after hydration,
 * which is what the previous `useEffect` + `setState` implementation did, without the extra effect pass.
 */
export function useLocalStorageFlag(
  key: string,
  parse: (raw: string | null) => boolean,
  fallback: boolean,
): [boolean, (value: boolean) => void] {
  const value = React.useSyncExternalStore(
    subscribe,
    () => parse(localStorage.getItem(key)),
    () => fallback,
  )
  const setValue = React.useCallback(
    (next: boolean) => {
      localStorage.setItem(key, next ? "1" : "0")
      window.dispatchEvent(new Event(CHANGE_EVENT))
    },
    [key],
  )
  return [value, setValue]
}
