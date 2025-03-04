import { sqliteDatabase, SqliteDatabase } from "@/database/sqlite.js"
import {
  Client,
  GatewayIntentBits,
  Events,
  Interaction,
  Routes,
  REST as DiscordRestClient,
  ChatInputCommandInteraction,
} from "discord.js"
import { Command } from "@/command.js"

/** @todo "sqlite" | "mysql" */
type DsqrDiscordDatabaseType = "sqlite"

interface DsqrDiscordDatabaseBase {
  type: DsqrDiscordDatabaseType
}

interface DsqrDiscordSQLiteDatabase extends DsqrDiscordDatabaseBase {
  type: "sqlite"
  filename: string
}

type DsqrDiscordDatabase = DsqrDiscordSQLiteDatabase

interface DsqrDiscordConfig {
  botToken: string
  clientId: string
  database: DsqrDiscordDatabase
  commands?: Command[]
}

interface DsqrDiscord {
  client: Client
  db: Pick<SqliteDatabase, "getGuild" | "getAllGuilds">
  start: () => Promise<void>
  stop: () => void
}

function dsqrDiscord(config: DsqrDiscordConfig): DsqrDiscord {
  const { botToken, clientId, database, commands } = config

  let db: SqliteDatabase

  switch (database.type) {
    case "sqlite":
      db = sqliteDatabase(database.filename)
      break
    default:
      throw new Error(`Unsupported database type: ${database.type}`)
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  })

  const restClient = new DiscordRestClient().setToken(botToken)

  const setupEventHandlers = () => {
    client.once(Events.ClientReady, (readyClient) => {
      console.log(`Ready! Logged in as ${readyClient.user.tag}`)
      readyClient.guilds.cache.forEach((guild) => {
        db.insertGuild.run({
          $guildId: guild.id,
          $name: guild.name,
          $ownerId: guild.ownerId,
        })
        console.log(`Stored existing guild: ${guild.name} (${guild.id})`)
      })
    })

    client.on(Events.Error, (error) => {
      console.error("Discord client error:", error)
    })

    client.on(Events.GuildCreate, (guild) => {
      console.log(`Joined a new guild: ${guild.name} (id: ${guild.id})`)
      console.log(`This guild has ${guild.memberCount} members`)
      db.insertGuild.run({
        $guildId: guild.id,
        $name: guild.name,
        $ownerId: guild.ownerId,
      })
    })

    client.on(Events.GuildDelete, (guild) => {
      console.log(`Removed from guild: ${guild.name} (id: ${guild.id})`)
      db.removeGuild.run({ $guildId: guild.id })
    })

    client.on(Events.InteractionCreate, async (interaction: Interaction) => {
      if (interaction.isCommand()) {
        await handleInteraction(interaction as ChatInputCommandInteraction)
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
    } catch (err) {
      console.error(
        `Error executing command [/${interaction.commandName}]: ${err}`,
        {
          guild: { id: interaction.guildId, name: interaction.guild?.name },
          user: { name: interaction.user.tag },
        },
      )
    }
  }

  const registerSlashCommands = async (commands: Command[]) => {
    const slashCommands = commands.map((command: Command) =>
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
    }
  }

  const start = async () => {
    setupEventHandlers()
    if (commands) await registerSlashCommands(commands)
    try {
      await client.login(botToken)
    } catch (error) {
      console.error("Failed to start bot:", error)
      throw error
    }
  }

  const stop = () => {
    try {
      db.database.close()
      client.destroy()
      console.log("Bot has been shut down")
    } catch (error) {
      console.error("Error during shutdown:", error)
    }
  }

  process.on("SIGINT", stop)

  return {
    start,
    stop,
    client,
    db: {
      getGuild: db.getGuild,
      getAllGuilds: db.getAllGuilds,
    },
  }
}

export {
  dsqrDiscord,
  type DsqrDiscord,
  type DsqrDiscordConfig,
  type DsqrDiscordDatabase,
}
