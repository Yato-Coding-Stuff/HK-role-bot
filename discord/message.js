import {
  COMMAND_MESSAGES,
  MESSAGE_PHASE,
  RESPONSE_MESSAGES
} from "./constants.js";

export const messageHandler = async ({
  message,
  command,
  phase = MESSAGE_PHASE.START,
  context = {},
  sentMsg,
  type = "command"
}) => {
  const messageSet =
    type === "response" ? RESPONSE_MESSAGES : COMMAND_MESSAGES;

  const messages = messageSet[command];
  if (!messages || !messages[phase]) return sentMsg;

  const content =
    typeof messages[phase] === "function"
      ? messages[phase](context)
      : messages[phase];

  try {
    if (!sentMsg) {
      sentMsg = await message.channel.send(content);
    } else {
      await sentMsg.edit(content);
    }
  } catch (err) {
    console.error(
      `Error sending/updating ${type} message for ${command} [${phase}]:`,
      err
    );
  }

  return sentMsg;
};