import { generateText, type LanguageModel } from "ai";

const ask = async (
    prompt: string,
    model: LanguageModel,
    options: {
      maxLength?: number;
      systemPrompt?: string;
    } = {}
  ) => {
    const { maxLength = 1900, systemPrompt } = options;
    
    console.log("HERE")
    const { text } = await generateText({
      model,
      prompt,
      system: systemPrompt || 
        `You are a helpful AI assistant answering questions in a Discord server. 
        Keep your responses concise and under ${maxLength} characters as Discord has message length limitations.
        Format your response appropriately for readability in Discord.
        If the answer would be too long, summarize the key points.`,
    });
    console.log("now ", text)
    // Ensure response stays within Discord's character limit
    if (text.length <= maxLength) {
      return text;
    }
    
    // If response is too long, truncate and add a message about truncation
    return text.substring(0, maxLength - 100) + 
      "\n\n*Response truncated due to Discord's character limit. For a complete answer, consider refining your question.*";
  };

  export { ask }