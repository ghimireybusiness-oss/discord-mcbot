// minecraft/chatBridge.js — Bidirectional chat bridge between Minecraft and Discord
const logger = require('../utils/logger');

/**
 * Attach chat bridging events to a Minecraft bot tied to a Discord channel.
 * @param {import('mineflayer').Bot} bot
 * @param {Object} ctx
 * @param {import('discord.js').Client} ctx.discordClient
 * @param {string} ctx.channelId
 * @param {string} ctx.username
 */
function attachChatBridge(bot, ctx) {
  const { discordClient, channelId, username } = ctx;

  // Safely send a message to the linked Discord channel
  const sendToDiscord = async (content) => {
    try {
      const channel = await discordClient.channels.fetch(channelId).catch(() => null);
      if (!channel || !channel.isTextBased()) return;
      const safe = content.length > 1900 ? content.slice(0, 1900) + '…' : content;
      await channel.send(safe);
    } catch (err) {
      logger.error(`Failed to send to Discord channel ${channelId}:`, err.message);
    }
  };

  // === Minecraft → Discord ===
  // Use 'chat' event — fires for player chat messages
  bot.on('chat', (sender, message) => {
    // Ignore self messages to avoid loops
    if (sender === username) return;
    sendToDiscord(`💬 **${sender}** : ${message}`);
  });

  // Forward system/broadcast messages (join/leave/death/etc.)
  bot.on('messagestr', (message, messagePosition) => {
    // 'messagestr' fires for almost everything; filter system messages only
    if (messagePosition === 'system' || messagePosition === 'game_info') {
      // Avoid duplicating chat (already handled by 'chat' event)
      // Heuristic: chat messages usually contain "<username>" patterns
      if (/^<.+?>\s/.test(message)) return;
      sendToDiscord(`📢 ${message}`);
    }
  });

  // Expose a helper on the bot for sending Discord → Minecraft
  bot.sendToMinecraft = (text) => {
    try {
      if (!bot || !bot.player) return false;
      // Limit to Minecraft's chat length (~256 chars)
      const safe = String(text).slice(0, 250);
      bot.chat(safe);
      return true;
    } catch (err) {
      logger.error(`Failed to send to Minecraft:`, err.message);
      return false;
    }
  };
}

module.exports = { attachChatBridge };