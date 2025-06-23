/**
 * Basic Usage Examples for Universal API Schema Explorer
 * 
 * This file demonstrates how to use the Universal API Schema Explorer
 * to introspect different types of APIs and work with the results.
 */

import { UniversalAPIExplorer, APIProtocol } from '../src';

async function basicExamples() {
  // Create an explorer instance
  const explorer = new UniversalAPIExplorer({
    autoSave: true,
    storage: {
      type: 'memory',
      options: {
        maxSchemas: 100
      }
    }
  });

  try {
    console.log('🚀 Starting Universal API Schema Explorer examples...\n');

    // Example 1: Introspect a GraphQL API
    console.log('📊 Example 1: GraphQL API Introspection');
    console.log('=========================================');
    
    try {
      const graphqlResult = await explorer.introspect(
        APIProtocol.GRAPHQL,
        'https://api.github.com/graphql',
        {
          headers: {
            'Authorization': 'Bearer YOUR_GITHUB_TOKEN' // Replace with actual token
          }
        }
      );

      if (graphqlResult.success && graphqlResult.schema) {
        console.log(`✅ GraphQL schema discovered: ${graphqlResult.schema.name}`);
        console.log(`   Operations: ${graphqlResult.schema.operations.length}`);
        console.log(`   Types: ${Object.keys(graphqlResult.schema.types).length}`);
      } else {
        console.log(`❌ GraphQL introspection failed: ${graphqlResult.error}`);
      }
    } catch (error) {
      console.log(`❌ GraphQL example failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log();

    // Example 2: Introspect a REST API
    console.log('🌐 Example 2: REST API Introspection');
    console.log('====================================');
    
    try {
      const restResult = await explorer.introspect(
        APIProtocol.REST,
        'https://petstore.swagger.io/v2/swagger.json'
      );

      if (restResult.success && restResult.schema) {
        console.log(`✅ REST schema discovered: ${restResult.schema.name}`);
        console.log(`   Operations: ${restResult.schema.operations.length}`);
        console.log(`   Types: ${Object.keys(restResult.schema.types).length}`);
        console.log(`   Base URL: ${restResult.schema.baseUrl}`);
      } else {
        console.log(`❌ REST introspection failed: ${restResult.error}`);
      }
    } catch (error) {
      console.log(`❌ REST example failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log();

    // Example 3: Auto-detect API type
    console.log('🔍 Example 3: Auto-detection');
    console.log('============================');
    
    try {
      const autoResult = await explorer.autoIntrospect(
        'https://jsonplaceholder.typicode.com'
      );

      if (autoResult.success && autoResult.schema) {
        console.log(`✅ Auto-detected ${autoResult.schema.protocol} API: ${autoResult.schema.name}`);
      } else {
        console.log(`❌ Auto-detection failed: ${autoResult.error}`);
      }
    } catch (error) {
      console.log(`❌ Auto-detection example failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log();

    // Example 4: List stored schemas
    console.log('📋 Example 4: List Stored Schemas');
    console.log('=================================');
    
    try {
      const schemas = await explorer.listSchemas({
        limit: 10
      });

      console.log(`Found ${schemas.totalCount} stored schemas:`);
      for (const schema of schemas.schemas) {
        console.log(`  • ${schema.name} (${schema.protocol}) - ${schema.operations.length} operations`);
      }
    } catch (error) {
      console.log(`❌ List schemas failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log();

    // Example 5: Search schemas
    console.log('🔎 Example 5: Search Schemas');
    console.log('============================');
    
    try {
      const searchResults = await explorer.listSchemas({
        search: 'pet',
        protocol: APIProtocol.REST
      });

      console.log(`Found ${searchResults.totalCount} schemas matching "pet":`);
      for (const schema of searchResults.schemas) {
        console.log(`  • ${schema.name} - ${schema.description || 'No description'}`);
      }
    } catch (error) {
      console.log(`❌ Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log();

    // Example 6: Get storage statistics
    console.log('📊 Example 6: Storage Statistics');
    console.log('================================');
    
    try {
      const stats = await explorer.getStorageStats();
      console.log(`Total schemas: ${stats.totalSchemas}`);
      console.log('Schemas by protocol:');
      for (const [protocol, count] of Object.entries(stats.schemasByProtocol)) {
        console.log(`  ${protocol}: ${count}`);
      }
      if (stats.storageSize) {
        console.log(`Storage size: ${(stats.storageSize / 1024).toFixed(2)} KB`);
      }
    } catch (error) {
      console.log(`❌ Stats failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

  } finally {
    // Clean up
    await explorer.close();
    console.log('\n🏁 Examples completed!');
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  basicExamples().catch(console.error);
}

export { basicExamples };
