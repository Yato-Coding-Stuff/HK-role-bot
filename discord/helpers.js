export const reduceMessages = (messages) => {
  const reduced = messages.reduce((acc, userId) => {
    acc[userId] = (acc[userId] || 0) + 1;
    return acc;
  }, {});

  console.log("completed reducing messages");
  console.log(reduced)

  return reduced;
}
