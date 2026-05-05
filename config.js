// config.js — Centralized configuration loader
require('dotenv').config();

const config = {
  discord: {
    token: process.env.DISCORD_TOKEN || '',
    clientId: process.env.DISCORD_CLIENT_ID || '',
    guildId: process.env.DISCORD_GUILD_ID || '',
  },
  express: {
    port: parseInt(process.env.PORT, 10) || 3000,
  },
  limits: {
    maxActiveBots: parseInt(process.env.MAX_ACTIVE_BOTS, 10) || 10,
    joinCooldownSeconds: parseInt(process.env.JOIN_COOLDOWN, 10) || 30,
    maxReconnectAttempts: 3,
    reconnectDelayMs: 5000,
  },
  minecraft: {
    defaultVersion: '1.20.1',
    defaultPort: 25565,
  },
};

function validateConfig() {
  const errors = [];
  if (!config.discord.token) errors.push('DISCORD_TOKEN is missing in .env');
  if (!config.discord.clientId) errors.push('DISCORD_CLIENT_ID is missing in .env');
  if (errors.length > 0) {
    console.error('❌ Configuration errors:');
    errors.forEach((e) => console.error(`   - ${e}`));
    process.exit(1);
  }
}

module.exports = { config, validateConfig };