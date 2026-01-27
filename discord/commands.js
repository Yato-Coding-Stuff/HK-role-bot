import { isCommand, skipUser as hasStaffPermission } from './utils.js';
import { pongHandler, updateBulkRolesHandler, incrementUserCountHandler, targetUserResetHandler, invalidPermissionsHandler, roleRolloutHandler, setUserMessageCountHandler } from './handlers.js';
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

      // legacy (kept for transparency)
      // mass updates count threshold for each role
      if (command === "updatebulkroles") {
        await updateBulkRolesHandler({
          command,
          vcRoleCount: Number(args[0]),
          imgRoleCount: Number(args[1])
        });
      }
      // bulk rolls out roles for users in DB
      if (command === "rollout") {
        await roleRolloutHandler(message);
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
      if (command === "mute" || command === "banf" || command === "kick") {
        await targetUserResetHandler({ message, command, userId: args[0] });
      }
    }

  } catch (error) {
    console.error("Error in command handler:", error);
  } finally {
    await incrementUserCountHandler(message);
    // increment user count
  }

}