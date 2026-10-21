import { ALLOWED_ROLES, IGNORED_ROLES, COMMAND_LIST, VC_TENURE_MS, VC_THRESHOLD, IMG_TENURE_MS, IMG_THRESHOLD } from './constants.js';

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
