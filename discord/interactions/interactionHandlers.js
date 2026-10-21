import { skipUser as hasStaffPermission, getRoleEligibility } from '../utils.js';
import { messageHandler } from '../message.js';
import { ASSIGNABLE_ROLES, MESSAGE_PHASE } from '../constants.js';
import { getUserStatus, setUserMessageCount } from '../../db/helper.js';

//staff commands

export const setcountHandler = async (interaction) => {
  const { START, DONE, ERROR } = MESSAGE_PHASE;
  const { VC_ROLE, IMG_ROLE } = ASSIGNABLE_ROLES;
  const { member } = interaction;

  if (!hasStaffPermission(member)) return;

  const userId = interaction.options.getUser("user").id;
  const count = interaction.options.getInteger("count");

  let setCountMessage;

  try {
    setCountMessage = await messageHandler({
      interaction,
      command: "setcount",
      phase: START,
      context: { userId, count }
    });

    const { optedOut } = await getUserStatus(userId);

    if (optedOut) {
      await messageHandler({
        interaction,
        command: "setcount",
        phase: DONE,
        context: { userId, optedOut: true }
      });
      return;
    }

    const targetMember = await interaction.guild.members.fetch(userId);
    const joinedTimestamp = targetMember.joinedTimestamp;

    const {
      messageCount,
      joinedTimestamp: savedJoinedTimestamp,
      infractionTier
    } = await setUserMessageCount({
      userId,
      count,
      joinedTimestamp
    });

    const eligibleRoles = getRoleEligibility({
      messageCount,
      joinedTimestamp: savedJoinedTimestamp ?? joinedTimestamp,
      infractionTier,
      optedOut
    });

    const processRole = async (roleKey, roleId, roleName) => {
      if (targetMember.roles.cache.has(roleId)) return;
      if (!eligibleRoles.includes(roleKey)) return;

      try {
        await targetMember.roles.add(roleId);
        console.log(`Assigned ${roleName} role to ${targetMember.user.tag}`);
      } catch (error) {
        console.error(`Error assigning ${roleName} role:`, error);
      }
    };

    await processRole("VC", VC_ROLE, "Voice Chat");
    await processRole("IMG", IMG_ROLE, "Image");

    await messageHandler({
      interaction,
      command: "setcount",
      phase: DONE,
      context: { userId, count: messageCount }
    });
  } catch (error) {
    console.error("Error setting user message count:", error);

    await messageHandler({
      interaction,
      command: "setcount",
      phase: ERROR,
      context: { userId, error: error.message }
    });
  }
};

export const checkelHandler = async (interaction) => {


  const { START, DONE, ERROR } = MESSAGE_PHASE;
  const { VC_ROLE, IMG_ROLE } = ASSIGNABLE_ROLES;
  const { member } = interaction;

  if (!hasStaffPermission(member)) return;

  const user = interaction.options.getUser("user");
  const targetMember = await interaction.guild.members.fetch(
    interaction.options.getUser("user").id
  )
  const userId = user.id
  const vcHasRole = targetMember.roles.cache.has(VC_ROLE);
  const imgHasRole = targetMember.roles.cache.has(IMG_ROLE);

  let checkMessage;

  try {
    checkMessage = await messageHandler({
      interaction,
      command: "checkel",
      phase: START,
      context: { userId },
      sentMsg: checkMessage
    });


    const {
      messageCount,
      joinedTimestamp,
      infractionTier,
      optedOut
    } = await getUserStatus(userId);

    checkMessage = await messageHandler({
      interaction,
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
      interaction,
      command: "checkel",
      phase: ERROR,
      context: { error },
      sentMsg: checkMessage
    });
  }
};


export const pingHandler = async (interaction) => {
  const { member } = interaction;
  if (!hasStaffPermission(member)) return;

  const start = Date.now();

  await messageHandler({
    interaction,
    command: "ping",
    phase: MESSAGE_PHASE.START
  });

  const elapsed = Date.now() - start;

  await messageHandler({
    interaction,
    command: "ping",
    phase: MESSAGE_PHASE.DONE,
    context: { elapsed }
  });
};

export const checkserversHandler = async (interaction) => {
  const { member } = interaction;
  if (!hasStaffPermission(member)) return;
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


// export const leaveServersHandler = async ({ message }) => {
//   const { START, DONE, ERROR } = MESSAGE_PHASE;
//   let statusMsg;

//   try {
//     statusMsg = await messageHandler({
//       message,
//       command: "leaveservers",
//       phase: START,
//       sentMsg: statusMsg
//     });

//     const guildsToLeave = client.guilds.cache.filter(guild => guild.id !== HOME_GUILD_ID && guild.id !== process.env.HOME_TEST_GUILD_ID);
//     const left = [];
//     const failed = [];

//     await Promise.all(guildsToLeave.map(async (guild) => {
//       try {
//         await guild.leave();
//         left.push(guild.name);
//         console.log(`Left guild: ${guild.name} (${guild.id})`);
//       } catch (e) {
//         failed.push(guild.name);
//         console.error(`Failed to leave guild ${guild.name} (${guild.id}):`, e);
//       }
//     }));

//     statusMsg = await messageHandler({
//       message,
//       command: "leaveservers",
//       phase: DONE,
//       context: { left, failed },
//       sentMsg: statusMsg
//     });
//   } catch (e) {
//     console.error("Error leaving servers:", e);
//     statusMsg = await messageHandler({
//       message,
//       command: "leaveservers",
//       phase: ERROR,
//       context: { error: e },
//       sentMsg: statusMsg
//     });
//   }
// };


// export const targetUserResetHandler = async ({ message, command, user }) => {
//   const { VC_ROLE, IMG_ROLE, MUTED_ROLE } = ASSIGNABLE_ROLES;
//   const { START, DONE, ERROR } = MESSAGE_PHASE;

//   let targetUserMsg;

//   const userId = await resolveUserId({ user, guild: message.guild });

//   if (!userId) {
//     await message.channel.send(`❌ Could not resolve user \`${user}\` — try using their ID instead.`);
//     return;
//   }

//   targetUserMsg = await messageHandler({
//     message,
//     response: "targetuserreset",
//     phase: START,
//     context: { command, userId },
//     sentMsg: targetUserMsg
//   });

//   if (command !== "banf" || command === "kick") {
//     try {
//       await targetUserReset(userId, message.createdTimestamp);
//       // this might ALSO fail because dyno might remove the roles on mute before our bot can get to it
//       // so we can just try to remove the roles and if not it will reset them on message increment anyway
//       const member = await message.guild.members.fetch(userId);
//       if (member) {
//         await member.roles.remove([VC_ROLE, IMG_ROLE]);
//         // for whatever reason dyno sometimes doesnt add the muted role on mute, so we'll just add it ourselves
//         await member.roles.add(MUTED_ROLE);
//         console.log(`Removed assignable roles from user ${userId}`);

//       }

//       targetUserMsg = await messageHandler({
//         message,
//         response: "targetuserreset",
//         phase: DONE,
//         context: { userId },
//         sentMsg: targetUserMsg
//       });

//     } catch (err) {
//       console.error("Error resetting target user roles:", err);
//       targetUserMsg = await messageHandler({
//         message,
//         response: "targetuserreset",
//         phase: ERROR,
//         context: { error: err },
//         sentMsg: targetUserMsg
//       });
//     }
//   }

//   if (command === "banf" || command === "kick") {
//     try {
//       await targetUserReset(userId, message.createdTimestamp);
//       console.log(`Removed assignable roles from user ${userId}`);
//       targetUserMsg = await messageHandler({
//         message,
//         response: "targetuserreset",
//         phase: DONE,
//         context: { userId },
//         sentMsg: targetUserMsg
//       });

//     } catch (err) {
//       console.error("Error resetting target user roles:", err);
//       targetUserMsg = await messageHandler({
//         message,
//         response: "targetuserreset",
//         phase: ERROR,
//         context: { error: err },
//         sentMsg: targetUserMsg
//       });
//     }
//   }

// };

// export const optOutHandler = async ({ message, optedOut = true }) => {
//   const { START, DONE, ERROR } = MESSAGE_PHASE;
//   const { VC_ROLE, IMG_ROLE } = ASSIGNABLE_ROLES;

//   let statusMsg;
//   const command = optedOut ? "optout" : "optin";

//   try {
//     statusMsg = await messageHandler({
//       message,
//       command,
//       phase: START,
//       sentMsg: statusMsg
//     });

//     const member = await message.guild.members.fetch(message.author.id);

//     // Save the user's opt-out preference.
//     await setUserOptOutStatus(message.author.id, optedOut);

//     const roleMap = {
//       VC: VC_ROLE,
//       IMG: IMG_ROLE
//     };

//     if (optedOut) {
//       // Remove both roles when opting out.
//       for (const [roleName, roleId] of Object.entries(roleMap)) {
//         if (!member.roles.cache.has(roleId)) continue;

//         await member.roles.remove(roleId);
//         console.log(`${member.user.tag}: Removed ${roleName} role after opting out.`);
//       }
//     } else {
//       // Retrieve existing progress without resetting it.
//       const {
//         messageCount,
//         joinedTimestamp,
//         infractionTier,
//         optedOut
//       } = await getUserStatus(message.author.id);

//       const eligibleRoles = getRoleEligibility({
//         messageCount,
//         joinedTimestamp: joinedTimestamp ?? member.joinedTimestamp,
//         infractionTier,
//         optedOut
//       });

//       // Assign roles the user currently qualifies for.
//       for (const [roleName, roleId] of Object.entries(roleMap)) {
//         const isEligible = eligibleRoles.includes(roleName);

//         if (!isEligible) {
//           roleStatus.push({
//             role: roleName,
//             status: "not_eligible"
//           });
//           continue;
//         }

//         try {
//           await member.roles.add(roleId);

//           roleStatus.push({
//             role: roleName,
//             status: "assigned"
//           });

//           console.log(
//             `${member.user.tag}: Assigned ${roleName} role after opting in.`
//           );
//         } catch (error) {
//           roleStatus.push({
//             role: roleName,
//             status: "assignment_failed"
//           });

//           console.error(`Error assigning ${roleName} role:`, error);
//         }
//       }
//     }

//     await messageHandler({
//       message,
//       command,
//       phase: DONE,
//       sentMsg: statusMsg
//     });
//   } catch (error) {
//     console.error(`Error handling ${command}:`, error);

//     await messageHandler({
//       message,
//       command,
//       phase: ERROR,
//       sentMsg: statusMsg,
//       context: { error }
//     });
//   }
// };