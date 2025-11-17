const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logsDir = path.join(__dirname, '../logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  getLogFilePath() {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logsDir, `chatbot-${date}.log`);
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    let logEntry = `[${timestamp}] [${level}] ${message}`;
    
    if (data) {
      logEntry += `\n${JSON.stringify(data, null, 2)}`;
    }
    
    return logEntry;
  }

  writeLog(level, message, data = null) {
    const logEntry = this.formatMessage(level, message, data) + '\n';
    const logFile = this.getLogFilePath();
    
    try {
      fs.appendFileSync(logFile, logEntry, 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  info(message, data = null) {
    this.writeLog('INFO', message, data);
  }

  debug(message, data = null) {
    this.writeLog('DEBUG', message, data);
  }

  warn(message, data = null) {
    this.writeLog('WARN', message, data);
  }

  error(message, data = null) {
    this.writeLog('ERROR', message, data);
    // Also log errors to console for immediate visibility
    console.error(`[ERROR] ${message}`, data || '');
  }

  // Chat-specific logging methods
  logConversation(userId, role, message) {
    this.info(`Chat - User: ${userId}, Role: ${role}`, { message });
  }

  logIntent(userId, intent) {
    this.debug(`Intent Extraction - User: ${userId}`, intent);
  }

  logSearch(userId, filters, resultCount) {
    this.info(`Product Search - User: ${userId}`, { 
      filters, 
      resultCount 
    });
  }

  logConversationHistory(userId, historyLength) {
    this.debug(`Conversation History - User: ${userId}, Messages: ${historyLength}`);
  }
}

// Export a singleton instance
module.exports = new Logger();
