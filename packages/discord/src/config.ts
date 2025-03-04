import { z } from "zod"
import { config as loadEnv } from "dotenv"
loadEnv()

const getEnvVar = (key: string, required = true) => {
  const value = process.env[key]
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

// Make Perplexity configuration optional but keep its internal structure validation
const aiServicesSchema = z.object({
  perplexity: z
    .object({
      key: z
        .string()
        .min(1, "Perplexity API key is required")
        .regex(/^pplx-[a-zA-Z0-9]+$/, "Invalid Perplexity API key format"),
    })
    .optional(),
})

const discordSchema = z.object({
  botToken: z.string().min(1, "Discord bot token is required"),
  clientId: z.string().min(1, "Discord client ID is required"),
  dbPath: z.string().optional().default("dsqr.local.sqlite"),
})

const configSchema = z.object({
  ai: aiServicesSchema,
  discord: discordSchema,
})

export type AiConfig = z.infer<typeof aiServicesSchema>
export type DiscordConfig = z.infer<typeof discordSchema>
export type Config = z.infer<typeof configSchema>

let configInstance: Config | null = null

export function createConfig(): Config {
  const rawConfig = {
    ai: {
      // Only include perplexity if the env var exists
      ...(getEnvVar("PERPLEXITY_API_KEY", false) && {
        perplexity: {
          key: getEnvVar("PERPLEXITY_API_KEY", false),
        },
      }),
    },
    discord: {
      botToken: getEnvVar("DISCORD_BOT_TOKEN"),
      clientId: getEnvVar("DISCORD_CLIENT_ID"),
      dbPath: getEnvVar("DISCORD_DB_PATH", false) || "dsqr.local.sqlite",
    },
  }
  try {
    return configSchema.parse(rawConfig)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
        .join("\n")
      throw new Error(`Configuration validation failed:\n${issues}`)
    }
    throw error
  }
}

function getConfig(): Config {
  if (!configInstance) {
    configInstance = createConfig()
  }
  return configInstance
}

export { getConfig }
