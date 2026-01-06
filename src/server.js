/**
 * Storybook MCP Server
 * 
 * Exposes Storybook stories via MCP protocol with SSE and HTTP streaming
 * Supports Storybook 8, 9, and 10
 */

const { FastMCP } = require('fastmcp');
const { z } = require('zod');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const chalk = require('chalk');
const express = require('express');
const cors = require('cors');

const { extractComponentDocs, extractStoryExamples, parseStoryFile, generateUsageExample } = require('./parsers');
const { detectFramework, detectStorybookVersion } = require('./utils');

/**
 * Create MCP server instance
 */
function createMCPServer(config) {
  const { storybookUrl, projectDir, version } = config;
  const framework = detectFramework(projectDir);

  const server = new FastMCP({
    name: 'storybook-mcp-tools',
    version: '1.0.0',
  });

  // Tool: List all stories
  server.addTool({
    name: 'list_stories',
    description: 'List all available Storybook stories',
    parameters: z.object({
      kind: z.string().optional().describe('Filter stories by kind/category'),
    }),
    execute: async (args) => {
      try {
        const response = await fetch(`${storybookUrl}/index.json`);
        if (!response.ok) {
          return { error: 'Storybook is not ready. Please wait...' };
        }

        const data = await response.json();
        let stories = Object.values(data.entries || {}).map(entry => ({
          id: entry.id,
          name: entry.name,
          title: entry.title,
          kind: entry.kind || entry.title,
          importPath: entry.importPath,
          tags: entry.tags || [],
          type: entry.type,
        }));

        if (args.kind) {
          stories = stories.filter(s => s.kind === args.kind || s.title === args.kind);
        }

        return {
          success: true,
          count: stories.length,
          stories,
        };
      } catch (error) {
        return { error: error.message };
      }
    },
  });

  // Tool: Get story details
  server.addTool({
    name: 'get_story',
    description: 'Get detailed information about a specific story',
    parameters: z.object({
      storyId: z.string().describe('The story ID (e.g., example-button--primary)'),
    }),
    execute: async (args) => {
      try {
        const response = await fetch(`${storybookUrl}/index.json`);
        if (!response.ok) {
          return { error: 'Storybook is not ready' };
        }

        const data = await response.json();
        const entry = data.entries?.[args.storyId];

        if (!entry) {
          return { error: `Story "${args.storyId}" not found` };
        }

        const story = {
          id: entry.id,
          name: entry.name,
          title: entry.title,
          kind: entry.kind || entry.title,
          importPath: entry.importPath,
          tags: entry.tags || [],
          type: entry.type,
        };

        // Parse story file for additional details
        if (entry.importPath) {
          const cleanPath = entry.importPath.replace(/^\.\//, '');
          const storyFilePath = path.join(projectDir, cleanPath);
          const parsed = parseStoryFile(storyFilePath, args.storyId, projectDir);
          if (parsed) {
            story.component = parsed.component;
            story.args = parsed.args || {};
            story.argTypes = parsed.argTypes || {};
            if (parsed.componentDocs) {
              story.docs = parsed.componentDocs;
            }
          }
        }

        return { success: true, story };
      } catch (error) {
        return { error: error.message };
      }
    },
  });

  // Tool: Get story documentation
  server.addTool({
    name: 'get_story_docs',
    description: 'Get full documentation for a story including code examples',
    parameters: z.object({
      storyId: z.string().describe('The story ID (e.g., example-button--docs)'),
    }),
    execute: async (args) => {
      try {
        const response = await fetch(`${storybookUrl}/index.json`);
        if (!response.ok) {
          return { error: 'Storybook is not ready' };
        }

        const data = await response.json();
        const entry = data.entries?.[args.storyId];

        if (!entry) {
          return { error: `Story "${args.storyId}" not found` };
        }

        const docs = {
          storyId: args.storyId,
          title: entry.title,
          name: entry.name,
          type: entry.type,
          framework,
        };

        if (entry.importPath && !entry.importPath.endsWith('.mdx')) {
          const cleanPath = entry.importPath.replace(/^\.\//, '');
          const storyFilePath = path.join(projectDir, cleanPath);

          if (fs.existsSync(storyFilePath)) {
            const content = fs.readFileSync(storyFilePath, 'utf8');

            // Get component info
            const componentMatch = content.match(/component:\s*(\w+)/);
            if (componentMatch) {
              docs.component = componentMatch[1];

              const importMatch = content.match(new RegExp(`import\\s*\\{[^}]*${componentMatch[1]}[^}]*\\}\\s*from\\s*['"]([^'"]+)['"]`));
              if (importMatch) {
                const storyDir = path.dirname(storyFilePath);
                let componentFilePath = path.resolve(storyDir, importMatch[1]);
                
                const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte'];
                for (const ext of extensions) {
                  const fullPath = componentFilePath + ext;
                  if (fs.existsSync(fullPath)) {
                    const componentDocs = extractComponentDocs(fullPath);
                    if (componentDocs) {
                      docs.selector = componentDocs.selector;
                      docs.template = componentDocs.template;
                      docs.componentCode = componentDocs.componentCode;
                      docs.properties = componentDocs.properties;
                      docs.componentDescription = componentDocs.description;
                    }
                    break;
                  }
                }
              }
            }

            // Get story examples
            const storyExamples = extractStoryExamples(storyFilePath);
            if (storyExamples) {
              docs.imports = storyExamples.imports;
              docs.metaCode = storyExamples.meta;
              docs.storyExamples = storyExamples.stories;

              if (docs.selector && storyExamples.stories) {
                docs.usageExamples = {};
                Object.entries(storyExamples.stories).forEach(([name, story]) => {
                  docs.usageExamples[name] = generateUsageExample(docs.selector, story.args, name, framework);
                });
              }
            }
          }
        } else if (entry.importPath && entry.importPath.endsWith('.mdx')) {
          const cleanPath = entry.importPath.replace(/^\.\//, '');
          const mdxPath = path.join(projectDir, cleanPath);
          if (fs.existsSync(mdxPath)) {
            docs.mdxContent = fs.readFileSync(mdxPath, 'utf8');
          }
        }

        return { success: true, docs };
      } catch (error) {
        return { error: error.message };
      }
    },
  });

  // Resource: Storybook stories
  server.addResource({
    uri: 'storybook://stories',
    name: 'Storybook Stories',
    description: 'All available Storybook stories',
    mimeType: 'application/json',
    getContent: async () => {
      try {
        const response = await fetch(`${storybookUrl}/index.json`);
        if (!response.ok) {
          return JSON.stringify({ error: 'Storybook is not ready' });
        }

        const data = await response.json();
        const stories = Object.values(data.entries || {}).map(entry => ({
          id: entry.id,
          name: entry.name,
          title: entry.title,
          kind: entry.kind || entry.title,
          type: entry.type,
        }));

        return JSON.stringify({ success: true, count: stories.length, stories }, null, 2);
      } catch (error) {
        return JSON.stringify({ error: error.message });
      }
    },
  });

  return server;
}

/**
 * Start Storybook process
 */
function startStorybookProcess(config) {
  const { storybookPort, projectDir, version, framework } = config;

  console.log(chalk.blue('→') + ` Starting Storybook (internal)...`);

  let cmd = 'npx';
  let args = ['storybook', 'dev', '-p', storybookPort.toString(), '--no-open'];

  // For Angular projects with Storybook 8+, try Angular builder first
  if (framework === 'angular' && version >= 8) {
    const angularJsonPath = path.join(projectDir, 'angular.json');
    if (fs.existsSync(angularJsonPath)) {
      try {
        const angularJson = JSON.parse(fs.readFileSync(angularJsonPath, 'utf8'));
        for (const [projectName, project] of Object.entries(angularJson.projects || {})) {
          if (project.architect?.storybook) {
            if (!angularJson.projects[projectName].architect.storybook.options) {
              angularJson.projects[projectName].architect.storybook.options = {};
            }
            angularJson.projects[projectName].architect.storybook.options.compodoc = false;
            angularJson.projects[projectName].architect.storybook.options.port = storybookPort;
            fs.writeFileSync(angularJsonPath, JSON.stringify(angularJson, null, 2));
            
            const packageJsonPath = path.join(projectDir, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
              const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
              if (packageJson.scripts?.storybook && packageJson.scripts.storybook.includes('ng run')) {
                cmd = 'npm';
                args = ['run', 'storybook'];
                console.log(chalk.dim(`   Using npm script for Angular builder`));
                break;
              }
            }
            cmd = 'npm';
            args = ['run', 'storybook'];
            console.log(chalk.dim(`   Using Angular builder via npm script`));
            break;
          }
        }
      } catch (error) {
        console.log(chalk.yellow('⚠️  Could not read angular.json, falling back to standard Storybook CLI'));
      }
    }
  }

  const storybook = spawn(cmd, args, {
    cwd: projectDir,
    shell: true,
    stdio: 'pipe',
    env: {
      ...process.env,
      PORT: storybookPort.toString(),
      STORYBOOK_PORT: storybookPort.toString(),
    },
  });

  storybook.stdout.on('data', (data) => {
    const msg = data.toString();
    process.stdout.write(chalk.dim('[Storybook] ') + msg);
  });

  storybook.stderr.on('data', (data) => {
    const msg = data.toString();
    if (!msg.includes('ExperimentalWarning') && !msg.includes('punycode')) {
      process.stderr.write(chalk.dim('[Storybook] ') + msg);
    }
  });

  storybook.on('close', (code) => {
    if (code !== 0) {
      console.log(chalk.yellow(`[Storybook] Process exited with code ${code}`));
    }
  });

  return storybook;
}

/**
 * Start the MCP server with Express for REST API and proxy
 */
async function startServer(config) {
  const { port, storybookPort, storybookUrl, projectDir, proxy, mcpPort, transportType } = config;

  // Create Express app for REST API and proxy
  const app = express();
  app.use(cors());
  app.use(express.json());

  // REST API endpoints (for backward compatibility)
  app.get('/api', (req, res) => {
    res.json({
      success: true,
      name: 'Storybook MCP API',
      version: '1.0.0',
      storybookVersion: config.version || 'unknown',
      framework: detectFramework(projectDir),
      endpoints: {
        'GET /api': 'This documentation',
        'GET /api/stories': 'Get all stories',
        'GET /api/stories/:storyId': 'Get a specific story',
        'GET /api/docs/:storyId': 'Get story documentation',
      },
      mcp: {
        port: mcpPort,
        transport: transportType || 'httpStream',
        endpoints: {
          sse: transportType === 'sse' ? `http://localhost:${mcpPort}` : null,
          httpStream: transportType === 'httpStream' ? `http://localhost:${mcpPort}` : null,
        },
      },
    });
  });

  // Proxy Storybook requests
  let storybookProcess = null;
  if (proxy) {
    storybookProcess = startStorybookProcess(config);

    app.use('/', createProxyMiddleware({
      target: storybookUrl,
      changeOrigin: true,
      ws: true,
      onError: (err, req, res) => {
        if (res.writeHead) {
          res.writeHead(503, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <head><title>Storybook Starting...</title></head>
              <body style="font-family: sans-serif; padding: 40px; text-align: center;">
                <h1>⏳ Storybook is starting...</h1>
                <p>Please wait a moment and refresh this page.</p>
                <script>setTimeout(() => location.reload(), 3000);</script>
              </body>
            </html>
          `);
        }
      },
    }));
  }

  // Create and start MCP server
  const mcpServer = createMCPServer(config);
  
  // Start Express server
  const expressServer = app.listen(port, async () => {
    console.log('');
    console.log(chalk.blue('═══════════════════════════════════════════════════════════'));
    console.log(chalk.blue('  ⏳ API server started, waiting for Storybook...'));
    console.log(chalk.blue('═══════════════════════════════════════════════════════════'));
    console.log('');

    // Wait for Storybook to be ready
    if (proxy && storybookProcess) {
      let storybookReady = false;
      const maxWaitTime = 120000;
      const startTime = Date.now();
      const checkInterval = 2000;

      while (!storybookReady && (Date.now() - startTime) < maxWaitTime) {
        try {
          const response = await fetch(`${storybookUrl}/index.json`);
          if (response.ok) {
            const data = await response.json();
            if (data.entries && Object.keys(data.entries).length > 0) {
              storybookReady = true;
              break;
            }
          }
        } catch (error) {
          // Storybook not ready yet
        }
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      if (storybookReady) {
        console.log('');
        console.log(chalk.green('═══════════════════════════════════════════════════════════'));
        console.log(chalk.green('  ✓ Storybook is ready!'));
        console.log(chalk.green('═══════════════════════════════════════════════════════════'));
        console.log('');
        console.log(`  ${chalk.bold('Storybook UI:')}  ${chalk.cyan(`http://localhost:${port}`)}`);
        console.log(`  ${chalk.bold('REST API:')}      ${chalk.cyan(`http://localhost:${port}/api`)}`);
        console.log(`  ${chalk.bold('MCP Server:')}    ${chalk.cyan(`http://localhost:${mcpPort}`)}`);
        console.log(`  ${chalk.bold('Transport:')}    ${chalk.cyan(transportType || 'httpStream')}`);
        console.log('');
        console.log(chalk.dim('  Press Ctrl+C to stop'));
        console.log('');
      }
    }

    // Start MCP server
    const mcpTransportType = transportType || 'httpStream';
    if (mcpTransportType === 'sse') {
      mcpServer.start({
        transportType: 'sse',
        sse: {
          port: mcpPort,
        },
      });
    } else {
      mcpServer.start({
        transportType: 'httpStream',
        httpStream: {
          port: mcpPort,
        },
      });
    }
  });

  // Handle shutdown
  const shutdown = () => {
    console.log(chalk.yellow('\n  Shutting down...'));
    if (storybookProcess) {
      storybookProcess.kill();
    }
    expressServer.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return { expressServer, mcpServer };
}

module.exports = {
  createMCPServer,
  startServer,
  startStorybookProcess,
};

