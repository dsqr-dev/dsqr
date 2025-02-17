import { createPerplexity } from "@ai-sdk/perplexity"
import { generateText } from "ai"

async function query(apiKey: string) {
  const perplexity = createPerplexity({ apiKey })

  const { text } = await generateText({
    model: perplexity("sonar-pro"),
    prompt: "What are the latest developments in quantum computing?",
  })

  console.log(text)
}

export { query }
