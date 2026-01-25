import 'dotenv/config';
import './discord/discord.js';
import './db/mongodb.js';

console.log('DISCORD_TOKEN loaded:', !!process.env.DISCORD_TOKEN);
console.log('MONGODB_URI loaded:', !!process.env.MONGODB_URI);
console.log('Counter bot is starting...');