import {
  MESSAGE_PHASE,
  COMMAND_MESSAGES,
} from "./constants.js";

import { MessageFlags } from "discord.js";


export const messageHandler = async ({
  interaction,
  command,
  phase = MESSAGE_PHASE.START,
  context = {},
  ephemeral = false
}) => {
  const messages = COMMAND_MESSAGES[command];
  if (!messages || !messages[phase]) return;

  const content =
    typeof messages[phase] === "function"
      ? messages[phase](context)
      : messages[phase];

  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content });
    } else {
      await interaction.reply({
        content,
        flags: ephemeral ? MessageFlags.Ephemeral : undefined
      });
    }
  } catch (err) {
    console.error(
      `Error sending/updating command message for ${command} [${phase}]:`,
      err
    );
  }
};