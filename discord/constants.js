export const ALLOWED_ROLES = ["283468468592836608", "1150967027922640896", "283547423706447872"];
export const IGNORED_ROLES = ["283468468592836608", "283547423706447872", "327844709244469261", "309837968875585540", "328354344313421825", "284848710960021504", "1097313468153082046", "1303051739376652289"];
export const FETCH_DELAY_MS = 250
export const PREFIX = "!";
export const DYNO_PREFIX = "?";
export const ASSIGNABLE_ROLES = {
  vcRole: "1456584340665405595",
  imgRole: "1456584029267824795"
}

export const MESSAGE_PHASE = {
  START: "start",
  PROGRESS: "progress",
  DONE: "done",
  ERROR: "error"
};



export const COMMAND_MESSAGES = {
  updateSingleUser: {
    start: (args) => `⏳ Updating user messages...\nArgs: ${args.join(' ')}`,
    done: (args) => `✅ Finished updating user messages for ${args.join(' ')}`,
  },

  updatebulkroles: {
    start: ({ elapsed }) =>
      `⏳ Updating user roles in bulk...\n⏱️ Elapsed: ${elapsed}`,
    progress: ({ elapsed }) =>
      `⏳ Roles are being processed...\n⏱️ Elapsed: ${elapsed}`,
    done: ({ elapsed }) =>
      `✅ Finished updating user roles in bulk\n⏱️ Elapsed: ${elapsed}`,
    error: ({ error }) =>
      `❌ Failed to update roles\n${error}`
  },

  setcount: {
    start: ({ userId, count }) =>
      `⏳ Updating message count for ${userId} to ${count}...`,
    done: ({ userId, count }) =>
      `✅ Finished updating message count for <@${userId}> to ${count}`,
    error: ({ error }) =>
      `❌ Failed to update roles\n${error}`
  },

  ping: {
    start: () => '⏳ ...',
    done: ({ elapsed }) => `✅ Pong! \n⏱️ Elapsed: ${elapsed}`
  },

  targetuserreset: {
    start: ({ command, userId }) => `command ${command} issued for ${userId}\n⏳ Resetting perm roles...`,
    done: ({ userId }) => `✅ Finished resetting perm roles for ${userId}`,
    error: ({ error }) =>
      `❌ Failed to reset user roles\n${error}`
  },

  rollout: {
    start: () =>
      `⏳ Starting role rollout...`,
    progress: ({ processed, elapsed }) =>
      `Rolling out roles...\n

    ⏱️ Elapsed: ${elapsed}\n
    ✅ Processed: ${processed.processed} users
    ️⏳ Updated: ${processed.updated} users
    ❌ Skipped: ${processed.skipped} users
    ⏳ Left: ${processed.left} users`,
    done: ({ processed, elapsed }) =>
      `All Done!\n
    
    ⏱️ Elapsed: ${elapsed}\n
    ✅ Processed: ${processed.processed} users
    ️⏳ Updated: ${processed.updated} users
    ❌ Skipped: ${processed.skipped} users
    ⏳ Left: ${processed.left} users`,
  }
}
