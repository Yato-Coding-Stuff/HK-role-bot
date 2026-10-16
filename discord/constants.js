export const HOME_GUILD_ID = process.env.HOME_GUILD_ID;
export const BOT_PREFIX = "!";
export const DYNO_PREFIX = "?";
export const PREFIXES = [DYNO_PREFIX, BOT_PREFIX];
export const FETCH_DELAY_MS = 250
export const IMG_THRESHOLD = 50
export const VC_THRESHOLD = 25
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

export const RESPONSE_MESSAGES = {
  targetuserreset: {
    start: ({ command, userId }) => `command ${command} issued for ${userId}\n⏳ Resetting perm roles...`,
    done: ({ userId }) => `✅ Finished resetting perm roles for ${userId}`,
    error: ({ error }) =>
      `❌ Failed to reset user roles, This may be because Dyno removed first, but will remove upon unmute\n${error} `
  },
}


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

  done: ({ userId, count, roleStatus, optedOut }) => {
    if (optedOut) {
      return `⚠️ Cannot update the message count for <@${userId}> because they have opted out of tracking.`;
    }

    const formatRoleStatus = ({ role, status, reason }) => {
      switch (status) {
        case "already_has_role":
          return `ℹ️ ${role}: Already has this role.`;

        case "assigned":
          return reason === "tenure"
            ? `✅ ${role}: Assigned through tenure.`
            : `✅ ${role}: Assigned through message count.`;

        case "not_eligible":
          return `⏳ ${role}: Not yet eligible. Use \`!checkel\` for details.`;

        case "assignment_failed":
          return `⚠️ ${role}: Eligible, but assignment failed.`;

        default:
          return `❔ ${role}: Unknown status.`;
      }
    };

    return [
      `✅ Updated message count for <@${userId}> to ${count}.`,
      ...roleStatus.map(formatRoleStatus)
    ].join("\n");
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
        threshold
      ) => {
        const adjustedThreshold = threshold * infractionTier;

        if (hasRole) {
          return `✅ Already has the ${roleName} role.`;
        }

        if (eligibleRoles.includes(roleKey)) {
          return `✅ ${roleName}: requirement met (${messageCount}/${adjustedThreshold} messages).`;
        }

        return `❌ ${roleName}: ${messageCount}/${adjustedThreshold} messages.`;
      };

      const vcLine = describeRoleStatus(
        vcHasRole,
        "VC",
        "VC",
        VC_THRESHOLD
      );

      const imgLine = describeRoleStatus(
        imgHasRole,
        "Image",
        "IMG",
        IMG_THRESHOLD
      );

      return [
        `**Eligibility for <@${userId}>**`,
        `Infraction tier: ${infractionTier}`,
        vcLine,
        imgLine,
        `-# Message threshold = base threshold × ${infractionTier}`
      ].join("\n");
    },

    error: ({ error }) =>
      `❌ Failed to check eligibility\n${error}`
  },

  ping: {
    start: () => '⏳ ...',
    done: ({ elapsed }) => `✅ Pong! \n⏱️ Elapsed: ${elapsed} `
  },

  seeservers: {
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
