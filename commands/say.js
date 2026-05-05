// commands/say.js — /say slash command (send a chat message to Minecraft)
const { SlashCommandBuilder } = require('discord.js');
const { sessionManager } = require('../minecraft/sessionManager');
const logger = require('../utils/logger');

const data = new SlashCommandBuilder()
  .setName('say')
  .setDescription('Send a chat message through your Minecraft bot.')
  .addStringOption((opt) =>
    opt
      .setName('message')
      .setDescription('The message to send in Minecraft chat')
      .setRequired(true)
      .setMaxLength(250)
  );

async function execute(interaction) {
  const userId = interaction.user.id;
  const message = interaction.options.getString('message', true);

  const session = sessionManager.getSession(userId);
  if (!session) {
    await interaction.reply({
      content: '❗ You have no active session. Use `/join` first.',
      ephemeral: true,
    });
    return;
  }

  try {
    if (typeof session.bot.sendToMinecraft === 'function') {
      const ok = session.bot.sendToMinecraft(message);
      if (!ok) {
        await interaction.reply({
          content: '⚠️ Bot is not ready yet (still connecting). Try again shortly.',
          ephemeral: true,
        });
        return;
      }
    } else {
      session.bot.chat(String(message).slice(0, 250));
    }
    await interaction.reply({ content: `📨 Sent: \`${message}\``, ephemeral: true });
  } catch (err) {
    logger.error('Error sending /say message:', err.message);
    await interaction.reply({ content: `❌ Failed to send message: ${err.message}`, ephemeral: true });
  }
}

module.exports = { data, execute };