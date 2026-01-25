import { COMMAND_MESSAGES, MESSAGE_PHASE } from "./utils.js";



export const messageHandler = async ({
  message,
  command,
  phase = MESSAGE_PHASE.START,
  context = {},
  sentMsg
}) => {
  const messages = COMMAND_MESSAGES[command];
  if (!messages || !messages[phase]) return sentMsg;

  const content = typeof messages[phase] === "function"
    ? messages[phase](context)
    : messages[phase];

  try {
    if (!sentMsg) {
      sentMsg = await message.channel.send(content);
    } else {
      await sentMsg.edit(content);
    }
  } catch (err) {
    console.error(`Error sending/updating message for ${command} [${phase}]:`, err);
  }

  return sentMsg;
};