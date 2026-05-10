/**
 * LLM abstraction — MVP uses deterministic/heuristic fallbacks unless OPENAI_API_KEY is set.
 * Keeps the surface modular for future benchmarks (GPT-4o, Mistral, Llama 3, …).
 */
export type LlmClient = {
  modelName: string
  summarizeTicket: (input: { title: string; description: string }) => Promise<string>
}

export function getLlmClient(): LlmClient {
  const apiKey = process.env.OPENAI_API_KEY
  const model = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini"

  if (!apiKey) {
    return {
      modelName: "carepilot-heuristic-v1",
      summarizeTicket: async ({ title, description }) => {
        const snippet = description.slice(0, 280).replace(/\s+/g, " ").trim()
        return `${title.trim()} — ${snippet}${description.length > 280 ? "…" : ""}`
      },
    }
  }

  return {
    modelName: model,
    summarizeTicket: async ({ title, description }) => {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "Summarize the IT retail operations ticket in 2 short sentences, operational tone, French.",
            },
            {
              role: "user",
              content: `Title: ${title}\n\nDescription:\n${description}`,
            },
          ],
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`OpenAI chat failed: ${res.status} ${err}`)
      }
      const json = (await res.json()) as {
        choices: Array<{ message: { content: string } }>
      }
      return json.choices[0]?.message?.content?.trim() ?? ""
    },
  }
}
