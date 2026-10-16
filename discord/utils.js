import { ALLOWED_ROLES, IGNORED_ROLES, PREFIXES, COMMAND_LIST, VC_TENURE_MS, VC_THRESHOLD, IMG_TENURE_MS, IMG_THRESHOLD } from './constants.js';

export const hasPermission = (member) =>
  member && member.roles.cache.some(role => ALLOWED_ROLES.includes(role.id));


export const skipUser = (member) =>
  member && member.roles.cache.some(role => IGNORED_ROLES.includes(role.id));


import { PREFIXES, DYNO_BOT_ID } from "./constants.js";

export const isCommand = ({ command, content, message }) => {
  const validCommand = COMMAND_LIST.includes(command);
  if (!validCommand) return false;

  const hasPrefix = PREFIXES.some(prefix => content.startsWith(prefix));
  const mentionsDyno = message?.mentions.users.has("155149108183695360");

  return hasPrefix || mentionsDyno;
};


export const resolveUserId = async ({ user, guild }) => {
  const mentionMatch = user.match(/^<@!?(\d+)>$/);
  if (mentionMatch) return mentionMatch[1];

  if (/^\d{17,19}$/.test(user)) return user;

  const results = await guild.members.fetch({ query: user, limit: 5 });
  const match = results.find(m => m.user.username === user);
  return match?.user.id ?? null;
};



export const getRoleEligibiliity = ({ messageCount, joinedTimestamp, infractionTier, optedOut }) => {

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

