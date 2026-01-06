#!/usr/bin/env node

/**
 * Storybook MCP CLI
 * 
 * Usage:
 *   npx storybook-mcp [options]
 *   npx storybook-mcp --port 6006 --mcp-port 8080
 */

const { Command } = require('commander');
const chalk = require('chalk');
const { startServer } = require('./server');
const { detectStorybookVersion, findStorybookConfig, detectFramework } = require('./utils');

const program = new Command();

program
  .name('storybook-mcp')
  .description('Expose Storybook stories via MCP protocol with SSE and HTTP streaming')
  .version('1.0.0')
  .option('-p, --port <number>', 'Port to run the API server on', '6006')
  .option('-m, --mcp-port <number>', 'Port for MCP server (SSE/HTTP streaming)', '8080')
  .option('-t, --transport <type>', 'MCP transport type: sse or httpStream', 'httpStream')
  .option('-s, --storybook-port <number>', 'Internal port for Storybook', '6010')
  .option('--no-proxy', 'Run API only (don\'t start/proxy Storybook)')
  .option('--storybook-url <url>', 'URL of running Storybook instance')
  .option('-d, --dir <path>', 'Project directory (default: current directory)', process.cwd())
  .action(async (options) => {
    console.log('');
    console.log(chalk.blue('╔═══════════════════════════════════════════════════════════╗'));
    console.log(chalk.blue('║           Storybook MCP Server                            ║'));
    console.log(chalk.blue('╚═══════════════════════════════════════════════════════════╝'));
    console.log('');

    const projectDir = options.dir;
    const version = detectStorybookVersion(projectDir);
    
    if (version) {
      console.log(chalk.green('✓') + ` Detected Storybook version: ${chalk.bold(version)}`);
    } else {
      console.log(chalk.yellow('⚠') + ' Could not detect Storybook version');
    }

    const framework = detectFramework(projectDir);
    if (framework !== 'unknown') {
      console.log(chalk.green('✓') + ` Detected framework: ${chalk.bold(framework)}`);
    } else {
      console.log(chalk.yellow('⚠') + ' Could not detect framework');
    }

    const configDir = findStorybookConfig(projectDir);
    if (configDir) {
      console.log(chalk.green('✓') + ` Found Storybook config: ${chalk.dim(configDir)}`);
    }

    const transportType = options.transport === 'sse' ? 'sse' : 'httpStream';
    console.log(chalk.green('✓') + ` MCP transport: ${chalk.bold(transportType)}`);

    const config = {
      port: parseInt(options.port, 10),
      mcpPort: parseInt(options.mcpPort, 10),
      storybookPort: parseInt(options.storybookPort, 10),
      storybookUrl: options.storybookUrl || `http://localhost:${options.storybookPort}`,
      projectDir,
      configDir,
      proxy: options.proxy !== false,
      version,
      framework,
      transportType,
    };

    try {
      await startServer(config);
    } catch (error) {
      console.error(chalk.red('Error starting server:'), error.message);
      process.exit(1);
    }
  });

program.parse();

