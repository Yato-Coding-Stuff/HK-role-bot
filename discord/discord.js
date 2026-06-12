import { Client, GatewayIntentBits } from 'discord.js';
const { Guilds, GuildMessages, MessageContent } = GatewayIntentBits;


import { commandHandler } from './commands.js';
import { HOME_GUILD_ID } from './constants.js';

const client = new Client({ intents: [Guilds, GuildMessages, MessageContent] });


client.on('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.login(process.env.DISCORD_TOKEN || 'YOUR_BOT_TOKEN');

client.on('guildCreate', async (guild) => {
  if (guild.id !== HOME_GUILD_ID) {
    console.log(`Unauthorized guild join attempt: ${guild.name} (${guild.id}). Leaving.`);
    await guild.leave();
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;
  if (message.guild.id !== HOME_GUILD_ID) return;

  const member = message.member || message.guild.members.cache.get(message.author.id);
  const content = message.content;
  const userName = message.author.tag;
  const args = content.slice(1).trim().split(/\s+/);
  const command = args.shift().toLowerCase();


  await commandHandler({
    message,
    member,
    content,
    userName,
    args,
    command
  });

});


export { client as discordClient };
