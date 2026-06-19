import { ALLOWED_ROLES, IGNORED_ROLES, PREFIXES, COMMAND_LIST } from './constants.js';

export const hasPermission = (member) =>
  member && member.roles.cache.some(role => ALLOWED_ROLES.includes(role.id));


export const skipUser = (member) =>
  member && member.roles.cache.some(role => IGNORED_ROLES.includes(role.id));

export const isCommand = ({ command, content }) => {
  const usedPrefix = PREFIXES.find(prefix => content.startsWith(prefix));
  const validCommand = COMMAND_LIST.includes(command);

  if (!usedPrefix) return false;

  if (usedPrefix && validCommand) {
    return true;
  }
}


export const formatElapsedSeconds = (totalSeconds) => {
  const hrs = Math.floor(totalSeconds / 3600).toString().padStart(2, "0");
  const mins = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
  const secs = (totalSeconds % 60).toString().padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
}

export const resolveUserId = async ({ user, guild }) => {
  const mentionMatch = user.match(/^<@!?(\d+)>$/);
  if (mentionMatch) return mentionMatch[1];

  if (/^\d{17,19}$/.test(user)) return user;

  const results = await guild.members.fetch({ query: user, limit: 5 });
  const match = results.find(m => m.user.username === user);
  return match?.user.id ?? null;
};