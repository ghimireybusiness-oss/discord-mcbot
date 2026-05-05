// index.js — Main entry point: Discord bot + Express server + session manager
const {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  Events,
} = require('discord.js');
const express = require('express');

const { config, validateConfig } = require('./config');
const logger = require('./utils/logger');
const { sessionManager } = require('./minecraft/sessionManager');

// Commands
const joinCmd = require('./commands/join');
const leaveCmd = require('./commands/leave');
const sayCmd = require('./commands/say');
const statusCmd = require('./commands/status');

// Validate env
validateConfig();

// =======================
// Express server
// =======================
const app = express();
app.get('/', (_req, res) => {
  res.status(200).send('Bot is running');
});
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    activeSessions: sessionManager.activeCount(),
    u