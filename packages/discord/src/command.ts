import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"

interface Command {
  name: string
  description?: string
  slashCommandConfig: SlashCommandBuilder
  execute(interaction: ChatInputCommandInteraction): Promise<any>
}

export { Command }
