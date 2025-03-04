import { local, DsqrDiscordConfig, dsqrDiscord } from "@dsqr/discord"
import { PingCommand } from "@/commands/ping.ts"

function dsqrDiscordBot() {
  const config = local.getConfig()

  const discordConfig = {
    botToken: config.discord.botToken,
    clientId: config.discord.clientId,
    database: {
      type: "sqlite",
      filename: "dsqr.local.sql",
    },
    commands: [new PingCommand()],
  } satisfies DsqrDiscordConfig

  const bot = dsqrDiscord(discordConfig)
  bot.start()
}

dsqrDiscordBot()
