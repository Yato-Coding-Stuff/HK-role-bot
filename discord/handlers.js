import { discordClient as client } from './discord.js';
import { skipUser, getRoleEligibility } from './utils.js';
import { updateUserMessageCount, targetUserReset, setUserMessageCount, getUserStatus } from '../db/helper.js';
import { ASSIGNABLE_ROLES, MESSAGE_PHASE, COMMAND_LIST, HOME_GUILD_ID } from './constants.js';
import { messageHandler } from './message.js';




export const incrementUserCountHandler = async ({ userId, userName, joinedTimestamp, roles }) => {
  const { VC_ROLE, IMG_ROLE } = ASSIGNABLE_ROLES;

  try {
    const {
      messageCount,
      savedJoinedTimestamp,
      infractionTier,
      optedOut
    } = await updateUserMessageCount({
      userId,
      userName,
      joinedTimestamp
    });

    if (optedOut) return;

    const eligibleRoles = getRoleEligibility({
      messageCount,
      joinedTimestamp: savedJoinedTimestamp,
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
export const syncRestoredRolesHandler = async ({
  oldRoles,
  newRoles,
  userId,
  userName
}) => {
  const { VC_ROLE, IMG_ROLE } = ASSIGNABLE_ROLES;

  const vcAdded =
    newRoles.cache.has(VC_ROLE) &&
    !oldRoles.cache.has(VC_ROLE);

  const imgAdded =
    newRoles.cache.has(IMG_ROLE) &&
    !oldRoles.cache.has(IMG_ROLE);

  if (!vcAdded && !imgAdded) return;

  try {
    const {
      messageCount,
      joinedTimestamp,
      infractionTier,
      optedOut
    } = await getUserStatus(userId);

    const eligibleRoles = getRoleEligibility({
      messageCount,
      joinedTimestamp,
      infractionTier,
      optedOut
    });

    const rolesToStrip = [
      ...(vcAdded && !eligibleRoles.includes("VC") ? [VC_ROLE] : []),
      ...(imgAdded && !eligibleRoles.includes("IMG") ? [IMG_ROLE] : [])
    ];

    if (rolesToStrip.length) {
      await newRoles.remove(rolesToStrip);

      console.log(
        `Stripped ineligible restored role(s) from ${userName}: ${rolesToStrip.join(", ")}`
      );
    }
  } catch (error) {
    console.error(`Error syncing restored roles for ${userName}:`, error);
  }
};





