/**
 * Introspect command for the CLI
 * 
 * This command allows users to introspect APIs and discover their schemas
 * using the appropriate connector for each protocol.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { UniversalAPIExplorer } from '../../index';
import { APIProtocol } from '../../types/core';
import { CLIConfigManager } from '../config';

/**
 * Create the introspect command
 */
export function createIntrospectCommand(configManager: CLIConfigManager): Command {
  const command = new Command('introspect');
  
  command
    .description('Introspect an API and discover its schema')
    .argument('<protocol>', 'API protocol (graphql, rest, websocket)')
    .argument('<url>', 'API endpoint URL')
    .option('-o, --output <file>', 'Output file for the schema (JSON format)')
    .option('-f, --format <format>', 'Output format (json, yaml)', 'json')
    .option('-v, --verbose', 'Enable verbose output')
    .option('--timeout <ms>', 'Request timeout in milliseconds', '30000')
    .option('--headers <headers>', 'Custom headers (JSON format)')
    .option('--save', 'Save schema to storage')
    .action(async (protocol: string, url: string, options: any) => {
      try {
        await handleIntrospectCommand(protocol, url, options, configManager);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
      }
    });

  return command;
}

/**
 * Handle the introspect command
 */
async function handleIntrospectCommand(
  protocol: string,
  url: string,
  options: {
    output?: string;
    format?: string;
    verbose?: boolean;
    timeout?: string;
    headers?: string;
    save?: boolean;
  },
  configManager: CLIConfigManager
): Promise<void> {
  // Validate protocol
  const validProtocols = Object.values(APIProtocol);
  if (!validProtocols.includes(protocol as APIProtocol)) {
    throw new Error(`Invalid protocol: ${protocol}. Valid protocols: ${validProtocols.join(', ')}`);
  }

  // Parse headers if provided
  let headers: Record<string, string> = {};
  if (options.headers) {
    try {
      headers = JSON.parse(options.headers);
    } catch (error) {
      throw new Error(`Invalid headers JSON: ${error instanceof Error ? error.message : 'Parse error'}`);
    }
  }

  // Create explorer instance with config
  const explorer = new UniversalAPIExplorer(configManager.getExplorerConfig());

  if (options.verbose) {
    console.log(chalk.blue('🔍 Starting API introspection...'));
    console.log(chalk.gray(`Protocol: ${protocol}`));
    console.log(chalk.gray(`URL: ${url}`));
    console.log(chalk.gray(`Timeout: ${options.timeout}ms`));
    if (Object.keys(headers).length > 0) {
      console.log(chalk.gray(`Headers: ${JSON.stringify(headers, null, 2)}`));
    }
    console.log();
  }

  // Perform introspection
  const startTime = Date.now();
  
  try {
    const result = await explorer.introspect(protocol as APIProtocol, url, {
      timeout: parseInt(options.timeout || '30000'),
      headers,
      followRedirects: true
    });

    const duration = Date.now() - startTime;

    if (!result.success) {
      console.error(chalk.red('❌ Introspection failed:'), result.error);
      if (result.metadata && options.verbose) {
        console.error(chalk.gray('Metadata:'), JSON.stringify(result.metadata, null, 2));
      }
      process.exit(1);
    }

    if (!result.schema) {
      console.error(chalk.red('❌ No schema returned from introspection'));
      process.exit(1);
    }

    // Display success message
    console.log(chalk.green('✅ Introspection successful!'));
    console.log(chalk.gray(`Duration: ${duration}ms`));
    console.log();

    // Display schema summary
    displaySchemaSummary(result.schema);

    // Display warnings if any
    if (result.warnings && result.warnings.length > 0) {
      console.log(chalk.yellow('⚠️  Warnings:'));
      for (const warning of result.warnings) {
        console.log(chalk.yellow(`  • ${warning}`));
      }
      console.log();
    }

    // Save to storage if requested
    if (options.save) {
      try {
        const schemaId = await explorer.saveSchema(result.schema);
        console.log(chalk.green(`💾 Schema saved with ID: ${schemaId}`));
      } catch (error) {
        console.error(chalk.yellow('⚠️  Failed to save schema:'), error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Output to file if requested
    if (options.output) {
      await outputSchemaToFile(result.schema, options.output, options.format || 'json');
      console.log(chalk.green(`📄 Schema written to: ${options.output}`));
    }

    // Display verbose metadata
    if (options.verbose && result.metadata) {
      console.log(chalk.blue('📊 Introspection Metadata:'));
      console.log(JSON.stringify(result.metadata, null, 2));
    }

    // Close the explorer to cleanup resources
    await explorer.close();

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(chalk.red('❌ Introspection failed:'), error instanceof Error ? error.message : 'Unknown error');
    console.error(chalk.gray(`Duration: ${duration}ms`));

    if (options.verbose && error instanceof Error && error.stack) {
      console.error(chalk.gray('Stack trace:'));
      console.error(chalk.gray(error.stack));
    }

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
 * Display schema summary
 */
function displaySchemaSummary(schema: any): void {
  console.log(chalk.blue('📋 Schema Summary:'));
  console.log(`  Name: ${chalk.white(schema.name)}`);
  console.log(`  Version: ${chalk.white(schema.version)}`);
  console.log(`  Protocol: ${chalk.white(schema.protocol)}`);
  
  if (schema.baseUrl) {
    console.log(`  Base URL: ${chalk.white(schema.baseUrl)}`);
  }
  
  if (schema.description) {
    console.log(`  Description: ${chalk.gray(schema.description)}`);
  }
  
  console.log(`  Operations: ${chalk.white(schema.operations.length)}`);
  console.log(`  Types: ${chalk.white(Object.keys(schema.types).length)}`);
  console.log(`  Discovered: ${chalk.gray(new Date(schema.discoveredAt).toLocaleString())}`);
  
  if (schema.authentication && schema.authentication.type !== 'none') {
    console.log(`  Authentication: ${chalk.white(schema.authentication.type)}`);
  }
  
  console.log();
}

/**
 * Output schema to file
 */
async function outputSchemaToFile(schema: any, filePath: string, format: string): Promise<void> {
  const fs = await import('fs/promises');
  
  let content: string;
  
  switch (format.toLowerCase()) {
    case 'json':
      content = JSON.stringify(schema, null, 2);
      break;
    case 'yaml':
    case 'yml':
      const yaml = await import('yaml');
      content = yaml.stringify(schema);
      break;
    default:
      throw new Error(`Unsupported output format: ${format}`);
  }
  
  await fs.writeFile(filePath, content, 'utf8');
}
