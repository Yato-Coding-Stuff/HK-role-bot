import { Client, GatewayIntentBits } from 'discord.js';
const { Guilds, GuildMessages, MessageContent } = GatewayIntentBits;
import { hasPermission, skipUser as hasStaffPermission } from './utils.js';
import { pongHandler, updateBulkRolesHandler, incrementUserCountHandler, targetUserResetHandler, invalidPermissionsHandler, roleRolloutHandler, setUserMessageCountHandler } from './handlers.js';
import { PREFIX, DYNO_PREFIX } from './constants.js';

const client = new Client({ intents: [Guilds, GuildMessages, MessageContent] });


client.on('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.login(process.env.DISCORD_TOKEN || 'YOUR_BOT_TOKEN');

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;


  const member = message.member || message.guild.members.cache.get(message.author.id);
  const content = message.content;

  // commands
  if (content.startsWith(PREFIX)) {
    let args = content.slice(PREFIX.length).trim().split(/\s+/);
    const command = args.shift().toLowerCase();

    if (!hasPermission(member)) {
      //catches all messages that start with prefix so kinda buggy but w/e
      invalidPermissionsHandler(message);
      return;
    }

    if (command === "ping") {
      pongHandler(message);
    }
    if (command === "updatebulkroles") {
      await updateBulkRolesHandler({
        command,
        vcRoleCount: Number(args[0]),
        imgRoleCount: Number(args[1])
      });
    }
    if (command === "rollout") {
      await roleRolloutHandler(message);
    }
    if (command === "targetuserreset") {
      await targetUserResetHandler({
        command,
        userId: args[0],
      });
    }
    if (command === "setcount") {
      await setUserMessageCountHandler({
        message,
        userId: args[0],
        count: Number(args[1])
      });
    }

  } else {
    // increment user count
    await incrementUserCountHandler(message);
  }

  if (content.startsWith(DYNO_PREFIX)) {
    let args = content.slice(DYNO_PREFIX.length).trim().split(/\s+/);
    const command = args.shift().toLowerCase();

    if (!hasStaffPermission(member)) {
      //catches all messages that start with prefix so kinda buggy but w/e
      invalidPermissionsHandler(message);
      return;
    }

    if (command === "mute" || command === "banf" || command === "kick") {
      //cmd doesnt work for sending channel message but doesnt matter as long as it works for db
      await targetUserResetHandler({ command, userId: Number(args[0]) });
    }
  }
});


export { client as discordClient };
