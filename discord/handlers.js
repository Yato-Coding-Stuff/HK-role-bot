import { discordClient as client } from './discord.js';
import { skipUser, formatElapsedSeconds } from './utils.js';
import { updateUserMessageCount, updateBulkRoleCount, targetUserReset, fetchEligibleUsers, setUserMessageCount } from '../db/helper.js';
import { ASSIGNABLE_ROLES, MESSAGE_PHASE } from './constants.js';
import { messageHandler } from './message.js';


// each time a user types we bump their count by 1
// unless staff or bot
export const incrementUserCountHandler = async (message) => {
  let member = message.member || (message.guild && message.guild.members.cache.get(message.author.id));

  if (!member && message.guild) {
    try {
      member = await message.guild.members.fetch(message.author.id);
    } catch {
      return;
    }
  }

  if (!member || skipUser(member)) return;

  try {
    const updatedUser = await updateUserMessageCount(message.author.id);

    const roleIds = member.roles.cache.map(role => role.id);
    const { has_role_vc, has_role_image, messageCount } = updatedUser;

    // weird catch where dyno our bot does not take roles fast enough before a dyno mute
    // dyno will then assign back roles after mute was done
    // this will see if the messageCount is reset and if the user has roles, take them away
    if (
      messageCount < 150 &&
      (
        roleIds.includes(ASSIGNABLE_ROLES.vcRole) ||
        roleIds.includes(ASSIGNABLE_ROLES.imgRole)
      )
    ) {
      try {
        await member.roles.remove([ASSIGNABLE_ROLES.vcRole, ASSIGNABLE_ROLES.imgRole]);
        console.log(`Removed assignable roles from ${member.user.tag} due to message count reset to ${messageCount}`);
      } catch (error) {
        console.error("Error removing roles after message count reset:", error);
      }
    }

    if (has_role_vc) {
      if (!roleIds.includes(ASSIGNABLE_ROLES.vcRole)) {

        try {
          await member.roles.add(ASSIGNABLE_ROLES.vcRole)
          console.log(`${member.user.tag} reached message count of ${updatedUser.messageCount} for VC role, assigned`)
        } catch (error) {
          console.error("Error assigning VC role:", error);
        }
      }
    }

    if (has_role_image) {
      if (!roleIds.includes(ASSIGNABLE_ROLES.imgRole)) {
        try {
          await member.roles.add(ASSIGNABLE_ROLES.imgRole)
          console.log(`${member.user.tag} reached message count of ${updatedUser.messageCount} for Image role, assigned`)

        } catch (error) {
          console.error("Error assigning Image role:", error);
        }
      }
    }


  } catch (e) {
    console.error("Error updating message count on messageCreate:", e);
  }
};


export const setUserMessageCountHandler = async ({ message, userId, count }) => {
  let setCountMessage;
  let rolesAssigned = [];
  try {
    setCountMessage = await messageHandler({
      message,
      command: "setcount",
      phase: MESSAGE_PHASE.START,
      context: { userId, count },
      sentMsg: setCountMessage
    });
    await setUserMessageCount({ userId, count });

    const member = await message.guild.members.fetch(userId);
    const roleIds = member.roles.cache.map(role => role.id);

    if (count >= 150) {
      if (!roleIds.includes(ASSIGNABLE_ROLES.vcRole)) {

        try {
          await member.roles.add(ASSIGNABLE_ROLES.vcRole)
          rolesAssigned.push('VC');
          console.log(`${member.user.tag} assigned VC role for set count of ${count}`)

        } catch (error) {
          setCountMessage = await messageHandler({
            message,
            command: "setcount",
            phase: MESSAGE_PHASE.ERROR,
            context: { error: e },
            sentMsg: setCountMessage
          });
          console.error("Error assigning VC role:", error);
        }
      }
    }

    if (count >= 300) {
      if (!roleIds.includes(ASSIGNABLE_ROLES.imgRole)) {

        try {
          await member.roles.add(ASSIGNABLE_ROLES.imgRole)
          rolesAssigned.push('VC');
          console.log(`${member.user.tag} assigned Image role for set count of ${count}`)


        } catch (error) {
          setCountMessage = await messageHandler({
            message,
            command: "setcount",
            phase: MESSAGE_PHASE.ERROR,
            context: { error: e },
            sentMsg: setCountMessage
          });
          console.error("Error assigning VC role:", error);
        }
      }
    }


    setCountMessage = await messageHandler({
      message,
      command: "setcount",
      phase: MESSAGE_PHASE.DONE,
      context: { userId, count, rolesAssigned },
      sentMsg: setCountMessage
    });
  } catch (e) {
    console.error("Error setting user message count:", e);
    setCountMessage = await messageHandler({
      message,
      command: "setcount",
      phase: MESSAGE_PHASE.ERROR,
      context: { error: e },
      sentMsg: setCountMessage
    });
  }

}



// get entire db doc
// iterate through users for roles
// update roles accordingly through discord API
export const updateBulkRolesHandler = async ({ message, vcRoleCount, imgRoleCount }) => {
  const startTime = Date.now();
  const elapsed = () => Math.floor((Date.now() - startTime) / 1000) + "s";

  let statusMsg;

  try {
    statusMsg = await messageHandler({
      message,
      command: "updatebulkroles",
      phase: MESSAGE_PHASE.START,
      context: { elapsed: elapsed() },
      sentMsg: statusMsg
    });

    await updateBulkRoleCount({ vcRoleCount, imgRoleCount });

    statusMsg = await messageHandler({
      message,
      command: "updatebulkroles",
      phase: MESSAGE_PHASE.DONE,
      context: { elapsed: elapsed() },
      sentMsg: statusMsg
    });
  } catch (err) {
    statusMsg = await messageHandler({
      message,
      command: "updatebulkroles",
      phase: MESSAGE_PHASE.ERROR,
      context: { error: err },
      sentMsg: statusMsg
    });
  }
};


export const pongHandler = async (message) => {
  const startTime = Date.now();
  const elapsed = () => (Date.now() - startTime) + "ms";

  let statusMsg;

  statusMsg = await messageHandler({
    message,
    command: "ping",
    phase: MESSAGE_PHASE.START,
    context: { elapsed: elapsed() },
    sentMsg: statusMsg
  });

  statusMsg = await messageHandler({
    message,
    command: "ping",
    phase: MESSAGE_PHASE.DONE,
    context: { elapsed: elapsed() },
    sentMsg: statusMsg
  });
};


export const targetUserResetHandler = async ({ message, command, userId }) => {

  let targetUserMsg;

  targetUserMsg = await messageHandler({
    message,
    command: "targetuserreset",
    phase: MESSAGE_PHASE.START,
    context: { command, userId },
    sentMsg: targetUserMsg
  });

  if (command !== "banf") {
    try {

      await targetUserReset(userId);

      // this will fail if the command is ban because the user wont be in the guild anymore
      const member = await message.guild.members.fetch(userId);
      if (member) {
        await member.roles.remove([ASSIGNABLE_ROLES.vcRole, ASSIGNABLE_ROLES.imgRole]);
        console.log(`Removed assignable roles from user ${userId}`);
      }

      targetUserMsg = await messageHandler({
        message,
        command: "targetuserreset",
        phase: MESSAGE_PHASE.DONE,
        context: { userId },
        sentMsg: targetUserMsg
      });

    } catch (err) {
      console.error("Error resetting target user roles:", err);
      targetUserMsg = await messageHandler({
        message,
        command: "targetuserreset",
        phase: MESSAGE_PHASE.ERROR,
        context: { err },
        sentMsg: targetUserMsg
      });
    }
  }

  if (command === "banf") {
    try {
      await targetUserReset(userId);
      console.log(`Removed assignable roles from user ${userId}`);
      targetUserMsg = await messageHandler({
        message,
        command: "targetuserreset",
        phase: MESSAGE_PHASE.DONE,
        context: { userId },
        sentMsg: targetUserMsg
      });

    } catch (err) {
      console.error("Error resetting target user roles:", err);
      targetUserMsg = await messageHandler({
        message,
        command: "targetuserreset",
        phase: MESSAGE_PHASE.ERROR,
        context: { err },
        sentMsg: targetUserMsg
      });
    }
  }

};


export const roleRolloutHandler = async (message) => {
  const allDbUsers = await fetchEligibleUsers();
  const BATCH_SIZE = 100;
  const startTime = Date.now();

  const elapsed = () => formatElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));

  let processed = {
    processed: 0,
    updated: 0,
    skipped: 0,
    left: allDbUsers.length,
  };

  let rolloutMsg = await messageHandler({
    message,
    command: "rollout",
    phase: MESSAGE_PHASE.START,
  });

  const messageInterval = setInterval(async () => {
    rolloutMsg = await messageHandler({
      message,
      command: "rollout",
      phase: MESSAGE_PHASE.PROGRESS,
      context: { processed, elapsed: elapsed() },
      sentMsg: rolloutMsg,
    });
  }, 1000);

  try {
    for (let i = 0; i < allDbUsers.length; i += BATCH_SIZE) {
      const batch = allDbUsers.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (dbUser) => {
        let updated = false;

        try {
          const member = await message.guild.members.fetch(dbUser.userId);

          const roleIds = member.roles.cache.map(r => r.id);

          if (dbUser.has_role_vc && !roleIds.includes(ASSIGNABLE_ROLES.vcRole)) {
            try {
              await member.roles.add(ASSIGNABLE_ROLES.vcRole);
              updated = true;
            } catch (err) {
              console.error(`Error assigning VC role to ${member.user.tag}:`, err);
            }
          }

          if (dbUser.has_role_image && !roleIds.includes(ASSIGNABLE_ROLES.imgRole)) {
            try {
              await member.roles.add(ASSIGNABLE_ROLES.imgRole);
              updated = true;
            } catch (err) {
              console.error(`Error assigning Image role to ${member.user.tag}:`, err);
            }
          }

          if (updated) processed.updated += 1;
          else processed.skipped += 1;

        } catch (err) {
          if (err.code === 10007) processed.skipped += 1; // Unknown Member
          else {
            console.error(`Error fetching member ${dbUser.userId}:`, err);
            processed.skipped += 1;
          }
        } finally {
          processed.left -= 1;
          processed.processed += 1;
        }
      }));

      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  } finally {
    clearInterval(messageInterval);

    rolloutMsg = await messageHandler({
      message,
      command: "rollout",
      phase: MESSAGE_PHASE.DONE,
      context: { processed, elapsed: elapsed() },
      sentMsg: rolloutMsg,
    });
  }

  console.log("Role rollout complete.");
};



export const invalidPermissionsHandler = async (message) => {
  console.log(`command was tried to issue by ${message.author.tag} with a message of \n ${message.content}`);
}