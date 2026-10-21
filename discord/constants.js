import { skipUser, getRoleEligibility } from './utils.js';
export const HOME_GUILD_ID = process.env.HOME_GUILD_ID;
export const FETCH_DELAY_MS = 250
export const IMG_THRESHOLD = 50
export const VC_THRESHOLD = 10
export const VC_TENURE_MS = 24 * 60 * 60 * 1000; // 1 day
export const IMG_TENURE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
export const COMMAND_LIST = ['warn', "mute", "banf", "ban", "softbanf", "kick", 'seed', 'setcount', 'checkel', 'seeservers', 'leaveservers'];
export const ALLOWED_ROLES = ["283468468592836608", "1150967027922640896", "283547423706447872"];
export const IGNORED_ROLES = ["283468468592836608", "283547423706447872", "327844709244469261", "309837968875585540", "328354344313421825", "284848710960021504", "1097313468153082046", "1303051739376652289"];
export const ASSIGNABLE_ROLES = {
  VC_ROLE: "1456584340665405595",
  IMG_ROLE: "1456584029267824795",
  MUTED_ROLE: "302535068759621632"
}

export const MESSAGE_PHASE = {
  START: "start",
  PROGRESS: "progress",
  DONE: "done",
  ERROR: "error"
};


export const COMMAND_MESSAGES = {

  optout: {
    start: () => "⏳ Opting you out of message tracking...",
    done: () =>
      "✅ You've opted out of message tracking. Your VC and Image roles are removed, and your message count will no longer be tracked. You can opt back in with `!optin`.",
    error: ({ error }) =>
      `❌ Failed to opt you out. Please contact mods for help\n${error}`
  },

  optin: {
    start: () => "⏳ Opting you back into message tracking...",
    done: ({ roleStatus = [] }) => {
      const lines = [
        "✅ You've opted back into message tracking!"
      ];

      for (const { role, status } of roleStatus) {
        switch (status) {
          case "assigned":
            lines.push(`✅ ${role}: Role assigned.`);
            break;
          case "not_eligible":
            lines.push(`⏳ ${role}: Not yet eligible.`);
            break;
          case "assignment_failed":
            lines.push(`⚠️ ${role}: Eligible, but role assignment failed.`);
            break;
        }
      }

      return lines.join("\n");
    },
    error: ({ error }) => `❌ Failed to opt you back in. Please contact mods for help\n${error}`
  },

  setcount: {
    start: ({ userId, count }) =>
      `⏳ Updating message count for <@${userId}> to ${count}...`,

    done: ({ userId, count, optedOut }) => {
      if (optedOut) {
        return [
          `**Message count for <@${userId}>**`,
          `ℹ️ This user has opted out of message tracking.`,
          `The message count was not changed.`
        ].join("\n");
      }

      return [
        `**Message count updated for <@${userId}>**`,
        `Message count: ${count}`
      ].join("\n");
    },

    error: ({ userId, error }) =>
      `❌ Failed to update the message count for ${userId ? `<@${userId}>` : "the user"}.\n${error}`
  },


  checkel: {
    start: ({ userId }) =>
      `🔍 Checking role eligibility for <@${userId}>...`,

    done: ({
      userId,
      messageCount,
      joinedTimestamp,
      infractionTier,
      optedOut,
      vcHasRole,
      imgHasRole
    }) => {
      if (optedOut) {
        return [
          `**Eligibility for <@${userId}>**`,
          `ℹ️ This user has opted out of message tracking.`,
          `Role eligibility stats are unavailable while opted out.`
        ].join("\n");
      }

      const eligibleRoles = getRoleEligibility({
        messageCount,
        joinedTimestamp,
        infractionTier,
        optedOut
      });

      const describeRoleStatus = (
        hasRole,
        roleName,
        roleKey,
        threshold,
        tenureMs
      ) => {
        const adjustedThreshold = threshold * infractionTier;

        if (hasRole) {
          return `✅ Already has the ${roleName} role.`;
        }

        if (eligibleRoles.includes(roleKey)) {
          const metTenure =
            infractionTier === 1 &&
            joinedTimestamp > 0 &&
            joinedTimestamp <= Date.now() - tenureMs;

          if (metTenure) {
            return `✅ ${roleName}: tenure requirement met.`;
          }

          return `✅ ${roleName}: message requirement met (${messageCount}/${adjustedThreshold} messages).`;
        }

        return `❌ ${roleName}: ${messageCount}/${adjustedThreshold} messages.`;
      };
      const vcLine = describeRoleStatus(
        vcHasRole,
        "Voice Chat",
        "VC",
        VC_THRESHOLD,
        VC_TENURE_MS
      );

      const imgLine = describeRoleStatus(
        imgHasRole,
        "Image",
        "IMG",
        IMG_THRESHOLD,
        IMG_TENURE_MS
      );

      return [
        `**Eligibility for <@${userId}>**`,
        `Infraction tier: ${infractionTier}`,
        vcLine,
        imgLine,
        `-# calculated threshold = base threshold × infraction tier (${infractionTier})`
      ].join("\n");
    },

    error: ({ error }) =>
      `❌ Failed to check eligibility\n${error}`
  },

  ping: {
    start: () => '⏳ ...',
    done: ({ elapsed }) => `✅ Pong! \n⏱️ Elapsed: ${elapsed} `
  },

  checkservers: {
    start: () => `⏳ Fetching servers...`,
    done: ({ servers }) =>
      `✅ Bot is in **${servers.length}** server(s):\n${servers.map(s => `• **${s.name}** (\`${s.id}\`) — ${s.memberCount} members`).join('\n')}`,
    error: ({ error }) => `❌ Failed to fetch servers\n${error}`
  },

  leaveservers: {
    start: () => `⏳ Leaving all non-home servers...`,
    done: ({ left, failed }) =>
      `✅ Done. Left **${left.length}** server(s)${failed.length ? `, failed to leave **${failed.length}**: ${failed.join(', ')}` : '.'}`,
    error: ({ error }) => `❌ Failed to leave servers\n${error}`
  }
}
