/**
 * Interactive Chatbot Test
 * Simple chat interface to test conversation memory
 */

const axios = require('axios');
const readline = require('readline');

// Configuration
const CHATBOT_URL = process.env.CHATBOT_URL || 'http://localhost:3009';

// Simple chat session
class ChatSession {
  constructor(userId) {
    this.userId = userId || `user-${Date.now()}`;
    this.messageCount = 0;
  }

  async sendMessage(message) {
    this.messageCount++;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`👤 You: ${message}`);
    console.log('-'.repeat(60));
    
    try {
      const response = await axios.post(`${CHATBOT_URL}/api/chat/message`, {
        message,
        userId: this.userId
      });

      const data = response.data;
      if (data.success) {
        const botMessage = data.data.message;
        
        console.log(`🤖 Bot: ${botMessage}\n`);

        return { success: true, data: data.data };
      } else {
        console.log(`❌ Error: ${data.message}`);
        return { success: false, error: data.message };
      }
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getHistory() {
    try {
      const response = await axios.get(`${CHATBOT_URL}/api/chat/history/${this.userId}`);
      return response.data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async clearHistory() {
    try {
      await axios.delete(`${CHATBOT_URL}/api/chat/history/${this.userId}`);
      console.log(`\n🧹 Conversation history cleared`);
    } catch (error) {
      console.log(`❌ Failed to clear: ${error.message}`);
    }
  }

  async showHistory() {
    const result = await this.getHistory();
    if (result.success) {
      console.log(`\n📚 Conversation History (${result.data.messageCount} messages):`);
      console.log('='.repeat(60));
      result.data.history.forEach((msg, i) => {
        const role = msg.role === 'user' ? '👤 You' : '🤖 Bot';
        console.log(`${i + 1}. ${role}: ${msg.content.substring(0, 100)}...`);
      });
      console.log('='.repeat(60));
    }
  }
}

// Interactive mode
async function interactiveChat() {
  console.log('\n🤖 CHATBOT INTERACTIVE TEST');
  console.log('='.repeat(60));
  console.log(`Server: ${CHATBOT_URL}`);
  
  // Check if service is available
  try {
    await axios.get(`${CHATBOT_URL}/health`);
    console.log('✅ Service is available');
  } catch (error) {
    console.error('❌ Service not available. Start it with: npm run dev');
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Ask for userId
  const userId = await new Promise((resolve) => {
    rl.question('\nEnter your user ID (or press Enter for auto): ', (answer) => {
      resolve(answer.trim() || `user-${Date.now()}`);
    });
  });

  const chat = new ChatSession(userId);
  console.log(`\n👋 Chat session started as: ${chat.userId}`);
  console.log('\nCommands:');
  console.log('  - Type your message to chat');
  console.log('  - /history - Show conversation history');
  console.log('  - /clear - Clear conversation history');
  console.log('  - /exit - Exit chat');
  console.log('='.repeat(60));

  const askQuestion = () => {
    rl.question('\n💬 Your message: ', async (input) => {
      const message = input.trim();

      if (!message) {
        askQuestion();
        return;
      }

      if (message === '/exit') {
        console.log('\n👋 Goodbye!');
        rl.close();
        return;
      }

      if (message === '/history') {
        await chat.showHistory();
        askQuestion();
        return;
      }

      if (message === '/clear') {
        await chat.clearHistory();
        askQuestion();
        return;
      }

      // Send message to chatbot
      await chat.sendMessage(message);
      askQuestion();
    });
  };

  askQuestion();
}

// Quick test scenarios
async function quickTest() {
  console.log('\n🧪 QUICK TEST MODE');
  console.log('='.repeat(60));
  
  try {
    await axios.get(`${CHATBOT_URL}/health`);
    console.log('✅ Service is available\n');
  } catch (error) {
    console.error('❌ Service not available. Start it with: npm run dev');
    process.exit(1);
  }

  const chat = new ChatSession('quick-test-user');
  
  console.log('Testing multi-turn conversation with memory...\n');
  
  // Turn 1
  await chat.sendMessage('Cho tôi xem áo sơ mi');
  await sleep(1500);
  
  // Turn 2 (should remember shirts)
  await chat.sendMessage('Có màu xanh không?');
  await sleep(1500);
  
  // Turn 3 (should remember blue shirts)
  await chat.sendMessage('Nike có không?');
  await sleep(1500);
  
  // Show history
  await chat.showHistory();
  
  // Clean up
  await chat.clearHistory();
  
  console.log('\n✅ Quick test completed!');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--quick') || args.includes('-q')) {
    quickTest().catch(error => {
      console.error('\n❌ Test failed:', error.message);
      process.exit(1);
    });
  } else {
    interactiveChat();
  }
}

module.exports = { ChatSession, interactiveChat, quickTest };
