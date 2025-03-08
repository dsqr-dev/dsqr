import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CacheType,
} from "discord.js"
import { DsqrCommand } from "@/commands/command.js"

import { createPerplexity } from "@ai-sdk/perplexity"

import { ask } from "@/ai/v0.js"

/** @todo move to teh config driven later. */
const perplexity = createPerplexity({
  apiKey: process.env.PERPLEXITY_API_KEY ?? "",
})

class AskDsqrCommand implements DsqrCommand {
  name = "askdsqr"
  description = "Ask Dsqr a question with a choice of AI models"

  slashCommandConfig = new SlashCommandBuilder()
    .setName(this.name)
    .setDescription(this.description)
    .addStringOption((option) =>
      option
        .setName("prompt")
        .setDescription("The question to ask Dsqr")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("model")
        .setDescription("The AI model to use")
        .setRequired(false)
        .addChoices({ name: "Sonar Pro", value: "sonar-pro" }),
    ) as SlashCommandBuilder

  async execute(
    interaction: ChatInputCommandInteraction<CacheType>,
  ): Promise<any> {
    // Defer reply to give more time for AI processing
    await interaction.deferReply()

    const prompt = interaction.options.getString("prompt")
    if (!prompt) {
      return interaction.editReply("Please provide a prompt.")
    }

    const model = interaction.options.getString("model") || "sonar-pro"

    try {
      let response = "aaa"

      switch (model) {
        case "sonar-pro":
          // Initialize the perplexity model
          const perplexityModel = createPerplexity({
            apiKey: process.env.PERPLEXITY_API_KEY || "",
          })

          console.log("HERE")
          response = await ask(prompt, perplexityModel("sonar-pro"))
          console.log(response)
          break

        default:
          throw new Error(`Unsupported AI model: ${model}`)
      }

      console.log(
        `Successfully executed command [/askdsqr] for user ${interaction.user.username}, using model ${model}`,
      )
      return interaction.editReply(response)
    } catch (error) {
      console.error(`Error with AI response:`, error)
      return interaction.editReply(
        "Sorry, I encountered an error while processing your request. Please try again later.",
      )
    }
  }
}

export { AskDsqrCommand }
