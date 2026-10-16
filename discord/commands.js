import { isCommand, skipUser as hasStaffPermission } from './utils.js';
import { pongHandler, incrementUserCountHandler, targetUserResetHandler, invalidPermissionsHandler, setUserMessageCountHandler, checkEligibilityHandler, seeServerHandler, leaveServersHandler, optOutHandler } from './handlers.js';
import { PREFIXES, BOT_PREFIX, DYNO_PREFIX } from './constants.js';


export const commandHandler = async ({
  message,
  member,
  content,
  userName,
  args,
  command }) => {
  const usedPrefix = PREFIXES.find(prefix => content.startsWith(prefix));


  try {
    //catches using commands without permission
    if (usedPrefix && isCommand({ command, content }) && !hasStaffPermission(member)) {
      invalidPermissionsHandler({ content, command, userName });
      return;

    }

    // commands for our bot
    if (usedPrefix === BOT_PREFIX) {

      // ping command
      if (command === "ping") {
        pongHandler(message);
      }

      // manually set user message count
      if (command === "setcount") {
        await setUserMessageCountHandler({
          message,
          userId: args[0],
          count: Number(args[1])
        });
      }

      if (command === "checkel") {
        await checkEligibilityHandler({
          message,
          user: args[0]
        });
      }

      if (command === "seeservers") {
        await seeServerHandler({ message });
      }

      if (command === "leaveservers") {
        await leaveServersHandler({ message });
      }

      if (command === "optout") {
        await optOutHandler({ message });
      }
    }


    //Dyno commands
    if (usedPrefix === DYNO_PREFIX) {

      //catches using commands without permission
      if (!hasStaffPermission(member)) {
        invalidPermissionsHandler({ content, command, userName });
        return;
      }
      // reset target user's roles
      if (command === "mute" || command === "banf" || command === "kick" || command === "softbanf") {
        await targetUserResetHandler({ message, command, user: args[0] });
      }
    }

  } catch (error) {
    console.error("Error in command handler:", error);
  } finally {
    await incrementUserCountHandler(message);
    // increment user count
  }

}