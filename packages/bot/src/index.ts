import { Client, GatewayIntentBits, Events } from 'discord.js';
import { Database } from "bun:sqlite";
import { config } from 'dotenv';

config()

function setupDatabase() {
  const db = new Database("dsqr.local.sqlite", { create: true });
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS guilds (
      guild_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);
  
  return {
    insertGuild: db.prepare(`
      INSERT OR REPLACE INTO guilds (guild_id, name, owner_id)
      VALUES ($guildId, $name, $ownerId)
    `),
    removeGuild: db.prepare(`
      DELETE FROM guilds WHERE guild_id = $guildId
    `),
    getGuild: db.prepare(`
      SELECT * FROM guilds WHERE guild_id = $guildId
    `),
    getAllGuilds: db.prepare(`
      SELECT * FROM guilds
    `),
    db: db
  };
}


async function main() {  
  const { insertGuild, removeGuild, getGuild, getAllGuilds, db } = setupDatabase();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
    ],
  });
  
  client.once(Events.ClientReady, (readyClient) => {
      console.log(`Ready! Logged in as ${readyClient.user.tag}`);
      
      // Store existing guilds when bot starts
      readyClient.guilds.cache.forEach(guild => {
        insertGuild.run({
          $guildId: guild.id,
          $name: guild.name,
          $ownerId: guild.ownerId
        });
        console.log(`Stored existing guild: ${guild.name} (${guild.id})`);
      });
    });
  
    client.on(Events.Error, (error) => {
      console.error('Discord client error:', error);
    });
    
  // Guild join event - fires when the bot joins a new server
  client.on(Events.GuildCreate, (guild) => {
    console.log(`Joined a new guild: ${guild.name} (id: ${guild.id})`);
    console.log(`This guild has ${guild.memberCount} members`);
    
    // Store new guild in the database
    insertGuild.run({
      $guildId: guild.id,
      $name: guild.name,
      $ownerId: guild.ownerId
    });
  });
  
  // Guild delete event - fires when the bot is removed from a server
  client.on(Events.GuildDelete, (guild) => {
    console.log(`Removed from guild: ${guild.name} (id: ${guild.id})`);
    
    // Remove guild from the database
    removeGuild.run({
      $guildId: guild.id
    });
  });
  
  process.on('SIGINT', () => {
    console.log('Bot shutting down...');
    db.close();
    client.destroy();
    process.exit(0);
  });

  if (!process.env.DISCORD_BOT_TOKEN) {
    console.error("No bot token provided. Please add your token to the code.");
    process.exit(1);
  }

  try {
    await client.login(process.env.DISCORD_BOT_TOKEN);
  } catch (error) {
    console.error('Failed to login:', error);
    process.exit(1);
  }
}
await main();