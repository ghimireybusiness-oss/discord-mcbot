// minecraft/sessionManager.js — Class-based session manager for Minecraft bot sessions
const { createMinecraftBot } = require('./createBot');
const { attachChatBridge } = require('./chatBridge');
const { config } = require('../config');
const logger = require('../utils/logger');

class SessionManager {
  constructor() {
    /** @type {Map<string, Object>} */
    this.sessions = new Map(); // userId -> session
    /** @type {Map<string, number>} */
    this.cooldowns = new Map(); // userId -> timestamp of last /join
    this.discordClient = null;
  }

  setDiscordClient(client) {
    this.discordClient = client;
  }

  // ========== Cooldowns ==========
  isOnCooldown(userId) {
    const last = this.cooldowns.get(userId);
    if (!last) return 0;
    const elapsed = (Date.now() - last) / 1000;
    const remaining = config.limits.joinCooldownSeconds - elapsed;
    return remaining > 0 ? Math.ceil(remaining) : 0;
  }

  setCooldown(userId) {
    this.cooldowns.set(userId, Date.now());
  }

  // ========== Session Accessors ==========
  getSession(userId) {
    return this.sessions.get(userId) || null;
  }

  getSessionByChannel(channelId) {
    for (const session of this.sessions.values()) {
      if (session.channelId === channelId) return session;
    }
    return null;
  }

  hasSession(userId) {
    return this.sessions.has(userId);
  }

  activeCount() {
    return this.sessions.size;
  }

  // ========== Create / Destroy ==========
  async createSession({ userId, channelId, host, port, username, version }) {
    if (this.hasSession(userId)) {
      throw new Error('You already have an active session. Use /leave first.');
    }
    if (this.activeCount() >= config.limits.maxActiveBots) {
      throw new Error(`Maximum active bots reached (${config.limits.maxActiveBots}). Try again later.`);
    }

    const bot = createMinecraftBot({ host, port, username, version });

    const session = {
      userId,
      channelId,
      username,
      server: { host, port, version: version || 'auto' },
      bot,
      createdAt: Date.now(),
      reconnectAttempts: 0,
      manualDisconnect: false,
    };

    this.sessions.set(userId, session);

    // Attach chat bridge
    attachChatBridge(bot, {
      discordClient: this.discordClient,
      channelId,
      username,
      userId,
      session,
    });

    // Attach lifecycle events
    this._attachLifecycle(session);

    return session;
  }

  _attachLifecycle(session) {
    const { bot, userId, username, channelId } = session;

    bot.once('spawn', async () => {
      logger.success(`[MC:${username}] spawned on ${session.server.host}:${session.server.port}`);
      session.reconnectAttempts = 0; // reset after successful spawn
      await this._notifyChannel(channelId, `✅ Connected as **${username}** to \`${session.server.host}:${session.server.port}\``);
    });

    bot.on('kicked', async (reason) => {
      let reasonText = reason;
      try {
        // Reason may be JSON string
        const parsed = typeof reason === 'string' ? JSON.parse(reason) : reason;
        reasonText = parsed && parsed.text ? parsed.text : JSON.stringify(parsed);
      } catch (_) {
        // leave as-is
      }
      logger.warn(`[MC:${username}] kicked: ${reasonText}`);
      await this._notifyChannel(channelId, `⚠️ Bot **${username}** was kicked: \`${String(reasonText).slice(0, 300)}\``);
    });

    bot.on('end', async (reasonText) => {
      logger.warn(`[MC:${username}] connection ended (${reasonText || 'no reason'})`);

      // If the user manually disconnected, do not reconnect
      if (session.manualDisconnect) {
        this.sessions.delete(userId);
        return;
      }

      // Attempt reconnect up to max
      if (session.reconnectAttempts < config.limits.maxReconnectAttempts) {
        session.reconnectAttempts += 1;
        const attempt = session.reconnectAttempts;
        logger.info(`[MC:${username}] reconnect attempt ${attempt}/${config.limits.maxReconnectAttempts}`);
        await this._notifyChannel(
          channelId,
          `🔄 Reconnecting **${username}** ... (attempt ${attempt}/${config.limits.maxReconnectAttempts})`
        );

        setTimeout(() => {
          // Only reconnect if session still exists
          if (!this.sessions.has(userId)) return;
          try {
            const newBot = createMinecraftBot({
              host: session.server.host,
              port: session.server.port,
              username: session.username,
              version: session.server.version,
            });
            session.bot = newBot;
            attachChatBridge(newBot, {
              discordClient: this.discordClient,
              channelId,
              username,
              userId,
              session,
            });
            this._attachLifecycle(session);
          } catch (err) {
            logger.error(`[MC:${username}] reconnect failed:`, err.message);
          }
        }, config.limits.reconnectDelayMs);
      } else {
        logger.error(`[MC:${username}] max reconnect attempts reached. Removing session.`);
        await this._notifyChannel(
          channelId,
          `❌ Max reconnect attempts reached for **${username}** . Session ended.`
        );
        this.sessions.delete(userId);
      }
    });

    bot.on('error', (err) => {
      logger.error(`[MC:${username}] error:`, err && err.message ? err.message : err);
    });
  }

  async destroySession(userId) {
    const session = this.sessions.get(userId);
    if (!session) return false;

    session.manualDisconnect = true;

    try {
      if (session.bot) {
        // quit() for graceful; fallback to end()
        try {
          session.bot.quit('Session ended by user');
        } catch (_) {
          try { session.bot.end(); } catch (_) { /* ignore */ }
        }
      }
    } catch (err) {
      logger.error(`Error while destroying session ${userId}:`, err.message);
    }

    this.sessions.delete(userId);
    return true;
  }

  async _notifyChannel(channelId, content) {
    try {
      if (!this.discordClient) return;
      const channel = await this.discordClient.channels.fetch(channelId).catch(() => null);
      if (channel && channel.isTextBased()) {
        await channel.send(content);
      }
    } catch (err) {
      logger.error('Failed to notify channel:', err.message);
    }
  }

  // Cleanup all sessions (on shutdown)
  async shutdownAll() {
    const ids = Array.from(this.sessions.keys());
    for (const id of ids) {
      await this.destroySession(id);
    }
  }
}

// Export a singleton
const sessionManager = new SessionManager();
module.exports = { sessionManager, SessionManager };