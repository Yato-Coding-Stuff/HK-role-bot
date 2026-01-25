import { collection } from './mongodb.js';

export const updateUserMessageCount = async (userId) => {
  try {
    const updatedUser = await collection.findOneAndUpdate(
      { userId },
      [
        {
          $set: {
            messageCount: { $add: [{ $ifNull: ["$messageCount", 0] }, 1] }
          }
        },
        {
          $set: {
            has_role_vc: { $cond: [{ $gte: ["$messageCount", 150] }, true, false] },
            has_role_image: { $cond: [{ $gte: ["$messageCount", 300] }, true, false] }
          }
        }
      ],
      {
        upsert: true,
        returnDocument: "after" // returns the document AFTER update
      }
    );


    if (updatedUser.upsertedCount > 0) {
      console.log(`Inserted new document for user ${userId}`);
    } else {
      console.log(`Updated message count for existing user ${userId}`);
    }

    return updatedUser

  } catch (error) {
    console.error("Error updating user message count:", error);
  }
};

export const setUserMessageCount = async ({ userId, count }) => {
  try {
    const result = await collection.findOneAndUpdate(
      { userId },
      {
        $set: {
          messageCount: count,
          has_role_vc: count >= 150,
          has_role_image: count >= 300
        }
      },
      {
        upsert: true,
        returnDocument: "after"
      }
    );

    if (result.lastErrorObject?.upserted) {
      console.log(`Inserted new document for user ${userId}`);
    } else {
      console.log(`Updated message count for existing user ${userId}`);
    }

    return result.value
  } catch (error) {
    console.error("Error setting user message count:", error);
    throw error;
  }
};


export const updateBulkRoleCount = async ({ vcRoleCount, imgRoleCount }) => {
  try {
    await collection.updateMany(
      {},
      [
        {
          $set: {
            has_role_vc: { $gte: ["$messageCount", vcRoleCount] },
            has_role_image: { $gte: ["$messageCount", imgRoleCount] }
          }
        },
        {
          $unset: "has_role_bypass_slowmode"
        }
      ]
    );
    console.log(`Bulk updated role counts \n
      VC Role Count Threshold: ${vcRoleCount}\n
      Image Role Count Threshold: ${imgRoleCount}\n
      `);
  } catch (error) {
    console.error("Error updating user message count:", error);
    throw error;
  }
};

export const targetUserReset = async (userId) => {
  try {
    const updatedUser = await collection.findOneAndUpdate(
      { userId },
      {
        $set: {
          messageCount: 0,
          has_role_vc: false,
          has_role_image: false
        }
      },
      { upsert: true } // keeps the user document if it doesn't exist
    );

    return updatedUser.value;
  } catch (error) {
    console.error("Error resetting user message count:", error);
    throw error;
  }
}


export const fetchEligibleUsers = async () => {
  try {
    //we're fetching just the users with over 150 messages for role rollout
    return await collection
      .find({ messageCount: { $gte: 150 } })
      .toArray();
  } catch (error) {
    console.error("Error fetching users with messageCount >= 150:", error);
    throw error;
  }
};
