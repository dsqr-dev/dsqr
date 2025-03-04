import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CacheType,
} from "discord.js"
import { Command } from "@dsqr/discord"

class PingCommand implements Command {
  name = "ping"
  description = "Pings the bot"
  slashCommandConfig = new SlashCommandBuilder()
    .setName(this.name)
    .setDescription(this.description)

  async execute(
    interaction: ChatInputCommandInteraction<CacheType>,
  ): Promise<any> {
    return interaction.reply("Pong!")
  }
}

export { PingCommand }
