import { createPerplexity } from "@ai-sdk/perplexity"
import { generateText } from "ai"

import { createConfig } from "@/config.ts"

async function main() {
  console.log("bing bong...")
  const config = createConfig()

  console.log(config.ai.perplexity.key)
  const perplexity = createPerplexity({
    apiKey: config.ai.perplexity.key,
  })

  const { text } = await generateText({
    model: perplexity("sonar-pro"),
    prompt: "What are the latest developments in quantum computing?",
  })

  console.log(text)
}

await main()
