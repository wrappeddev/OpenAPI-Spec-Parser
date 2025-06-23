/**
 * List command for the CLI
 * 
 * This command allows users to list stored schemas with filtering and search capabilities.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { UniversalAPIExplorer } from '../../index';
import { APIProtocol } from '../../types/core';
import { CLIConfigManager } from '../config';

/**
 * Create the list command
 */
export function createListCommand(configManager: CLIConfigManager): Command {
  const command = new Command('list');
  
  command
    .description('List stored API schemas')
    .option('-p, --protocol <protocol>', 'Filter by protocol (graphql, rest, websocket)')
    .option('-s, --search <term>', 'Search in schema names and descriptions')
    .option('-l, --limit <number>', 'Limit number of results', '10')
    .option('-o, --offset <number>', 'Skip number of results', '0')
    .option('--format <format>', 'Output format (table, json)', 'table')
    .option('-v, --verbose', 'Show detailed information')
    .action(async (options: any) => {
      try {
        await handleListCommand(options, configManager);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
      }
    });

  return command;
}

/**
 * Handle the list command
 */
async function handleListCommand(options: {
  protocol?: string;
  search?: string;
  limit?: string;
  offset?: string;
  format?: string;
  verbose?: boolean;
}, configManager: CLIConfigManager): Promise<void> {
  // Validate protocol if provided
  if (options.protocol) {
    const validProtocols = Object.values(APIProtocol);
    if (!validProtocols.includes(options.protocol as APIProtocol)) {
      throw new Error(`Invalid protocol: ${options.protocol}. Valid protocols: ${validProtocols.join(', ')}`);
    }
  }

  // Create explorer instance with config
  const explorer = new UniversalAPIExplorer(configManager.getExplorerConfig());

  // Build query
  const query: any = {
    limit: parseInt(options.limit || '10'),
    offset: parseInt(options.offset || '0')
  };

  if (options.protocol) {
    query.protocol = options.protocol;
  }

  if (options.search) {
    query.search = options.search;
  }

  try {
    const result = await explorer.listSchemas(query);

    if (result.schemas.length === 0) {
      console.log(chalk.yellow('No schemas found.'));
      
      if (options.protocol || options.search) {
        console.log(chalk.gray('Try adjusting your filters or search terms.'));
      } else {
        console.log(chalk.gray('Use the "introspect" command to discover and store API schemas.'));
      }
      
      return;
    }

    // Display results
    if (options.format === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      displaySchemasTable(result.schemas, options.verbose || false);
      
      // Display pagination info
      if (result.totalCount > result.schemas.length) {
        const showing = Math.min(query.offset + result.schemas.length, result.totalCount);
        console.log();
        console.log(chalk.gray(`Showing ${query.offset + 1}-${showing} of ${result.totalCount} schemas`));
        
        if (result.hasMore) {
          const nextOffset = query.offset + query.limit;
          console.log(chalk.gray(`Use --offset ${nextOffset} to see more results`));
        }
      }
    }

    // Close the explorer to cleanup resources
    await explorer.close();

  } catch (error) {
    console.error(chalk.red('Failed to list schemas:'), error instanceof Error ? error.message : 'Unknown error');

    // Close the explorer even on error
    try {
      await explorer.close();
    } catch {
      // Ignore cleanup errors
    }

    process.exit(1);
  }
}

/**
 * Display schemas in table format
 */
function displaySchemasTable(schemas: any[], verbose: boolean): void {
  console.log(chalk.blue('📋 Stored API Schemas:'));
  console.log();

  for (const schema of schemas) {
    // Header with name and protocol
    const protocolColor = getProtocolColor(schema.protocol);
    console.log(`${chalk.white.bold(schema.name)} ${chalk.gray('•')} ${protocolColor(schema.protocol.toUpperCase())}`);
    
    // Basic info
    console.log(`  ${chalk.gray('ID:')} ${schema.id}`);
    console.log(`  ${chalk.gray('Version:')} ${schema.version}`);
    
    if (schema.baseUrl) {
      console.log(`  ${chalk.gray('URL:')} ${schema.baseUrl}`);
    }
    
    if (schema.source) {
      console.log(`  ${chalk.gray('Source:')} ${schema.source}`);
    }
    
    console.log(`  ${chalk.gray('Operations:')} ${schema.operations.length}`);
    console.log(`  ${chalk.gray('Types:')} ${Object.keys(schema.types).length}`);
    console.log(`  ${chalk.gray('Discovered:')} ${new Date(schema.discoveredAt).toLocaleString()}`);
    
    if (verbose) {
      if (schema.description) {
        console.log(`  ${chalk.gray('Description:')} ${schema.description}`);
      }
      
      if (schema.authentication && schema.authentication.type !== 'none') {
        console.log(`  ${chalk.gray('Auth:')} ${schema.authentication.type}`);
      }
      
      // Show some operations
      if (schema.operations.length > 0) {
        console.log(`  ${chalk.gray('Sample Operations:')}`);
        const sampleOps = schema.operations.slice(0, 3);
        for (const op of sampleOps) {
          const method = op.method ? `${op.method} ` : '';
          console.log(`    • ${method}${op.name}`);
        }
        if (schema.operations.length > 3) {
          console.log(`    ... and ${schema.operations.length - 3} more`);
        }
      }
    }
    
    console.log();
  }
}

/**
 * Get color for protocol display
 */
function getProtocolColor(protocol: string): (text: string) => string {
  switch (protocol.toLowerCase()) {
    case 'graphql':
      return chalk.magenta;
    case 'rest':
      return chalk.green;
    case 'websocket':
      return chalk.cyan;
    default:
      return chalk.white;
  }
}
