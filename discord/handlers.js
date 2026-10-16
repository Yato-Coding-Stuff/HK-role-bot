import { discordClient as client } from './discord.js';
import { skipUser, resolveUserId, getRoleEligibility } from './utils.js';
import { updateUserMessageCount, targetUserReset, setUserMessageCount, getUserStatus } from '../db/helper.js';
import { ASSIGNABLE_ROLES, MESSAGE_PHASE, COMMAND_LIST, HOME_GUILD_ID } from './constants.js';
import { messageHandler } from './message.js';




export const incrementUserCountHandler = async (message) => {
  if (message.guild?.id !== HOME_GUILD_ID) return;

  let member = message.member;

  if (!member) {
    try {
      member = await message.guild.members.fetch(message.author.id);
    } catch {
      return;
    }
  }

  if (!member || skipUser(member)) return;

  const { VC_ROLE, IMG_ROLE } = ASSIGNABLE_ROLES;
  const { tag } = member.user;

  try {
    const {
      messageCount = 0,
      joinedTimestamp,
      infractionTier = 1,
      optedOut = false
    } = await updateUserMessageCount(
      message.author.id,
      message.author.tag,
      member.joinedTimestamp
    );

    if (optedOut) {
      console.log(`${tag} has opted out of role assignment. skipping increment`);
      return;
    }


    const eligibleRoles = getRoleEligibility({
      messageCount,
      joinedTimestamp: joinedTimestamp ?? member.joinedTimestamp,
      infractionTier,
      optedOut
    });

    const roleMap = {
      VC: VC_ROLE,
      IMG: IMG_ROLE
    };

    for (const [roleName, roleId] of Object.entries(roleMap)) {
      const isEligible = eligibleRoles.includes(roleName);
      const hasRole = member.roles.cache.has(roleId);

      if (isEligible && !hasRole) {
        try {
          await member.roles.add(roleId);
          console.log(`${tag} assigned ${roleName} role.`);
        } catch (error) {
          console.error(`Error assigning ${roleName} role:`, error);
        }
      } else if (!isEligible && hasRole) {
        try {
          await member.roles.remove(roleId);
          console.log(`${tag} removed ineligible ${roleName} role.`);
        } catch (error) {
          console.error(`Error removing ${roleName} role:`, error);
        }
      }
    }

  } catch (error) {
    console.error("Error updating message count on messageCreate:", error);
  }
};


// Dyno restores a muted member's prior roles (including VC/Image) when their mute expires.
// Check newly restored roles against current eligibility and remove any they're no longer eligible for.
export const syncRestoredRolesHandler = async (oldMember, newMember) => {
  const { VC_ROLE, IMG_ROLE } = ASSIGNABLE_ROLES;

  const vcAdded =
    newMember.roles.cache.has(VC_ROLE) &&
    !oldMember.roles.cache.has(VC_ROLE);

  const imgAdded =
    newMember.roles.cache.has(IMG_ROLE) &&
    !oldMember.roles.cache.has(IMG_ROLE);

  if (!vcAdded && !imgAdded) return;

  const { tag } = newMember.user;

  try {
    const {
      messageCount,
      joinedTimestamp,
      infractionTier,
      optedOut
    } = await getUserStatus(newMember.id);

    const eligibility = getRoleEligibility({
      messageCount,
      joinedTimestamp: joinedTimestamp ?? newMember.joinedTimestamp,
      infractionTier,
      optedOut
    });

    const rolesToStrip = [
      ...(vcAdded && !eligibility.VC.eligible ? [VC_ROLE] : []),
      ...(imgAdded && !eligibility.IMG.eligible ? [IMG_ROLE] : [])
    ];

    if (rolesToStrip.length) {
      await newMember.roles.remove(rolesToStrip);

      console.log(
        `Stripped ineligible restored role(s) from ${tag}: ${rolesToStrip.join(", ")}`
      );
    }
  } catch (error) {
    console.error(`Error syncing restored roles for ${tag}:`, error);
  }
};


export const setUserMessageCountHandler = async ({ message, userId, count }) => {
  const { START, DONE, ERROR } = MESSAGE_PHASE;
  const { VC_ROLE, IMG_ROLE } = ASSIGNABLE_ROLES;

  let setCountMessage;

  try {
    setCountMessage = await messageHandler({
      message,
      command: "setcount",
      phase: START,
      context: { userId, count },
      sentMsg: setCountMessage
    });

    const member = await message.guild.members.fetch(userId);
    const { tag } = member.user;

    const { optedOut } = await getUserStatus(userId);

    if (optedOut) {
      await messageHandler({
        message,
        command: "setcount",
        phase: DONE,
        context: { userId, optedOut: true },
        sentMsg: setCountMessage
      });

      return;
    }

    const updatedUser = await setUserMessageCount({
      userId,
      count,
      joinedTimestamp: member.joinedTimestamp
    });

    const messageCount = updatedUser.messageCount ?? count;
    const joinedTimestamp =
      updatedUser.joinedTimestamp ?? member.joinedTimestamp;
    const infractionTier = updatedUser.infractionTier ?? 1;

    const eligibility = getRoleEligibilityDetails({
      messageCount,
      joinedTimestamp,
      infractionTier
    });

    const roleStatus = [];

    const processRole = async ({ name, roleId, details }) => {
      if (member.roles.cache.has(roleId)) {
        roleStatus.push({
          role: name,
          status: "already_has_role"
        });
        return;
      }

      if (!details.eligible) {
        roleStatus.push({
          role: name,
          status: "not_eligible"
        });
        return;
      }

      try {
        await member.roles.add(roleId);

        roleStatus.push({
          role: name,
          status: "assigned",
          reason: details.reason
        });

        console.log(`${tag} assigned ${name} role through ${details.reason}`);
      } catch (error) {
        roleStatus.push({
          role: name,
          status: "assignment_failed"
        });

        console.error(`Error assigning ${name} role:`, error);
      }
    };

    await processRole({
      name: "VC",
      roleId: VC_ROLE,
      details: eligibility.VC
    });

    await processRole({
      name: "Image",
      roleId: IMG_ROLE,
      details: eligibility.IMG
    });

    setCountMessage = await messageHandler({
      message,
      command: "setcount",
      phase: DONE,
      context: {
        userId,
        count: messageCount,
        roleStatus
      },
      sentMsg: setCountMessage
    });
  } catch (error) {
    console.error("Error setting user message count:", error);

    setCountMessage = await messageHandler({
      message,
      command: "setcount",
      phase: ERROR,
      context: { error },
      sentMsg: setCountMessage
    });
  }
};

export const checkEligibilityHandler = async ({ message, user }) => {
  const { START, DONE, ERROR } = MESSAGE_PHASE;
  const { VC_ROLE, IMG_ROLE } = ASSIGNABLE_ROLES;

  let checkMessage;
  let userId;

  try {
    userId = await resolveUserId({ user, guild: message.guild });

    if (!userId) {
      await message.channel.send(
        `❌ Could not resolve user \`${user}\` — try using their ID instead.`
      );
      return;
    }

    checkMessage = await messageHandler({
      message,
      command: "checkel",
      phase: START,
      context: { userId },
      sentMsg: checkMessage
    });

    const member = await message.guild.members.fetch(userId);

    const vcHasRole = member.roles.cache.has(VC_ROLE);
    const imgHasRole = member.roles.cache.has(IMG_ROLE);

    const {
      messageCount,
      joinedTimestamp,
      infractionTier,
      optedOut
    } = await getUserStatus(userId);

    checkMessage = await messageHandler({
      message,
      command: "checkel",
      phase: DONE,
      context: {
        userId,
        messageCount,
        joinedTimestamp: joinedTimestamp ?? member.joinedTimestamp,
        infractionTier,
        optedOut,
        vcHasRole,
        imgHasRole
      },
      sentMsg: checkMessage
    });
  } catch (error) {
    console.error("Error checking user eligibility:", error);

    checkMessage = await messageHandler({
      message,
      command: "checkel",
      phase: ERROR,
      context: { error },
      sentMsg: checkMessage
    });
  }
};


export const pongHandler = async (message) => {
  const { START, DONE } = MESSAGE_PHASE;
  const startTime = Date.now();
  const elapsed = () => (Date.now() - startTime) + "ms";

  let statusMsg;

  statusMsg = await messageHandler({
    message,
    command: "ping",
    phase: START,
    context: { elapsed: elapsed() },
    sentMsg: statusMsg
  });

  statusMsg = await messageHandler({
    message,
    command: "ping",
    phase: DONE,
    context: { elapsed: elapsed() },
    sentMsg: statusMsg
  });
};


export const seeServerHandler = async ({ message }) => {
  const { START, DONE, ERROR } = MESSAGE_PHASE;
  let statusMsg;

  try {
    statusMsg = await messageHandler({
      message,
      command: "seeservers",
      phase: START,
      sentMsg: statusMsg
    });

    const servers = client.guilds.cache.map(guild => ({
      name: guild.name,
      id: guild.id,
      memberCount: guild.memberCount
    }));

    statusMsg = await messageHandler({
      message,
      command: "seeservers",
      phase: DONE,
      context: { servers },
      sentMsg: statusMsg
    });
  } catch (e) {
    console.error("Error fetching servers:", e);
    statusMsg = await messageHandler({
      message,
      command: "seeservers",
      phase: ERROR,
      context: { error: e },
      sentMsg: statusMsg
    });
  }
};


export const leaveServersHandler = async ({ message }) => {
  const { START, DONE, ERROR } = MESSAGE_PHASE;
  let statusMsg;

  try {
    statusMsg = await messageHandler({
      message,
      command: "leaveservers",
      phase: START,
      sentMsg: statusMsg
    });

    const guildsToLeave = client.guilds.cache.filter(guild => guild.id !== HOME_GUILD_ID && guild.id !== process.env.HOME_TEST_GUILD_ID);
    const left = [];
    const failed = [];

    await Promise.all(guildsToLeave.map(async (guild) => {
      try {
        await guild.leave();
        left.push(guild.name);
        console.log(`Left guild: ${guild.name} (${guild.id})`);
      } catch (e) {
        failed.push(guild.name);
        console.error(`Failed to leave guild ${guild.name} (${guild.id}):`, e);
      }
    }));

    statusMsg = await messageHandler({
      message,
      command: "leaveservers",
      phase: DONE,
      context: { left, failed },
      sentMsg: statusMsg
    });
  } catch (e) {
    console.error("Error leaving servers:", e);
    statusMsg = await messageHandler({
      message,
      command: "leaveservers",
      phase: ERROR,
      context: { error: e },
      sentMsg: statusMsg
    });
  }
};


export const targetUserResetHandler = async ({ message, command, user }) => {
  const { VC_ROLE, IMG_ROLE, MUTED_ROLE } = ASSIGNABLE_ROLES;
  const { START, DONE, ERROR } = MESSAGE_PHASE;

  let targetUserMsg;

  const userId = await resolveUserId({ user, guild: message.guild });

  if (!userId) {
    await message.channel.send(`❌ Could not resolve user \`${user}\` — try using their ID instead.`);
    return;
  }

  targetUserMsg = await messageHandler({
    message,
    response: "targetuserreset",
    phase: START,
    context: { command, userId },
    sentMsg: targetUserMsg
  });

  if (command !== "banf" || command === "kick") {
    try {
      await targetUserReset(userId, message.createdTimestamp);
      // this might ALSO fail because dyno might remove the roles on mute before our bot can get to it
      // so we can just try to remove the roles and if not it will reset them on message increment anyway
      const member = await message.guild.members.fetch(userId);
      if (member) {
        await member.roles.remove([VC_ROLE, IMG_ROLE]);
        // for whatever reason dyno sometimes doesnt add the muted role on mute, so we'll just add it ourselves
        await member.roles.add(MUTED_ROLE);
        console.log(`Removed assignable roles from user ${userId}`);

      }

      targetUserMsg = await messageHandler({
        message,
        response: "targetuserreset",
        phase: DONE,
        context: { userId },
        sentMsg: targetUserMsg
      });

    } catch (err) {
      console.error("Error resetting target user roles:", err);
      targetUserMsg = await messageHandler({
        message,
        response: "targetuserreset",
        phase: ERROR,
        context: { error: err },
        sentMsg: targetUserMsg
      });
    }
  }

  if (command === "banf" || command === "kick") {
    try {
      await targetUserReset(userId, message.createdTimestamp);
      console.log(`Removed assignable roles from user ${userId}`);
      targetUserMsg = await messageHandler({
        message,
        response: "targetuserreset",
        phase: DONE,
        context: { userId },
        sentMsg: targetUserMsg
      });

    } catch (err) {
      console.error("Error resetting target user roles:", err);
      targetUserMsg = await messageHandler({
        message,
        response: "targetuserreset",
        phase: ERROR,
        context: { error: err },
        sentMsg: targetUserMsg
      });
    }
  }

};

export const optOutHandler = async ({ message, optedOut = true }) => {
  const { START, DONE, ERROR } = MESSAGE_PHASE;
  const { VC_ROLE, IMG_ROLE } = ASSIGNABLE_ROLES;

  let statusMsg;
  const command = optedOut ? "optout" : "optin";

  try {
    statusMsg = await messageHandler({
      message,
      command,
      phase: START,
      sentMsg: statusMsg
    });

    const member = await message.guild.members.fetch(message.author.id);

    // Save the user's opt-out preference.
    await setUserOptOutStatus(message.author.id, optedOut);

    const roleMap = {
      VC: VC_ROLE,
      IMG: IMG_ROLE
    };

    if (optedOut) {
      // Remove both roles when opting out.
      for (const [roleName, roleId] of Object.entries(roleMap)) {
        if (!member.roles.cache.has(roleId)) continue;

        await member.roles.remove(roleId);
        console.log(`${member.user.tag}: Removed ${roleName} role after opting out.`);
      }
    } else {
      // Retrieve existing progress without resetting it.
      const {
        messageCount,
        joinedTimestamp,
        infractionTier,
        optedOut
      } = await getUserStatus(message.author.id);

      const eligibleRoles = getRoleEligibility({
        messageCount,
        joinedTimestamp: joinedTimestamp ?? member.joinedTimestamp,
        infractionTier,
        optedOut
      });

      // Assign roles the user currently qualifies for.
      for (const [roleName, roleId] of Object.entries(roleMap)) {
        const isEligible = eligibleRoles.includes(roleName);

        if (!isEligible) {
          roleStatus.push({
            role: roleName,
            status: "not_eligible"
          });
          continue;
        }

        try {
          await member.roles.add(roleId);

          roleStatus.push({
            role: roleName,
            status: "assigned"
          });

          console.log(
            `${member.user.tag}: Assigned ${roleName} role after opting in.`
          );
        } catch (error) {
          roleStatus.push({
            role: roleName,
            status: "assignment_failed"
          });

          console.error(`Error assigning ${roleName} role:`, error);
        }
      }
    }

    await messageHandler({
      message,
      command,
      phase: DONE,
      sentMsg: statusMsg
    });
  } catch (error) {
    console.error(`Error handling ${command}:`, error);

    await messageHandler({
      message,
      command,
      phase: ERROR,
      sentMsg: statusMsg,
      context: { error }
    });
  }
};

export const invalidPermissionsHandler = async ({ content, command, userName }) => {
  if (!COMMAND_LIST.includes(command)) return;
  console.log(`command "${content[0], command}" was tried to issue by ${userName} with a message of \n ${content}`);
}