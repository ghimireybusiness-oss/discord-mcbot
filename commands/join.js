// commands/join.js — /join slash command (opens modal) + modal handler
const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const { sessionManager } = require('../minecraft/sessionManager');
const { config } = require('../config');
const logger = require('../utils/logger');

const MODAL_ID = 'join_mc_modal';

const data = new SlashCommandBuilder()
  .setName('join')
  .setDescription('Connect a Minecraft bot to a server (opens a form).');

async function execute(interaction) {
  const userId = interaction.user.id;

  // Cooldown check
  const remaining = sessionManager.isOnCooldown(userId);
  if (remaining > 0) {
    await interaction.reply({
      content: `⏳ Please wait **${remaining}s** before using /join again.`,
      ephemeral: true,
    });
    return;
  }

  if (sessionManager.hasSession(userId)) {
    await interaction.reply({
      content: '❗ You already have an active session. Use `/leave` first.',
      ephemeral: true,
    });
    return;
  }

  if (sessionManager.activeCount() >= config.limits.maxActiveBots) {
    await interaction.reply({
      content: `❌ Maximum active bots reached (${config.limits.maxActiveBots}). Try again later.`,
      ephemeral: true,
    });
    return;
  }

  // Build modal
  const modal = new ModalBuilder().setCustomId(MODAL_ID).setTitle('Connect to Minecraft Server');

  const serverIpInput = new TextInputBuilder()
    .setCustomId('server_ip')
    .setLabel('Server IP / Hostname')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. play.example.com')
    .setRequired(true)
    .setMaxLength(253);

  const portInput = new TextInputBuilder()
    .setCustomId('port')
    .setLabel('Port (default 25565)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('25565')
    .setRequired(false)
    .setMaxLength(5);

  const usernameInput = new TextInputBuilder()
    .setCustomId('username')
    .setLabel('Bot Username')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. MyBot123')
    .setRequired(true)
    .setMinLength(3)
    .setMaxLength(16);

  const versionInput = new TextInputBuilder()
    .setCustomId('version')
    .setLabel('Minecraft Version (or "auto")')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. 1.20.1 or auto')
    .setRequired(false)
    .setMaxLength(16);

  modal.addComponents(
    new ActionRowBuilder().addComponents(serverIpInput),
    new ActionRowBuilder().addComponents(portInput),
    new ActionRowBuilder().addComponents(usernameInput),
    new ActionRowBuilder().addComponents(versionInput)
  );

  await interaction.showModal(modal);
}

// Validation helpers
function isValidHost(host) {
  if (!host || typeof host !== 'string') return false;
  const trimmed = host.trim();
  if (trimmed.length < 1 || trimmed.length > 253) return false;
  // Basic hostname / IP pattern
  const pattern = /^[a-zA-Z0-9.\-_:]+$/;
  return pattern.test(trimmed);
}

function isValidUsername(name) {
  if (!name || typeof name !== 'string') return false;
  return /^[A-Za-z0-9_]{3,16}$/.test(name.trim());
}

function isValidPort(portStr) {
  const n = parseInt(portStr, 10);
  return Number.isInteger(n) && n >= 1 && n <= 65535;
}

async function handleModalSubmit(interaction) {
  if (interaction.customId !== MODAL_ID) return;

  const userId = interaction.user.id;
  const channelId = interaction.channelId;

  const serverIp = interaction.fields.getTextInputValue('server_ip').trim();
  const portRaw = (interaction.fields.getTextInputValue('port') || '').trim();
  const username = interaction.fields.getTextInputValue('username').trim();
  const versionRaw = (interaction.fields.getTextInputValue('version') || '').trim();

  // Validate
  if (!isValidHost(serverIp)) {
    await interaction.reply({ content: '❌ Invalid server IP/hostname.', ephemeral: true });
    return;
  }
  const port = portRaw === '' ? config.minecraft.defaultPort : parseInt(portRaw, 10);
  if (!isValidPort(String(port))) {
    await interaction.reply({ content: '❌ Invalid port. Must be 1–65535.', ephemeral: true });
    return;
  }
  if (!isValidUsername(username)) {
    await interaction.reply({
      content: '❌ Invalid username. Use 3–16 chars: letters, numbers, underscores.',
      ephemeral: true,
    });
    return;
  }
  const version = versionRaw === '' ? 'auto' : versionRaw;

  // Re-check cooldown & session at submit time
  const remaining = sessionManager.isOnCooldown(userId);
  if (remaining > 0) {
    await interaction.reply({
      content: `⏳ Please wait **${remaining}s** before using /join again.`,
      ephemeral: true,
    });
    return;
  }
  if (sessionManager.hasSession(userId)) {
    await interaction.reply({
      content: '❗ You already have an active session. Use `/leave` first.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    sessionManager.setCooldown(userId);
    await sessionManager.createSession({
      userId,
      channelId,
      host: serverIp,
      port,
      username,
      version,
    });

    await interaction.editReply(
      `🚀 Connecting bot **${username}** to \`${serverIp}:${port}\` (version: ${version})...\n` +
        `This channel is now the chat bridge. Messages here are sent to Minecraft.`
    );
  } catch (err) {
    logger.error('Error creating session:', err.message);
    await interaction.editReply(`❌ Failed to start session: ${err.message}`);
  }
}

module.exports = { data, execute, handleModalSubmit, MODAL_ID };