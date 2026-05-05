// utils/logger.js — Central logger utility
const LEVELS = {
  INFO: { label: 'INFO', color: '\x1b[36m' },
  WARN: { label: 'WARN', color: '\x1b[33m' },
  ERROR: { label: 'ERROR', color: '\x1b[31m' },
  DEBUG: { label: 'DEBUG', color: '\x1b[35m' },
  SUCCESS: { label: 'SUCCESS', color: '\x1b[32m' },
};
const RESET = '\x1b[0m';

function timestamp() {
  return new Date().toISOString();
}

function log(level, ...args) {
  const lvl = LEVELS[level] || LEVELS.INFO;
  const prefix = `${lvl.color}[${timestamp()}] [${lvl.label}]${RESET}`;
  if (level === 'ERROR') {
    console.error(prefix, ...args);
  } else if (level === 'WARN') {
    console.warn(prefix, ...args);
  } else {
    console.log(prefix, ...args);
  }
}

module.exports = {
  info: (...args) => log('INFO', ...args),
  warn: (...args) => log('WARN', ...args),
  error: (...args) => log('ERROR', ...args),
  debug: (...args) => log('DEBUG', ...args),
  success: (...args) => log('SUCCESS', ...args),
};