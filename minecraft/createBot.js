// minecraft/createBot.js — Mineflayer bot factory with safe lifecycle handling
const mineflayer = require('mineflayer');
const logger = require('../utils/logger');

/**
 * Creates a Mineflayer bot instance with safe error handling.
 * @param {Object} options
 * @param {string} options.host
 * @param {number} options.port
 * @param {string} options.username
 * @param {string} options.version
 * @returns {import('mineflayer').Bot}
 */
function createMinecraftBot({ host, port, username, version }) {
  const botOptions = {
    host,
    port: Number(port),
    username,
    auth: 'offline', // offline mode by default — safer for arbitrary servers
    hideErrors: true,
  };

  // Only set version if explicitly provided and not "auto"
  if (version && String(version).trim() !== '' && String(version).trim().toLowerCase() !== 'auto') {
    botOptions.version = String(version).trim();
  }

  logger.info(
    `Creating Minecraft bot → ${username}@${host}:${port} (version: ${botOptions.version || 'auto'})`
  );

  const bot = mineflayer.createBot(botOptions);

  // Attach an immediate error handler to avoid unhandled exceptions
  bot.on('error', (err) => {
    logger.error(`[MC:${username}] bot error:`, err && err.message ? err.message : err);
  });

  return bot;
}

module.exports = { createMinecraftBot };