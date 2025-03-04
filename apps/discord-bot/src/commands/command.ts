import { Command } from "@dsqr/discord"
import { SlashCommandBuilder } from "discord.js";

interface DsqrCommand extends Command {
    slashCommandConfig: SlashCommandBuilder;
}

export { DsqrCommand }