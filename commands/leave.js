// commands/leave.js — /leave slash command
const { SlashCommandBuilder } = require('discord.js');
const { sessionManager } = require('../minecraft/sessionManager');
const logger = require('../utils/logger');

const data = new SlashCommandBuilder()
  .setName('leave')
  .setDescription('Disconnect your Minecraft bot and end your session.');

async function execute(interaction) {
  const userId = interaction.user.id;

  if (!sessionManager.hasSession(userId)) {
    await interaction.reply({ content: '❗ You have no active session.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const ok = await sessionManager.destroySession(userId);
    if (ok) {
      await interaction.editReply('✅ Your Minecraft bot has been disconnected.');
    } else {
      await interaction.editReply('⚠️ Could not end session (it may have already ended).');
    }
  } catch (err) {
    logger.error('Error ending session:', err.message);
    await interaction.editReply(`❌ Error ending session: ${err.message}`);
  }
}

module.exports = { data, execute };