import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as interactionHandlers from './interactionHandlers.js';

export const interactionHandler = async (interaction) => {
  const { commandName: interactionName, options, user, guild, member } = interaction;


  try {
    const handler = interactionHandlers[`${interactionName}Handler`];

    if (typeof handler !== 'function') {
      console.warn(`No handler found for /${interactionName} command.`);
      return;
    }

    await handler(interaction);



  } catch (error) {
    console.error("Error in interaction command handler:", error);
    // } finally {
    //   await incrementUserCountHandler(message);
    //   // increment user count
    // }

  }
}



export const interactions = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDescription('Check bot responsiveness'),

  new SlashCommandBuilder()
    .setName('checkel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDescription('Check a user\'s role eligibility')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to check')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('setcount')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDescription('Set a user\'s message count')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to check')
        .setRequired(true)
    ).addIntegerOption(option =>
      option
        .setName('count')
        .setDescription('The message count to set')
        .setRequired(true)
    ),
]