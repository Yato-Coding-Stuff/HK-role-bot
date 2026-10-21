import { collection } from './mongodb.js';


export const updateUserMessageCount = async ({ userId, userName, joinedTimestamp }) => {
  try {
    const updatedUser = await collection.findOneAndUpdate(
      { userId },
      [
        {
          $set: {
            messageCount: {
              $cond: [
                { $eq: [{ $ifNull: ["$optedOut", false] }, false] },
                { $add: [{ $ifNull: ["$messageCount", 0] }, 1] },
                { $ifNull: ["$messageCount", 0] }
              ]
            },
            joinedTimestamp: {
              $ifNull: ["$joinedTimestamp", joinedTimestamp]
            },
            infractionTier: {
              $ifNull: ["$infractionTier", 1]
            },
            optedOut: {
              $ifNull: ["$optedOut", false]
            }
          }
        }
      ],
      {
        upsert: true,
        returnDocument: "after"
      }
    );

    console.log(
      updatedUser.optedOut
        ? `${userName} has opted out. Message count unchanged.`
        : `Updated message count for ${userName}`
    );

    return updatedUser;
  } catch (error) {
    console.error("Error updating user message count:", error);
    throw error;
  }
};

export const setUserMessageCount = async ({
  userId,
  count,
  joinedTimestamp
}) => {
  try {
    const result = await collection.findOneAndUpdate(
      { userId },
      [
        {
          $set: {
            messageCount: count,
            joinedTimestamp: {
              $ifNull: ["$joinedTimestamp", joinedTimestamp]
            },
            infractionTier: {
              $ifNull: ["$infractionTier", 1]
            }
          }
        }
      ],
      {
        upsert: true,
        returnDocument: "after"
      }
    );

    console.log(`Set message count for user ${userId}`);

    return result;
  } catch (error) {
    console.error("Error setting user message count:", error);
    throw error;
  }
};

export const getUserStatus = async (userId) => {
  try {
    const user = await collection.findOne(
      { userId },
      {
        projection: {
          _id: 0,
          messageCount: 1,
          joinedTimestamp: 1,
          infractionTier: 1,
          optedOut: 1
        }
      }
    );

    // If the user doesn't exist, return default values
    return {
      messageCount: user?.messageCount ?? 0,
      joinedTimestamp: user?.joinedTimestamp ?? null,
      infractionTier: user?.infractionTier ?? 1,
      optedOut: user?.optedOut ?? false
    };
  } catch (error) {
    console.error("Error fetching user status:", error);
    throw error;
  }
};


export const targetUserReset = async (userId, joinedTimestamp) => {
  try {
    const updatedUser = await collection.findOneAndUpdate(
      { userId },
      [
        {
          $set: {
            messageCount: 0,
            joinedTimestamp: {
              $ifNull: ["$joinedTimestamp", joinedTimestamp]
            },
            infractionTier: {
              $add: [{ $ifNull: ["$infractionTier", 1] }, 1]
            }
          }
        }
      ],
      {
        upsert: true,
        returnDocument: "after"
      }
    );

    return updatedUser;
  } catch (error) {
    console.error("Error resetting user message count:", error);
    throw error;
  }
};

export const setUserOptOutStatus = async (userId, optedOut) => {
  try {
    await collection.updateOne(
      { userId },
      { $set: { optedOut } },
      { upsert: true }
    );
  } catch (error) {
    console.error("Error updating user opt-out status:", error);
    throw error;
  }
};