import { local, DsqrDiscordConfig, dsqrDiscord } from "@dsqr/discord"
import { AskDsqrCommand } from "@/commands/ask.ts"

function dsqrDiscordBot() {
  const config = local.getConfig()

  const discordConfig = {
    botToken: config.discord.botToken,
    clientId: config.discord.clientId,
    database: {
      type: "sqlite",
      filename: "dsqr.local.sql",
    },
    commands: [new AskDsqrCommand()],
  } satisfies DsqrDiscordConfig

  const bot = dsqrDiscord(discordConfig)
  bot.start()
}

dsqrDiscordBot()
