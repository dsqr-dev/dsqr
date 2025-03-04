# Discord Bot Library

A TypeScript library for creating Discord bots with a focus on functional programming and ease of use.

## Features

- TypeScript-first approach with full type safety
- Functional configuration pattern (similar to Next.js)
- Discord.js integration with simplified API
- SQLite database integration (via Bun)
- Custom event handlers
- AI service integration (Perplexity)

## Installation

```bash
bun add @dsqr/discord
```

## Quick Start

```typescript
import {
  defineConfig,
  createDsqrBot,
  Events,
  GatewayIntentBits,
} from "@dsqr/discord"

// Define your bot configuration
const config = defineConfig({
  // Discord configuration is required
  discord: {
    // Environment variables are used by default if not specified:
    // - DISCORD_BOT_TOKEN
    // - DISCORD_CLIENT_ID
    intents: [GatewayIntentBits.Guilds],
  },

  // Define event handlers
  events: {
    [Events.MessageCreate]: async (message) => {
      if (message.content === "!ping") {
        await message.reply("Pong!")
      }
    },
  },
})

// Create the bot
const bot = createDsqrBot(config)

// Start the bot
bot.start().catch((error) => {
  console.error("Failed to start bot:", error)
  process.exit(1)
})
```

## Custom Configuration

The library uses a functional configuration approach inspired by frameworks like Next.js:

```typescript
import {
  defineConfig,
  createDsqrBot,
  Events,
  GatewayIntentBits,
} from "@dsqr/discord"

// Define your bot configuration
const config = defineConfig({
  discord: {
    // You can provide tokens directly in config
    botToken: "your-bot-token",
    clientId: "your-client-id",

    // Configure intents based on what your bot needs
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  },

  // Custom database configuration (optional)
  database: {
    path: "my-custom-bot.sqlite",
  },

  // AI service configuration (optional)
  ai: {
    perplexity: {
      key: "your-perplexity-key", // Or use PERPLEXITY_KEY env var
    },
  },

  // Define custom event handlers
  events: {
    // Handle messages
    [Events.MessageCreate]: async (message) => {
      if (message.author.bot) return

      if (message.content === "!ping") {
        const reply = await message.reply("Pinging...")
        const latency = reply.createdTimestamp - message.createdTimestamp
        await reply.edit(`Pong! Latency is ${latency}ms`)
      }
    },

    // Handle interactions (slash commands, buttons, etc.)
    [Events.InteractionCreate]: async (interaction) => {
      if (!interaction.isChatInputCommand()) return

      if (interaction.commandName === "ping") {
        await interaction.reply("Pong!")
      }
    },
  },
})

// Create the bot
const bot = createDsqrBot(config)

// Start the bot
bot.start()

// Access the Discord.js client for additional customization
const { client } = bot

// Access the database
const { db } = bot

// Shutdown the bot gracefully
bot.shutdown()
```

## Environment Variables

The following environment variables are used by default:

```
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_DB_PATH=path-to-database.sqlite (optional)
PERPLEXITY_KEY=your-perplexity-api-key (optional)
```

## Examples

Check out the examples directory for more usage examples:

- [Basic bot](./examples/example-bot.ts): Shows how to create a simple bot with event handlers

## Development

```bash
# Install dependencies
bun install

# Run the example bot
bun run src/index.ts

# Run a specific example
bun run examples/example-bot.ts
```

This project uses [Bun](https://bun.sh) as its JavaScript runtime.
