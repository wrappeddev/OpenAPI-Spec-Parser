/**
 * Show command for the CLI
 * 
 * This command displays detailed information about a specific stored schema.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { UniversalAPIExplorer } from '../../index';
import { CLIConfigManager } from '../config';

/**
 * Create the show command
 */
export function createShowCommand(configManager: CLIConfigManager): Command {
  const command = new Command('show');
  
  command
    .description('Show detailed information about a stored schema')
    .argument('<id>', 'Schema ID to display')
    .option('--operations', 'Show all operations')
    .option('--types', 'Show all type definitions')
    .option('--format <format>', 'Output format (pretty, json)', 'pretty')
    .action(async (id: string, options: any) => {
      try {
        await handleShowCommand(id, options, configManager);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
      }
    });

  return command;
}

/**
 * Handle the show command
 */
async function handleShowCommand(
  id: string,
  options: {
    operations?: boolean;
    types?: boolean;
    format?: string;
  },
  configManager: CLIConfigManager
): Promise<void> {
  // Create explorer instance with config
  const explorer = new UniversalAPIExplorer(configManager.getExplorerConfig());

  try {
    const schema = await explorer.getSchema(id);

    if (!schema) {
      console.error(chalk.red(`Schema with ID "${id}" not found.`));
      console.log(chalk.gray('Use "list" command to see available schemas.'));
      process.exit(1);
    }

    if (options.format === 'json') {
      console.log(JSON.stringify(schema, null, 2));
      return;
    }

    // Display schema in pretty format
    displaySchemaDetails(schema, options);

    // Close the explorer to cleanup resources
    await explorer.close();

  } catch (error) {
    console.error(chalk.red('Failed to retrieve schema:'), error instanceof Error ? error.message : 'Unknown error');

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
 * Display detailed schema information
 */
function displaySchemaDetails(schema: any, options: { operations?: boolean; types?: boolean }): void {
  const protocolColor = getProtocolColor(schema.protocol);
  
  // Header
  console.log(chalk.blue('📋 Schema Details'));
  console.log('='.repeat(50));
  console.log();

  // Basic information
  console.log(chalk.white.bold('Basic Information:'));
  console.log(`  Name: ${chalk.white(schema.name)}`);
  console.log(`  ID: ${chalk.gray(schema.id)}`);
  console.log(`  Version: ${chalk.white(schema.version)}`);
  console.log(`  Protocol: ${protocolColor(schema.protocol.toUpperCase())}`);
  
  if (schema.baseUrl) {
    console.log(`  Base URL: ${chalk.white(schema.baseUrl)}`);
  }
  
  if (schema.source) {
    console.log(`  Source: ${chalk.gray(schema.source)}`);
  }
  
  console.log(`  Discovered: ${chalk.gray(new Date(schema.discoveredAt).toLocaleString())}`);
  
  if (schema.description) {
    console.log(`  Description: ${chalk.gray(schema.description)}`);
  }
  
  console.log();

  // Authentication
  if (schema.authentication && schema.authentication.type !== 'none') {
    console.log(chalk.white.bold('Authentication:'));
    console.log(`  Type: ${chalk.white(schema.authentication.type)}`);
    
    if (schema.authentication.description) {
      console.log(`  Description: ${chalk.gray(schema.authentication.description)}`);
    }
    
    if (schema.authentication.scopes && schema.authentication.scopes.length > 0) {
      console.log(`  Scopes: ${chalk.gray(schema.authentication.scopes.join(', '))}`);
    }
    
    console.log();
  }

  // Statistics
  console.log(chalk.white.bold('Statistics:'));
  console.log(`  Operations: ${chalk.white(schema.operations.length)}`);
  console.log(`  Types: ${chalk.white(Object.keys(schema.types).length)}`);
  
  // Count operations by type/method
  const operationStats = getOperationStats(schema.operations);
  if (Object.keys(operationStats).length > 0) {
    console.log(`  Operation breakdown:`);
    for (const [type, count] of Object.entries(operationStats)) {
      console.log(`    ${type}: ${chalk.white(count)}`);
    }
  }
  
  console.log();

  // Operations
  if (options.operations || schema.operations.length <= 10) {
    console.log(chalk.white.bold('Operations:'));
    
    if (schema.operations.length === 0) {
      console.log(chalk.gray('  No operations found.'));
    } else {
      for (const operation of schema.operations) {
        displayOperation(operation);
      }
    }
    
    console.log();
  } else {
    console.log(chalk.white.bold('Operations (sample):'));
    const sampleOps = schema.operations.slice(0, 5);
    
    for (const operation of sampleOps) {
      displayOperationSummary(operation);
    }
    
    if (schema.operations.length > 5) {
      console.log(chalk.gray(`  ... and ${schema.operations.length - 5} more operations`));
      console.log(chalk.gray('  Use --operations flag to see all operations'));
    }
    
    console.log();
  }

  // Types
  if (options.types) {
    console.log(chalk.white.bold('Type Definitions:'));
    
    if (Object.keys(schema.types).length === 0) {
      console.log(chalk.gray('  No custom types defined.'));
    } else {
      for (const [typeName, typeDef] of Object.entries(schema.types)) {
        displayType(typeName, typeDef as any);
      }
    }
    
    console.log();
  } else if (Object.keys(schema.types).length > 0) {
    console.log(chalk.white.bold('Types (summary):'));
    const typeNames = Object.keys(schema.types).slice(0, 10);
    console.log(`  ${chalk.gray(typeNames.join(', '))}`);
    
    if (Object.keys(schema.types).length > 10) {
      console.log(chalk.gray(`  ... and ${Object.keys(schema.types).length - 10} more types`));
    }
    
    console.log(chalk.gray('  Use --types flag to see all type definitions'));
    console.log();
  }

  // Metadata
  if (schema.metadata) {
    console.log(chalk.white.bold('Metadata:'));
    
    if (schema.metadata.contact) {
      console.log(`  Contact: ${schema.metadata.contact.name || 'N/A'}`);
      if (schema.metadata.contact.email) {
        console.log(`  Email: ${chalk.gray(schema.metadata.contact.email)}`);
      }
    }
    
    if (schema.metadata.license) {
      console.log(`  License: ${schema.metadata.license.name}`);
    }
    
    if (schema.metadata.externalDocs) {
      console.log(`  Documentation: ${chalk.gray(schema.metadata.externalDocs.url)}`);
    }
    
    console.log();
  }
}

/**
 * Display operation details
 */
function displayOperation(operation: any): void {
  const method = operation.method ? `${operation.method.toUpperCase()} ` : '';
  const deprecated = operation.deprecated ? chalk.red(' [DEPRECATED]') : '';
  
  console.log(`  ${chalk.white(method)}${chalk.cyan(operation.name)}${deprecated}`);
  
  if (operation.description) {
    console.log(`    ${chalk.gray(operation.description)}`);
  }
  
  if (operation.path) {
    console.log(`    Path: ${chalk.gray(operation.path)}`);
  }
  
  if (operation.parameters && operation.parameters.length > 0) {
    console.log(`    Parameters: ${operation.parameters.length}`);
  }
  
  if (operation.responses && operation.responses.length > 0) {
    const statusCodes = operation.responses.map((r: any) => r.statusCode).join(', ');
    console.log(`    Responses: ${chalk.gray(statusCodes)}`);
  }
  
  console.log();
}

/**
 * Display operation summary (one line)
 */
function displayOperationSummary(operation: any): void {
  const method = operation.method ? `${operation.method.toUpperCase()} ` : '';
  const deprecated = operation.deprecated ? chalk.red(' [DEPRECATED]') : '';
  
  console.log(`  ${chalk.white(method)}${chalk.cyan(operation.name)}${deprecated}`);
}

/**
 * Display type definition
 */
function displayType(typeName: string, typeDef: any): void {
  console.log(`  ${chalk.white.bold(typeName)} (${typeDef.type})`);
  
  if (typeDef.description) {
    console.log(`    ${chalk.gray(typeDef.description)}`);
  }
  
  if (typeDef.properties && Object.keys(typeDef.properties).length > 0) {
    console.log(`    Properties: ${Object.keys(typeDef.properties).length}`);
    
    // Show first few properties
    const propNames = Object.keys(typeDef.properties).slice(0, 3);
    for (const propName of propNames) {
      const prop = typeDef.properties[propName];
      const required = prop.required ? chalk.red('*') : '';
      console.log(`      ${chalk.cyan(propName)}${required}: ${prop.type}`);
    }
    
    if (Object.keys(typeDef.properties).length > 3) {
      console.log(`      ... and ${Object.keys(typeDef.properties).length - 3} more properties`);
    }
  }
  
  console.log();
}

/**
 * Get operation statistics
 */
function getOperationStats(operations: any[]): Record<string, number> {
  const stats: Record<string, number> = {};
  
  for (const operation of operations) {
    const key = operation.method || operation.type || 'unknown';
    stats[key] = (stats[key] || 0) + 1;
  }
  
  return stats;
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
