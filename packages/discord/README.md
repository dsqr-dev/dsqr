<div align="center">

# DSQR Discord

[![Typescript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Discord](https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://www.discord.com/)

</div>

The DSQR discord package provides a simple and efficient way to get started with a Discord bot. It handles the initial plumbing, allowing you to build from the ground up to support all your needs.

- **Quick Start**: Get a bot running with minimal code, leveraging Discord.js and Bun's SQLite (or other databases upon request).
- **Customizable**: Add your own intents, commands, event handlers, and lifecycle callbacks.
- **Database Included**: Built-in SQLite support with guild tracking, fully extensible for custom tables and queries.
- **Type Safety**: Written in TypeScript with Zod validation for configuration.
- **Lifecycle Hooks**: Comprehensive callbacks for startup, readiness, shutdown, commands, errors, and more.

## ⇁ TOC

- [The Problems](#-the-problems)
- [The Solutions](#-the-solutions)
- [Installation](#-installation)
- [Getting Started](#-getting-started)
- [Custom Event Handlers](#-custom-event-handlers)
- [Extending the Database](#-extending-the-database)
- [Lifecycle Callbacks](#-lifecycle-callbacks)
- [Handling Errors and Shutdowns](#-handling-errors-and-shutdowns)
- [Nix Development Setup](#-nix-development-setup)
- [Tips for Success](#-tips-for-success)

## ⇁ The Problems

1. Setting up a Discord bot from scratch involves tedious boilerplate: initializing the client, managing events, registering commands, and handling persistence.
2. You need a starting point that's simple yet flexible enough to scale—whether it's custom commands, event handling, or database storage.
3. Managing environment variables and ensuring they're valid can be a hassle without a clear, type-safe approach.

## ⇁ The Solutions

1. DSQR Discord provides a pre-configured Discord.js client with built-in event handlers and SQLite integration, reducing setup time.
2. A modular design lets you customize intents, commands, event handlers, and lifecycle callbacks while exposing the full database for expansion.
3. A Zod-based configuration system validates environment variables, making setup reliable and straightforward.

## ⇁ Installation

Install using npm (or your preferred package manager):

```
bun add @dsqr/discord @ai-sdk/perplexity
```

If you're using Nix for development, see the [Nix Development Setup](#-nix-development-setup) section below.

## ⇁ Getting Started

DSQR Discord makes it incredibly easy to set up a Discord bot. The package handles all the complex boilerplate like client initialization, command registration, event handling, and database setup.

### How It Works

When you start your bot with `bot.start()`, DSQR Discord will:

1. Set up default event handlers (which can be overridden via `eventHandlers`)
2. Register your slash commands with Discord
3. Log in to Discord using your bot token
4. Call your `onStart` callback if provided
5. Automatically track guild membership in the database

The bot comes with sensible defaults but is fully customizable:

### Prerequisites

- A Discord bot token and client ID from the [Discord Developer Portal](https://discord.com/developers/applications).
- An `.env` file with required variables (see below).
- For the `ChatbotCommand`, a Perplexity API key (optional, add `PERPLEXITY_API_KEY=your-key` to `.env`).

### Basic Setup

1. **Set Up Environment Variables**:
   Create an `.env` file in your project root:

   ```
   DISCORD_BOT_TOKEN=your-bot-token
   DISCORD_CLIENT_ID=your-client-id
   DISCORD_DB_PATH=dsqr.local.db  # Optional, defaults to this
   PERPLEXITY_API_KEY=your-perplexity-key  # Optional, for ChatbotCommand
   ```

2. **Create Your Bot**:
   Here's a simple example with commands using `satisfies`:

   ```typescript
   // bot.ts
   import { local, dsqrDiscord, DsqrDiscordConfig } from "@dsqr/discord"
   import { GatewayIntentBits } from "discord.js"
   import { PingPongCommand } from "./commands/ping.ts"
   import { ChatbotCommand } from "./commands/chat.ts"

   // Load config from .env
   const config = local.getConfig()

   const botConfig = {
     botToken: config.discord.botToken,
     clientId: config.discord.clientId,
     database: { type: "sqlite", filename: config.discord.dbPath },
     intents: [GatewayIntentBits.GuildMessages],
     commands: [new PingPongCommand(), new ChatbotCommand()],
     callbacks: {
       onStart: () => console.log("Bot started!"),
       onReady: (client) => console.log(`Ready as ${client.user.tag}`),
       onError: (error) => console.error("Error:", error.message),
     },
   } satisfies DsqrDiscordConfig

   const bot = dsqrDiscord(botConfig)
   bot.start()
   ```

3. **Run Your Bot**:
   With Bun:
   ```
   bun run bot.ts
   ```

### Adding Commands

Here are two example commands:

- **PingPong Command**:

  ```typescript
  // commands/ping.ts
  import { Command } from "@dsqr/discord"
  import { SlashCommandBuilder } from "discord.js"

  export class PingPongCommand implements Command {
    name = "ping"
    slashCommandConfig = new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Replies with Pong!")

    async execute(interaction) {
      await interaction.reply("Pong!")
    }
  }
  ```

- **Simple Chatbot Command** with Perplexity:

  ```typescript
  // commands/chat.ts
  import { Command } from "@dsqr/discord"
  import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js"
  import { createPerplexity } from "@ai-sdk/perplexity"

  const perplexity = createPerplexity({
    apiKey: process.env.PERPLEXITY_API_KEY ?? "",
  })

  export class ChatbotCommand implements Command {
    name = "chat"
    slashCommandConfig = new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Chat with an AI assistant")
      .addStringOption((option) =>
        option
          .setName("message")
          .setDescription("Your message")
          .setRequired(true),
      )

    async execute(interaction: ChatInputCommandInteraction) {
      await interaction.deferReply()
      const message = interaction.options.getString("message")
      if (!message) return interaction.editReply("Please provide a message.")

      try {
        const response = await perplexity("sonar-pro").chat({
          messages: [{ role: "user", content: message }],
        })
        await interaction.editReply(response.choices[0].message.content)
      } catch (error) {
        console.error("Chat error:", error)
        await interaction.editReply(
          "Sorry, I couldn't respond. Try again later.",
        )
      }
    }
  }
  ```

## ⇁ Custom Event Handlers

You can override default event handlers or add new ones, and use the exposed `db.database` for custom queries. DSQR Discord automatically handles the following events: ClientReady, Error, GuildCreate, GuildDelete, and InteractionCreate, but you can customize any of these or add additional event handlers.

Here's an example logging messages to a custom table:

```typescript
// bot.ts
import { local, dsqrDiscord, DsqrDiscordConfig } from "@dsqr/discord"
import { GatewayIntentBits, Events } from "discord.js"
import { PingPongCommand } from "./commands/ping.ts"

const config = local.getConfig()

const botConfig = {
  botToken: config.discord.botToken,
  clientId: config.discord.clientId,
  database: { type: "sqlite", filename: config.discord.dbPath },
  intents: [GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  commands: [new PingPongCommand()],
  eventHandlers: {
    [Events.MessageCreate]: (message) => {
      if (message.author.bot) return
      const query =
        "INSERT INTO message_logs (guild_id, user_id, message) VALUES (?, ?, ?)"
      message.client.dsqrDiscord.db.database.run(query, [
        message.guildId,
        message.author.id,
        message.content,
      ])
      console.log(`Logged message from ${message.author.tag}`)
    },
  },
  callbacks: {
    onStart: () => console.log("Bot started!"),
  },
} satisfies DsqrDiscordConfig

const bot = dsqrDiscord(botConfig)
bot.start()
```

Note: This assumes a `message_logs` table exists (see "Extending the Database").

Note: You need `GatewayIntentBits.MessageContent` to read message content, which is a privileged intent that must be enabled in the Discord Developer Portal.

## ⇁ Extending the Database

The `db` object exposes `getGuild`, `getAllGuilds`, and the raw `database` instance, letting you run custom queries or add tables. Here's how to extend the database:

```typescript
// database/sqlite.ts
import { Database, Statement } from "bun:sqlite"

export interface SqliteDatabase {
  insertGuild: Statement
  removeGuild: Statement
  getGuild: Statement
  getAllGuilds: Statement
  database: Database
}

export function sqliteDatabase(
  filename: string = "dsqr.local.db",
): SqliteDatabase {
  const database = new Database(filename, { create: true })

  database.exec(`
    CREATE TABLE IF NOT EXISTS guilds (
      guild_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
    CREATE TABLE IF NOT EXISTS message_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT,
      user_id TEXT,
      message TEXT,
      timestamp INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `)

  return {
    insertGuild: database.prepare(
      "INSERT OR REPLACE INTO guilds (guild_id, name, owner_id) VALUES ($guildId, $name, $ownerId)",
    ),
    removeGuild: database.prepare(
      "DELETE FROM guilds WHERE guild_id = $guildId",
    ),
    getGuild: database.prepare(
      "SELECT * FROM guilds WHERE guild_id = $guildId",
    ),
    getAllGuilds: database.prepare("SELECT * FROM guilds"),
    database,
  }
}
```

Use it in your bot:

```typescript
bot.db.database.run(
  "INSERT INTO message_logs (guild_id, message) VALUES (?, ?)",
  ["123", "Test log"],
)
```

## ⇁ Lifecycle Callbacks

DSQR Discord provides several callback hooks to customize how your bot responds to different lifecycle events:

```typescript
callbacks: {
  // When the bot starts up
  onStart: () => console.log("Bot started!"),

  // When bot successfully connects to Discord
  onReady: (client) => console.log(`Ready as ${client.user.tag}`),

  // When the bot shuts down (via bot.stop() or SIGINT)
  onShutdown: () => console.log("Bot shutting down, goodbye!"),

  // When any error occurs in the bot
  onError: (error) => console.error("Bot error:", error.message),

  // After a command executes successfully
  onCommandSuccess: (interaction) => {
    console.log(`Command /${interaction.commandName} used by ${interaction.user.tag}`);
  },

  // When a command throws an error
  onCommandError: (error, interaction) => {
    console.error(`Error in /${interaction.commandName}:`, error.message);
  }
}
```

All callbacks are optional - implement only the ones you need. These hooks are perfect for:

- Logging and monitoring
- Metrics collection
- User experience tracking
- Database operations
- Custom error handling
- Graceful resource cleanup

## ⇁ Handling Errors and Shutdowns

DSQR Discord provides automatic error handling and graceful shutdowns:

1. **Error handling**: All errors are logged and passed to your `onError` callback if provided
2. **Command errors**: Command execution errors are caught and passed to your `onCommandError` callback
3. **Graceful shutdown**: The bot automatically handles SIGINT signals, closing the database connection and destroying the client
4. **Custom shutdown**: You can manually shut down the bot with `bot.stop()`

## ⇁ Nix Development Setup

DSQR Discord works well in a Nix development environment. Create a `flake.nix` file in your project root:

```nix
{
  description = "Discord bot with Bun and Vercel AI SDK";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };
  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            bun
            nodejs_22
            git
          ];
          shellHook = ''
            echo "🦉🦉🦉🦉🦉🦉🦉🦉🦉🦉🦉"
          '';
        };
        packages.default = pkgs.writeScriptBin "start-bot" ''
          #!/bin/sh
          bun run packages/bot/src/index.ts
        '';
      });
}
```

This setup provides:

1. A development shell with Bun, Node.js 22, and Git
2. A default package that runs your bot with Bun
3. A fun owl-filled shell greeting

To use this setup:

```bash
# Enter the development environment
nix develop

# Or run the bot directly (if you've enabled flakes)
nix run
```

## ⇁ Tips for Success

- Start with the minimal configuration (token, client ID, database) and add features as needed
- Use TypeScript's `satisfies` keyword with `DsqrDiscordConfig` to get type checking
- Add only the intents your bot needs for better security
- Implement lifecycle callbacks that make sense for your use case
- Access the Discord.js client directly via `bot.client` when needed
- Use the built-in database for simple persistence needs
- Consider using environment variables with the built-in Zod validation
- Remember that your existing code will continue to work as the library is backward compatible
