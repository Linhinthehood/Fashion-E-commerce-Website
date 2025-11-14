# Chatbot Logging System

## Overview
The chatbot service uses a file-based logging system to track all chat interactions, product searches, and errors without displaying debug information to customers.

## Log Files Location
All logs are stored in: `backend/chatbot-service/logs/`

Log files are named by date: `chatbot-YYYY-MM-DD.log`

Example: `chatbot-2025-11-10.log`

## Log Levels

### INFO
General information about chat flow:
- Conversation messages (user and assistant)
- Product search results
- API calls

### DEBUG
Detailed debugging information:
- Intent extraction results
- Conversation history retrieval
- Cache operations

### WARN
Warning messages (non-critical issues)

### ERROR
Error messages (critical issues):
- Also printed to console for immediate visibility
- Includes full stack traces

## Log Format

```
[2025-11-10T14:30:45.123Z] [LEVEL] Message
{
  "additional": "data",
  "in": "JSON format"
}
```

## Usage Examples

### Viewing Today's Logs
```bash
# Windows
type backend\chatbot-service\logs\chatbot-2025-11-10.log

# Linux/Mac
cat backend/chatbot-service/logs/chatbot-2025-11-10.log
```

### Filtering Logs
```bash
# Windows - Find all searches
findstr /i "Product Search" backend\chatbot-service\logs\chatbot-2025-11-10.log

# Linux/Mac - Find all errors
grep "ERROR" backend/chatbot-service/logs/chatbot-2025-11-10.log
```

### Real-time Monitoring
```bash
# Windows PowerShell
Get-Content backend\chatbot-service\logs\chatbot-2025-11-10.log -Wait

# Linux/Mac
tail -f backend/chatbot-service/logs/chatbot-2025-11-10.log
```

## What Gets Logged

### Chat Messages
- User messages
- AI responses
- User ID
- Timestamp

### Intent Extraction
- Detected intent (search, recommendation, greeting, etc.)
- Extracted entities (category, brand, color, etc.)

### Product Searches
- Search filters applied
- Number of results found
- User ID

### Conversation History
- Number of messages loaded from cache
- User ID

### Errors
- Full error message
- Stack trace
- Request context (userId, message)

## Log Rotation

Logs are automatically split by day. Old log files can be archived or deleted manually.

**Recommended retention:** Keep logs for 30 days, then archive or delete.

## Privacy Notes

- Logs contain user messages and conversation history
- User IDs are logged (may be 'anonymous')
- Do not expose log files publicly
- Logs are excluded from git via `.gitignore`

## Troubleshooting

### Log File Not Created
- Check that the `logs/` directory has write permissions
- Verify the logger is properly imported in routes/chat.js

### Logs Too Large
- Implement log rotation (consider using a library like `winston` or `bunyan`)
- Clean up old log files regularly

### No Logs Appearing
- Check that `logger.js` is properly imported
- Verify no errors in logger initialization
- Check file system permissions

## Integration

The logger is automatically used in:
- `routes/chat.js` - Main chat endpoint
- Future routes can import: `const logger = require('../utils/logger');`

## Custom Logging

To add logging elsewhere:

```javascript
const logger = require('../utils/logger');

// Basic logging
logger.info('Something happened');
logger.debug('Debug details', { data: 'value' });
logger.warn('Warning message');
logger.error('Error occurred', { error: err });

// Chat-specific methods
logger.logConversation(userId, role, message);
logger.logIntent(userId, intentObject);
logger.logSearch(userId, filters, resultCount);
logger.logConversationHistory(userId, messageCount);
```
