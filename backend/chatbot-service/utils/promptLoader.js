const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class PromptLoader {
  constructor() {
    this.promptsPath = path.join(__dirname, '../prompts');
    this.cache = new Map();
  }

  /**
   * Load a prompt from file with optional variable substitution
   * @param {string} promptName - Name of the prompt file (without .txt extension)
   * @param {Object} variables - Variables to substitute in the prompt
   * @returns {string} The loaded prompt content
   */
  loadPrompt(promptName, variables = {}) {
    try {
      // Check cache first
      const cacheKey = `${promptName}`;
      if (this.cache.has(cacheKey)) {
        let content = this.cache.get(cacheKey);
        return this.substituteVariables(content, variables);
      }

      // Load from file
      const promptFilePath = path.join(this.promptsPath, `${promptName}.txt`);
      
      if (!fs.existsSync(promptFilePath)) {
        logger.error(`Prompt file not found: ${promptFilePath}`);
        throw new Error(`Prompt file not found: ${promptName}.txt`);
      }

      const content = fs.readFileSync(promptFilePath, 'utf8');
      
      // Cache the content
      this.cache.set(cacheKey, content);
      
      logger.info(`Loaded prompt: ${promptName}`, { 
        length: content.length,
        variableCount: Object.keys(variables).length 
      });

      return this.substituteVariables(content, variables);

    } catch (error) {
      logger.error(`Failed to load prompt: ${promptName}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Substitute variables in prompt content
   * @param {string} content - The prompt content
   * @param {Object} variables - Variables to substitute
   * @returns {string} Content with substituted variables
   */
  substituteVariables(content, variables) {
    let result = content;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }
    
    return result;
  }

  /**
   * Clear the prompt cache
   */
  clearCache() {
    this.cache.clear();
    logger.info('Prompt cache cleared');
  }

  /**
   * List all available prompts
   * @returns {string[]} Array of prompt names
   */
  getAvailablePrompts() {
    try {
      const files = fs.readdirSync(this.promptsPath);
      return files
        .filter(file => file.endsWith('.txt'))
        .map(file => file.replace('.txt', ''));
    } catch (error) {
      logger.error('Failed to list prompts', { error: error.message });
      return [];
    }
  }
}

module.exports = new PromptLoader();