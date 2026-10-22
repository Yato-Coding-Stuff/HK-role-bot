import { ALLOWED_ROLES, IGNORED_ROLES, VC_TENURE_MS, VC_THRESHOLD, IMG_TENURE_MS, IMG_THRESHOLD, ASSIGNABLE_ROLES } from './constants.js';
import { getUserStatus, setUserOptOutStatus } from '../db/helper.js';

export const hasPermission = (member) =>
  member && member.roles.cache.some(role => ALLOWED_ROLES.includes(role.id));


export const skipUser = (member) =>
  !member || member.roles.cache.some(role =>
    IGNORED_ROLES.includes(role.id));


export const getRoleEligibility = ({ messageCount, joinedTimestamp, infractionTier, optedOut }) => {

  if (optedOut) return [];

  const assignableRoles = [];

  const hasMetTenure = (eligibleSince, tenureMs, now = Date.now()) =>
    eligibleSince > 0 && eligibleSince <= now - tenureMs;


  if (
    (
      infractionTier === 1 &&
      hasMetTenure(joinedTimestamp, VC_TENURE_MS)
    ) ||
    messageCount >= VC_THRESHOLD * infractionTier
  ) {
    assignableRoles.push("VC");
  }

  if (
    (
      infractionTier === 1 &&
      hasMetTenure(joinedTimestamp, IMG_TENURE_MS)
    ) ||
    messageCount >= IMG_THRESHOLD * infractionTier
  ) {
    assignableRoles.push("IMG");
  }

  return assignableRoles;
}


export const updateOptOutStatus = async (interaction, optedOut) => {
  const { VC_ROLE, IMG_ROLE } = ASSIGNABLE_ROLES;
  const userId = interaction.user.id;
  const member = await interaction.guild.members.fetch(userId);

  await setUserOptOutStatus(userId, optedOut);

  const roleMap = {
    VC: VC_ROLE,
    IMG: IMG_ROLE
  };

  if (optedOut) {
    for (const [roleName, roleId] of Object.entries(roleMap)) {
      if (!member.roles.cache.has(roleId)) continue;

      await member.roles.remove(roleId);

      console.log(
        `${member.user.tag}: Removed ${roleName} role after opting out.`
      );
    }

    return;
  }

  const {
    messageCount,
    joinedTimestamp,
    infractionTier
  } = await getUserStatus(userId);

  const eligibleRoles = getRoleEligibility({
    messageCount,
    joinedTimestamp: joinedTimestamp ?? member.joinedTimestamp,
    infractionTier,
    optedOut
  });

  for (const [roleName, roleId] of Object.entries(roleMap)) {
    if (!eligibleRoles.includes(roleName)) continue;
    if (member.roles.cache.has(roleId)) continue;

    try {
      await member.roles.add(roleId);

      console.log(
        `${member.user.tag}: Assigned ${roleName} role after opting in.`
      );
    } catch (error) {
      console.error(`Error assigning ${roleName} role:`, error);
    }
  }
};