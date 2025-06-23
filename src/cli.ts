#!/usr/bin/env node

/**
 * Universal API Schema Explorer CLI
 * 
 * Command-line interface for introspecting and exploring REST, GraphQL,
 * and WebSocket APIs. Provides commands for discovery, storage, and
 * analysis of API schemas.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createIntrospectCommand } from './cli/commands/introspect';
import { createListCommand } from './cli/commands/list';
import { createShowCommand } from './cli/commands/show';
import { createCLIConfig, CLIConfigManager } from './cli/config';

/**
 * Main CLI program
 */
function createCLI(configManager: CLIConfigManager): Command {
  const program = new Command();

  program
    .name('api-explorer')
    .description('Universal API Schema Explorer - Introspect REST, GraphQL, and WebSocket APIs')
    .version('1.0.0');

  // Add commands with config manager
  program.addCommand(createIntrospectCommand(configManager));
  program.addCommand(createListCommand(configManager));
  program.addCommand(createShowCommand(configManager));

  // Add global options
  program
    .option('--no-color', 'Disable colored output')
    .option('--config <file>', 'Configuration file path')
    .option('--storage <type>', 'Storage type (memory, file)', 'file')
    .option('--storage-dir <dir>', 'Storage directory (for file storage)')
    .hook('preAction', (thisCommand: any) => {
      // Disable colors if requested
      if (thisCommand.opts().noColor) {
        chalk.level = 0;
      }

      // Update config based on CLI options
      const opts = thisCommand.opts();
      if (opts.storage) {
        configManager.setStorageType(opts.storage,
          opts.storage === 'file' ? { baseDirectory: opts.storageDir || './schemas' } : {}
        );
      }
      if (opts.storageDir) {
        configManager.updateConfig({ storageDirectory: opts.storageDir });
      }
    });

  // Add help examples
  program.on('--help', () => {
    console.log('');
    console.log('Examples:');
    console.log('  $ api-explorer introspect graphql https://api.github.com/graphql');
    console.log('  $ api-explorer introspect rest https://petstore.swagger.io/v2/swagger.json');
    console.log('  $ api-explorer introspect websocket wss://echo.websocket.org');
    console.log('  $ api-explorer list --protocol graphql');
    console.log('  $ api-explorer show <schema-id> --operations');
    console.log('');
    console.log('For more information about a specific command:');
    console.log('  $ api-explorer <command> --help');
  });

  return program;
}

/**
 * Run the CLI
 */
async function main(): Promise<void> {
  try {
    // Load configuration
    const configManager = await createCLIConfig();

    const program = createCLI(configManager);
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(chalk.red('Fatal error:'), error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, _promise: any) => {
  console.error(chalk.red('Unhandled promise rejection:'), reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: any) => {
  console.error(chalk.red('Uncaught exception:'), error.message);
  process.exit(1);
});

// Run the CLI if this file is executed directly
if (require.main === module) {
  main();
}

export { createCLI, main };
