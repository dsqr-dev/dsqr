import { sqliteDatabase, SqliteDatabase } from "./database/sqlite.js"
import {
  Client,
  GatewayIntentBits,
  Events,
  Interaction,
  Routes,
  REST as DiscordRestClient,
  ChatInputCommandInteraction,
  ClientOptions,
  ClientEvents,
} from "discord.js"
import { Command } from "./command.js"

type DsqrDiscordDatabaseType = "sqlite"

interface DsqrDiscordDatabaseBase {
  type: DsqrDiscordDatabaseType
}

interface DsqrDiscordSQLiteDatabase extends DsqrDiscordDatabaseBase {
  type: "sqlite"
  filename: string
}

type DsqrDiscordDatabase = DsqrDiscordSQLiteDatabase

type EventHandler<K extends keyof ClientEvents> = (
  ...args: ClientEvents[K]
) => void | Promise<void>

/** Callbacks for key lifecycle and interaction events */
interface DsqrDiscordCallbacks {
  onStart?: () => void | Promise<void>
  onReady?: (client: Client<true>) => void | Promise<void>
  onShutdown?: () => void | Promise<void>
  onError?: (error: Error) => void
  onCommandSuccess?: (
    interaction: ChatInputCommandInteraction,
  ) => void | Promise<void>
  onCommandError?: (
    error: Error,
    interaction: ChatInputCommandInteraction,
  ) => void | Promise<void>
}

interface DsqrDiscordConfig {
  botToken: string
  clientId: string
  database: DsqrDiscordDatabase
  commands?: Command[]
  intents?: GatewayIntentBits[]
  clientOptions?: Partial<ClientOptions>
  eventHandlers?: Partial<{
    [K in keyof ClientEvents]: EventHandler<K>
  }>
  callbacks?: DsqrDiscordCallbacks
}

interface DsqrDiscord {
  client: Client
  db: Pick<SqliteDatabase, "getGuild" | "getAllGuilds" | "database">
  start: () => Promise<void>
  stop: () => void
}

function dsqrDiscord(config: DsqrDiscordConfig): DsqrDiscord {
  const {
    botToken,
    clientId,
    database,
    commands,
    intents = [],
    clientOptions = {},
    eventHandlers = {},
    callbacks = {},
  } = config

  const {
    onStart,
    onReady,
    onShutdown,
    onError,
    onCommandSuccess,
    onCommandError,
  } = callbacks

  if (!botToken) throw new Error("botToken is required")
  if (!clientId) throw new Error("clientId is required")

  let db: SqliteDatabase

  switch (database.type) {
    case "sqlite":
      db = sqliteDatabase(database.filename)
      break
    default:
      throw new Error(`Unsupported database type: ${database.type}`)
  }

  const mergedIntents = [GatewayIntentBits.Guilds, ...intents]
  const client = new Client({
    intents: mergedIntents,
    ...clientOptions,
  })

  const restClient = new DiscordRestClient().setToken(botToken)

  const setupDefaultEventHandlers = () => {
    const defaultHandlers: Partial<{
      [K in keyof ClientEvents]: EventHandler<K>
    }> = {
      [Events.ClientReady]: (readyClient) => {
        console.log(`Ready! Logged in as ${readyClient.user.tag}`)
        readyClient.guilds.cache.forEach((guild) => {
          db.insertGuild.run({
            $guildId: guild.id,
            $name: guild.name,
            $ownerId: guild.ownerId,
          })
          console.log(`Stored existing guild: ${guild.name} (${guild.id})`)
        })
        onReady?.(readyClient)
      },
      [Events.Error]: (error) => {
        console.error("Discord client error:", error)
        onError?.(error)
      },
      [Events.GuildCreate]: (guild) => {
        console.log(`Joined a new guild: ${guild.name} (id: ${guild.id})`)
        console.log(`This guild has ${guild.memberCount} members`)
        db.insertGuild.run({
          $guildId: guild.id,
          $name: guild.name,
          $ownerId: guild.ownerId,
        })
      },
      [Events.GuildDelete]: (guild) => {
        console.log(`Removed from guild: ${guild.name} (id: ${guild.id})`)
        db.removeGuild.run({ $guildId: guild.id })
      },
      [Events.InteractionCreate]: async (interaction: Interaction) => {
        if (interaction.isCommand()) {
          await handleInteraction(interaction as ChatInputCommandInteraction)
        }
      },
    }

    const finalHandlers = { ...defaultHandlers, ...eventHandlers }

    Object.entries(finalHandlers).forEach(([event, handler]) => {
      if (event === Events.ClientReady) {
        client.once(event, handler as any)
      } else {
        client.on(event, handler as any)
      }
    })
  }

  const handleInteraction = async (
    interaction: ChatInputCommandInteraction,
  ): Promise<void> => {
    const commandName = interaction.commandName
    const matchedCommand = commands?.find(
      (command) => command.name === commandName,
    )

    if (!matchedCommand) {
      console.warn(`Command not matched: /${commandName}`)
      return
    }

    try {
      await matchedCommand.execute(interaction)
      console.log(
        `Successfully executed command [/${interaction.commandName}]`,
        {
          guild: { id: interaction.guildId, name: interaction.guild?.name },
          user: { name: interaction.user.tag },
        },
      )
      await onCommandSuccess?.(interaction)
    } catch (err) {
      console.error(
        `Error executing command [/${interaction.commandName}]: ${err}`,
        {
          guild: { id: interaction.guildId, name: interaction.guild?.name },
          user: { name: interaction.user.tag },
        },
      )
      const error = err instanceof Error ? err : new Error(String(err))
      await onCommandError?.(error, interaction)
      onError?.(error)
    }
  }

  const registerSlashCommands = async (commands: Command[]) => {
    const slashCommands = commands.map((command) =>
      command.slashCommandConfig.toJSON(),
    )
    try {
      const data = (await restClient.put(Routes.applicationCommands(clientId), {
        body: slashCommands,
      })) as Array<any>
      console.log(
        `Successfully registered ${data.length} global application (/) commands`,
      )
    } catch (error) {
      console.error("Error registering application (/) commands", error)
      onError?.(error instanceof Error ? error : new Error(String(error)))
    }
  }

  const start = async () => {
    setupDefaultEventHandlers()
    if (commands) await registerSlashCommands(commands)
    try {
      await client.login(botToken)
      await onStart?.()
    } catch (error) {
      console.error("Failed to start bot:", error)
      onError?.(error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  const stop = async () => {
    try {
      db.database.close()
      client.destroy()
      await onShutdown?.()
      console.log("Bot has been shut down")
    } catch (error) {
      console.error("Error during shutdown:", error)
      onError?.(error instanceof Error ? error : new Error(String(error)))
    }
  }

  process.on("SIGINT", async () => {
    await stop()
    process.exit(0)
  })

  return {
    start,
    stop,
    client,
    db: {
      getGuild: db.getGuild,
      getAllGuilds: db.getAllGuilds,
      database: db.database,
    },
  }
}

export {
  dsqrDiscord,
  type DsqrDiscord,
  type DsqrDiscordConfig,
  type DsqrDiscordDatabase,
}
