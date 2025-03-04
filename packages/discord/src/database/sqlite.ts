import { Database, Statement } from "bun:sqlite"

interface SqliteDatabase {
  insertGuild: Statement
  removeGuild: Statement
  getGuild: Statement
  getAllGuilds: Statement
  database: Database
}

function sqliteDatabase(filename: string = "dsqr.local.db"): SqliteDatabase {
  const database = new Database(filename, { create: true })

  database.exec(`
        CREATE TABLE IF NOT EXISTS guilds (
          guild_id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          owner_id TEXT,
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
      `)

  return {
    insertGuild: database.prepare(`
            INSERT OR REPLACE INTO guilds (guild_id, name, owner_id)
            VALUES ($guildId, $name, $ownerId)
        `),
    removeGuild: database.prepare(`
            DELETE FROM guilds WHERE guild_id = $guildId
        `),
    getGuild: database.prepare(`
            SELECT * FROM guilds WHERE guild_id = $guildId
        `),
    getAllGuilds: database.prepare(`
            SELECT * FROM guilds
        `),
    database: database,
  }
}

export { sqliteDatabase, type SqliteDatabase }
