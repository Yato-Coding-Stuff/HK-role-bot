import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { interactions } from './discord/interactions/interactions.js';
import { HOME_GUILD_ID } from './discord/constants.js';

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

try {
  console.log(`Registering ${interactions.length} slash command(s)...`);

  const data = await rest.put(
    Routes.applicationGuildCommands(process.env.DISCORD_APP_ID, HOME_GUILD_ID),
    { body: interactions }
  );

  console.log(`Successfully registered ${data.length} command(s).`);
} catch (error) {
  console.error('Failed to register slash commands:', error);
}