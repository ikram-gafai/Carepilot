"use client"

/** Live retrieval is paused — preview data is seeded via db:seed:similar-preview. */
export function RunSimilarAiButton() {
  return (
    <p className="text-[10px] text-muted-foreground">
      Similar cases: seeded preview only (NLP benchmark paused)
    </p>
  )
}
