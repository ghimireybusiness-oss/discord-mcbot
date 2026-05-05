// commands/status.js — /status slash command
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { sessionManager } = require('../minecraft/sessionManager');

const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Show information about your active Minecraft session.');

function formatUptime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}h ${m}m ${s}s`;
}

async function execute(interaction) {
  const userId = interaction.user.id;
  const session = sessionManager.getSession(userId);

  if (!session) {
    await interaction.reply({
      content: '❗ You have no active session. Use `/join` first.',
      ephemeral: true,
    });
    return;
  }

  const { bot, username, server, createdAt, channelId } = session;
  const uptimeMs = Date.now() - createdAt;
  const ping = bot && typeof bot.player !== 'undefined' && bot.player && typeof bot.player.ping === 'number'
    ? `${bot.player.ping} ms`
    : 'N/A (not spawned yet)';

  const connected = !!(bot && bot.player);
  const status = connected ? '🟢 Connected' : '🟡 Connecting / Not spawned';

  const embed = new EmbedBuilder()
    .setTitle('📡 Minecraft Session Status')
    .setColor(connected ? 0x2ecc71 : 0xf1c40f)
    .addFields(
      { name: 'Status', value: status, inline: true },
      { name: 'Username', value: `\`${username}\``, inline: true },
      { name: 'Server', value: `\`${server.host}:${server.port}\``, inline: true },
      { name: 'Version', value: `\`${server.version || 'auto'}\``, inline: true },
      { name: 'Ping', value: ping, inline: true },
      { name: 'Uptime', value: formatUptime(uptimeMs), inline: true },
      { name: 'Bridge Channel', value: `<#${channelId}>`, inline: false }
    )
    .setTimestamp(new Date());

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { data, execute };