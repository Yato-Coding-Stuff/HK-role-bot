
import { getRoleEligibility } from './utils.js';
import { updateUserMessageCount, getUserStatus } from '../db/helper.js';
import { ASSIGNABLE_ROLES, } from './constants.js';





export const incrementUserCountHandler = async ({
  userId,
  userName,
  joinedTimestamp,
  roles
}) => {
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

    const effectiveJoinedTimestamp =
      savedJoinedTimestamp ?? joinedTimestamp;

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
      const isEligible = eligibleRoles.includes(roleName);
      const hasRole = roles.cache.has(roleId);

      if (isEligible && !hasRole) {
        try {
          await roles.add(roleId);
          console.log(`${userName} assigned ${roleName} role.`);
        } catch (error) {
          console.error(`Error assigning ${roleName} role:`, error);
        }
      } else if (!isEligible && hasRole) {
        try {
          await roles.remove(roleId);
          console.log(`${userName} removed ineligible ${roleName} role.`);
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





