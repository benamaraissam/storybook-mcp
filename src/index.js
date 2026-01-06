/**
 * Storybook MCP - Programmatic interface
 * 
 * @example
 * const { createMCPServer, startServer } = require('storybook-mcp');
 */

const { createMCPServer, startServer, startStorybookProcess } = require('./server');
const { detectStorybookVersion, findStorybookConfig, detectFramework } = require('./utils');
const { extractComponentDocs, extractStoryExamples, parseStoryFile, generateUsageExample } = require('./parsers');

module.exports = {
  // Server
  createMCPServer,
  startServer,
  startStorybookProcess,
  
  // Utils
  detectStorybookVersion,
  findStorybookConfig,
  detectFramework,
  
  // Parsers
  extractComponentDocs,
  extractStoryExamples,
  parseStoryFile,
  generateUsageExample,
};

