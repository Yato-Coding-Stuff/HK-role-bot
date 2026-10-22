import 'dotenv/config';
import { skipUser as hasStaffPermission, getRoleEligibility, updateOptOutStatus } from '../utils.js';
import { messageHandler } from '../message.js';
import { ASSIGNABLE_ROLES, MESSAGE_PHASE } from '../constants.js';
import { getUserStatus, setUserMessageCount } from '../../db/helper.js';

// staff commands

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
  const userId = user.id;

  try {
    await messageHandler({
      interaction,
      command: "checkel",
      phase: START,
      context: { userId }
    });

    const targetMember = await interaction.guild.members.fetch(userId);

    const vcHasRole = targetMember.roles.cache.has(VC_ROLE);
    const imgHasRole = targetMember.roles.cache.has(IMG_ROLE);

    const {
      messageCount,
      joinedTimestamp,
      infractionTier,
      optedOut
    } = await getUserStatus(userId);

    const effectiveJoinedTimestamp =
      joinedTimestamp ?? targetMember.joinedTimestamp;

    await messageHandler({
      interaction,
      command: "checkel",
      phase: DONE,
      context: {
        userId,
        messageCount,
        joinedTimestamp: effectiveJoinedTimestamp,
        infractionTier,
        optedOut,
        vcHasRole,
        imgHasRole
      }
    });
  } catch (error) {
    console.error("Error checking user eligibility:", error);

    await messageHandler({
      interaction,
      command: "checkel",
      phase: ERROR,
      context: { error: error.message }
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


export const leaveserversHandler = async (interaction) => {
  const { START, DONE, ERROR } = MESSAGE_PHASE;

  try {
    await messageHandler({
      interaction,
      command: "leaveservers",
      phase: START
    });

    const guildsToLeave = client.guilds.cache.filter(
      guild =>
        guild.id !== HOME_GUILD_ID &&
        guild.id !== process.env.HOME_TEST_GUILD_ID
    );

    const left = [];
    const failed = [];

    await Promise.all(
      guildsToLeave.map(async (guild) => {
        try {
          await guild.leave();
          left.push(guild.name);
          console.log(`Left guild: ${guild.name} (${guild.id})`);
        } catch (error) {
          failed.push(guild.name);
          console.error(
            `Failed to leave guild ${guild.name} (${guild.id}):`,
            error
          );
        }
      })
    );

    await messageHandler({
      interaction,
      command: "leaveservers",
      phase: DONE,
      context: { left, failed }
    });
  } catch (error) {
    console.error("Error leaving servers:", error);

    await messageHandler({
      interaction,
      command: "leaveservers",
      phase: ERROR,
      context: { error: error.message }
    });
  }
};


// all commands

export const checkmeHandler = async (interaction) => {
  const { START, DONE, ERROR } = MESSAGE_PHASE;
  const { VC_ROLE, IMG_ROLE } = ASSIGNABLE_ROLES;

  const userId = interaction.user.id;

  try {
    await messageHandler({
      interaction,
      command: "checkme",
      phase: START,
      context: { userId },
      ephemeral: true
    });

    const member = await interaction.guild.members.fetch(userId);

    const vcHasRole = member.roles.cache.has(VC_ROLE);
    const imgHasRole = member.roles.cache.has(IMG_ROLE);

    const {
      messageCount,
      joinedTimestamp,
      infractionTier,
      optedOut
    } = await getUserStatus(userId);

    const effectiveJoinedTimestamp =
      joinedTimestamp ?? member.joinedTimestamp;

    const eligibleRoles = getRoleEligibility({
      messageCount,
      joinedTimestamp: effectiveJoinedTimestamp,
      infractionTier,
      optedOut
    });

    const roleMap = {
      VC: VC_ROLE,
      IMG: IMG_ROLE
    };

    for (const [roleName, roleId] of Object.entries(roleMap)) {
      if (!eligibleRoles.includes(roleName)) continue;
      if (member.roles.cache.has(roleId)) continue;

      try {
        await member.roles.add(roleId);

        console.log(
          `${member.user.tag}: Assigned ${roleName} role through checkme.`
        );
      } catch (error) {
        console.error(
          `Error assigning ${roleName} role through checkme:`,
          error
        );
      }
    }

    await messageHandler({
      interaction,
      command: "checkme",
      phase: DONE,
      context: {
        userId,
        messageCount,
        joinedTimestamp: effectiveJoinedTimestamp,
        infractionTier,
        optedOut,
        vcHasRole,
        imgHasRole
      }
    });
  } catch (error) {
    console.error("Error checking own eligibility:", error);

    await messageHandler({
      interaction,
      command: "checkme",
      phase: ERROR,
      context: {
        error: error.message
      }
    });
  }
};

export const optoutHandler = async (interaction) => {
  const { START, DONE, ERROR } = MESSAGE_PHASE;

  try {
    await messageHandler({
      interaction,
      command: "optout",
      phase: START,
      ephemeral: true
    });

    await updateOptOutStatus(interaction, true);

    await messageHandler({
      interaction,
      command: "optout",
      phase: DONE
    });
  } catch (error) {
    console.error("Error handling optout:", error);

    await messageHandler({
      interaction,
      command: "optout",
      phase: ERROR,
      context: { error: error.message }
    });
  }
};



export const optinHandler = async (interaction) => {
  const { START, DONE, ERROR } = MESSAGE_PHASE;

  try {
    await messageHandler({
      interaction,
      command: "optin",
      phase: START,
      ephemeral: true
    });

    await updateOptOutStatus(interaction, false);

    await messageHandler({
      interaction,
      command: "optin",
      phase: DONE
    });
  } catch (error) {
    console.error("Error handling optin:", error);

    await messageHandler({
      interaction,
      command: "optin",
      phase: ERROR,
      context: { error: error.message }
    });
  }
};