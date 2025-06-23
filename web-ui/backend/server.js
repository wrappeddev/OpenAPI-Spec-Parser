/**
 * Simple Express.js backend server for the Universal API Schema Explorer
 * 
 * This server provides a REST API that bridges the React frontend with the
 * CLI backend. It handles CORS, API routing, and data transformation.
 */

const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const https = require('https');
const yaml = require('yaml');
const http = require('http');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 3001;

// In-memory storage for schemas (in production, this would be a database)
let schemasStore = [
  {
    id: 'box_platform_api',
    name: 'Box Platform API',
    protocol: 'rest',
    version: '2024.0',
    operations: 110,
    types: 45,
    discoveredAt: '2024-06-22T09:15:00Z',
    description: '[Box Platform](https://box.dev) provides functionality to provide access to content stored within [Box](https://box.com). It provides endpoints for basic manipulation of files and folders, management of users within an enterprise, as well as more complex topics such as legal holds and retention policies.',
    baseUrl: 'https://api.box.com/2.0',
    source: 'https://api.box.com/2.0'
  },
  {
    id: 'rest_petstore_demo',
    name: 'Swagger Petstore',
    protocol: 'rest',
    version: '1.0.6',
    operations: 4,
    types: 3,
    discoveredAt: '2024-12-22T10:30:00Z',
    description: 'This is a sample Pet Store Server based on the OpenAPI 3.0 specification.',
    baseUrl: 'https://petstore.swagger.io/v2',
    source: 'https://petstore.swagger.io/v2/swagger.json',
    // Add a sample OpenAPI spec for demonstration
    fullSpec: {
      swagger: '2.0',
      info: {
        title: 'Swagger Petstore',
        description: 'This is a sample Pet Store Server based on the OpenAPI 3.0 specification.',
        version: '1.0.6',
        contact: {
          email: 'apiteam@swagger.io'
        },
        license: {
          name: 'Apache 2.0',
          url: 'http://www.apache.org/licenses/LICENSE-2.0.html'
        }
      },
      host: 'petstore.swagger.io',
      basePath: '/v2',
      schemes: ['https', 'http'],
      paths: {
        '/pet': {
          post: {
            tags: ['pet'],
            summary: 'Add a new pet to the store',
            description: 'Add a new pet to the store',
            operationId: 'addPet',
            parameters: [{
              in: 'body',
              name: 'body',
              description: 'Pet object that needs to be added to the store',
              required: true,
              schema: { $ref: '#/definitions/Pet' }
            }],
            responses: {
              '200': {
                description: 'Successful operation',
                schema: { $ref: '#/definitions/Pet' }
              },
              '405': {
                description: 'Invalid input'
              }
            }
          },
          put: {
            tags: ['pet'],
            summary: 'Update an existing pet',
            description: 'Update an existing pet by Id',
            operationId: 'updatePet',
            parameters: [{
              in: 'body',
              name: 'body',
              description: 'Pet object that needs to be updated',
              required: true,
              schema: { $ref: '#/definitions/Pet' }
            }],
            responses: {
              '200': {
                description: 'Successful operation',
                schema: { $ref: '#/definitions/Pet' }
              },
              '400': {
                description: 'Invalid ID supplied'
              },
              '404': {
                description: 'Pet not found'
              }
            }
          }
        },
        '/pet/{petId}': {
          get: {
            tags: ['pet'],
            summary: 'Find pet by ID',
            description: 'Returns a single pet',
            operationId: 'getPetById',
            parameters: [{
              name: 'petId',
              in: 'path',
              description: 'ID of pet to return',
              required: true,
              type: 'integer',
              format: 'int64'
            }],
            responses: {
              '200': {
                description: 'successful operation',
                schema: { $ref: '#/definitions/Pet' }
              },
              '400': {
                description: 'Invalid ID supplied'
              },
              '404': {
                description: 'Pet not found'
              }
            }
          },
          delete: {
            tags: ['pet'],
            summary: 'Deletes a pet',
            description: 'delete a pet',
            operationId: 'deletePet',
            parameters: [{
              name: 'petId',
              in: 'path',
              description: 'Pet id to delete',
              required: true,
              type: 'integer',
              format: 'int64'
            }],
            responses: {
              '400': {
                description: 'Invalid pet value'
              }
            }
          }
        }
      },
      definitions: {
        Pet: {
          type: 'object',
          required: ['name', 'photoUrls'],
          properties: {
            id: {
              type: 'integer',
              format: 'int64',
              example: 10
            },
            name: {
              type: 'string',
              example: 'doggie'
            },
            category: {
              $ref: '#/definitions/Category'
            },
            photoUrls: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            tags: {
              type: 'array',
              items: {
                $ref: '#/definitions/Tag'
              }
            },
            status: {
              type: 'string',
              description: 'pet status in the store',
              enum: ['available', 'pending', 'sold']
            }
          }
        },
        Category: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              format: 'int64',
              example: 1
            },
            name: {
              type: 'string',
              example: 'Dogs'
            }
          }
        },
        Tag: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              format: 'int64'
            },
            name: {
              type: 'string'
            }
          }
        }
      }
    }
  },
  {
    id: 'websocket_echo_demo',
    name: 'WebSocket Echo Service',
    protocol: 'websocket',
    version: '1.0.0',
    operations: 2,
    types: 1,
    discoveredAt: '2024-12-22T10:37:00Z',
    description: 'Simple WebSocket echo service for testing real-time communication.',
    source: 'wss://echo.websocket.org'
  }
];

// Middleware
app.use(cors());
app.use(express.json());

// Path to the CLI executable (adjust based on your setup)
const CLI_PATH = path.join(__dirname, '../../dist/cli.js');

/**
 * Generate mock operations based on schema info
 */
function generateMockOperations(schema) {
  const operations = [];
  const operationCount = schema.operations || 5;

  if (schema.protocol === 'rest') {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    let paths = [];

    if (schema.name.includes('JSONPlaceholder')) {
      paths = ['/posts', '/comments', '/albums', '/photos', '/todos', '/users'];
    } else if (schema.name.includes('Petstore')) {
      paths = ['/pet', '/store/order', '/user', '/pet/findByStatus', '/pet/findByTags', '/store/inventory', '/user/login', '/user/logout', '/user/createWithArray', '/user/createWithList'];
    } else if (schema.name.includes('Box Platform')) {
      paths = [
        '/files/{file_id}', '/files/{file_id}/content', '/files/{file_id}/thumbnail.{extension}', '/files/{file_id}/collaborations',
        '/folders/{folder_id}', '/folders/{folder_id}/items', '/folders/{folder_id}/collaborations', '/folders/{folder_id}/metadata',
        '/users/{user_id}', '/users/me', '/users', '/users/{user_id}/avatar',
        '/collaborations', '/collaborations/{collaboration_id}',
        '/comments', '/comments/{comment_id}',
        '/tasks', '/tasks/{task_id}', '/tasks/{task_id}/assignments',
        '/metadata_templates', '/metadata_templates/{scope}/{templateKey}',
        '/webhooks', '/webhooks/{webhook_id}',
        '/events', '/events/{stream_type}',
        '/search', '/search/users', '/search/groups',
        '/groups', '/groups/{group_id}', '/groups/{group_id}/memberships',
        '/collections', '/collections/{collection_id}/items',
        '/shared_items', '/shared_items#folders', '/shared_items#files',
        '/retention_policies', '/retention_policies/{retention_policy_id}',
        '/legal_hold_policies', '/legal_hold_policies/{legal_hold_policy_id}',
        '/device_pinners', '/device_pinners/{device_pinner_id}',
        '/terms_of_services', '/terms_of_services/{terms_of_service_id}',
        '/metadata_cascade_policies', '/metadata_cascade_policies/{metadata_cascade_policy_id}',
        '/storage_policies', '/storage_policies/{storage_policy_id}',
        '/zip_downloads', '/zip_downloads/{zip_download_id}/content',
        '/sign_requests', '/sign_requests/{sign_request_id}',
        '/workflows', '/workflows/{workflow_id}/start'
      ];
    } else {
      paths = ['/items', '/users', '/data', '/api/v1/items', '/api/v1/users', '/api/v1/data'];
    }

    // Generate the actual number of operations specified in the schema
    for (let i = 0; i < operationCount; i++) {
      const method = methods[i % methods.length];
      const path = paths[i % paths.length];
      const isPost = method === 'POST' || method === 'PUT';

      let operationDescription = `${method} operation for ${path}`;
      let parameters = [];
      let responses = [];
      let tags = [path.split('/')[1] || 'default'];

      if (schema.name.includes('Box Platform')) {
        // Box Platform API specific operations with more detailed descriptions
        if (path.includes('files')) {
          if (path.includes('content')) {
            operationDescription = method === 'GET' ? 'Download file content' : 'Upload new file version';
            parameters = method === 'GET' ? [
              { name: 'file_id', location: 'path', required: true, description: 'The unique identifier for the file', schema: { name: 'file_id', type: 'string' } },
              { name: 'version', location: 'query', required: false, description: 'The file version to download', schema: { name: 'version', type: 'string' } }
            ] : [
              { name: 'file_id', location: 'path', required: true, description: 'The unique identifier for the file', schema: { name: 'file_id', type: 'string' } },
              { name: 'file', location: 'body', required: true, description: 'The file content', schema: { name: 'file', type: 'string', format: 'binary' } }
            ];
            responses = [
              { statusCode: '200', description: method === 'GET' ? 'Returns the file content' : 'Returns the updated file object' },
              { statusCode: '404', description: 'File not found' }
            ];
          } else if (path.includes('thumbnail')) {
            operationDescription = 'Get file thumbnail';
            parameters = [
              { name: 'file_id', location: 'path', required: true, description: 'The unique identifier for the file', schema: { name: 'file_id', type: 'string' } },
              { name: 'extension', location: 'path', required: true, description: 'The file format for the thumbnail', schema: { name: 'extension', type: 'string', enum: ['png', 'jpg'] } }
            ];
            responses = [
              { statusCode: '200', description: 'Returns the thumbnail image' },
              { statusCode: '404', description: 'File not found or thumbnail not available' }
            ];
          } else {
            operationDescription = method === 'GET' ? 'Get file information' :
                                  method === 'PUT' ? 'Update file information' :
                                  method === 'DELETE' ? 'Delete file' :
                                  method === 'POST' ? 'Upload file' : operationDescription;
            parameters = method === 'GET' ? [
              { name: 'file_id', location: 'path', required: true, description: 'The unique identifier for the file', schema: { name: 'file_id', type: 'string' } }
            ] : isPost ? [
              { name: 'attributes', location: 'body', required: true, description: 'File attributes', schema: { name: 'FileRequest', type: 'object' } }
            ] : [];
            responses = [
              { statusCode: '200', description: 'Returns the file object', schema: { name: 'File', type: 'object' } },
              { statusCode: '404', description: 'File not found' }
            ];
          }
          tags = ['Files'];
        } else if (path.includes('folders')) {
          if (path.includes('items')) {
            operationDescription = 'List items in folder';
            parameters = [
              { name: 'folder_id', location: 'path', required: true, description: 'The unique identifier for the folder', schema: { name: 'folder_id', type: 'string' } },
              { name: 'limit', location: 'query', required: false, description: 'The maximum number of items to return', schema: { name: 'limit', type: 'integer' } },
              { name: 'offset', location: 'query', required: false, description: 'The offset of the item at which to begin the response', schema: { name: 'offset', type: 'integer' } }
            ];
            responses = [
              { statusCode: '200', description: 'Returns a collection of files and folders', schema: { name: 'Items', type: 'object' } }
            ];
          } else {
            operationDescription = method === 'GET' ? 'Get folder information' :
                                  method === 'PUT' ? 'Update folder' :
                                  method === 'DELETE' ? 'Delete folder' :
                                  method === 'POST' ? 'Create folder' : operationDescription;
            parameters = method === 'GET' ? [
              { name: 'folder_id', location: 'path', required: true, description: 'The unique identifier for the folder', schema: { name: 'folder_id', type: 'string' } }
            ] : [];
            responses = [
              { statusCode: '200', description: 'Returns the folder object', schema: { name: 'Folder', type: 'object' } },
              { statusCode: '404', description: 'Folder not found' }
            ];
          }
          tags = ['Folders'];
        } else if (path.includes('users')) {
          if (path === '/users/me') {
            operationDescription = 'Get current user';
            parameters = [];
            responses = [
              { statusCode: '200', description: 'Returns the current user object', schema: { name: 'User', type: 'object' } }
            ];
          } else {
            operationDescription = method === 'GET' ? 'Get user information' :
                                  method === 'PUT' ? 'Update user' :
                                  method === 'DELETE' ? 'Delete user' :
                                  method === 'POST' ? 'Create user' : operationDescription;
            parameters = method === 'GET' && path.includes('{user_id}') ? [
              { name: 'user_id', location: 'path', required: true, description: 'The unique identifier for the user', schema: { name: 'user_id', type: 'string' } }
            ] : [];
            responses = [
              { statusCode: '200', description: 'Returns the user object', schema: { name: 'User', type: 'object' } },
              { statusCode: '404', description: 'User not found' }
            ];
          }
          tags = ['Users'];
        } else if (path.includes('collaborations')) {
          operationDescription = method === 'GET' ? 'Get collaboration' :
                                method === 'PUT' ? 'Update collaboration' :
                                method === 'DELETE' ? 'Remove collaboration' :
                                method === 'POST' ? 'Create collaboration' : operationDescription;
          parameters = method === 'GET' && path.includes('{collaboration_id}') ? [
            { name: 'collaboration_id', location: 'path', required: true, description: 'The unique identifier for the collaboration', schema: { name: 'collaboration_id', type: 'string' } }
          ] : [];
          responses = [
            { statusCode: '200', description: 'Returns the collaboration object', schema: { name: 'Collaboration', type: 'object' } }
          ];
          tags = ['Collaborations'];
        } else if (path.includes('search')) {
          operationDescription = 'Search for content';
          parameters = [
            { name: 'query', location: 'query', required: true, description: 'The search query', schema: { name: 'query', type: 'string' } },
            { name: 'limit', location: 'query', required: false, description: 'The maximum number of items to return', schema: { name: 'limit', type: 'integer' } }
          ];
          responses = [
            { statusCode: '200', description: 'Returns search results', schema: { name: 'SearchResults', type: 'object' } }
          ];
          tags = ['Search'];
        } else {
          // Default Box API operation
          parameters = isPost ? [
            { name: 'body', location: 'body', required: true, description: 'Request body', schema: { name: 'RequestBody', type: 'object' } }
          ] : [
            { name: 'id', location: 'path', required: true, description: 'Resource ID', schema: { name: 'id', type: 'string' } }
          ];
          responses = [
            { statusCode: '200', description: 'Successful operation' },
            { statusCode: '404', description: 'Not found' }
          ];
          tags = [path.split('/')[1] || 'General'];
        }
      } else {
        // Default operation structure for other APIs
        parameters = isPost ? [
          {
            name: 'body',
            location: 'body',
            required: true,
            description: 'Request body',
            schema: {
              name: 'RequestBody',
              type: 'object',
              properties: {
                id: { name: 'id', type: 'integer' },
                name: { name: 'name', type: 'string', required: true }
              }
            }
          }
        ] : [
          {
            name: 'id',
            location: 'path',
            required: true,
            description: 'Resource ID',
            schema: { name: 'id', type: 'integer' }
          }
        ];
        responses = [
          {
            statusCode: '200',
            description: 'Successful operation',
            schema: {
              name: 'Response',
              type: 'object',
              properties: {
                id: { name: 'id', type: 'integer' },
                name: { name: 'name', type: 'string' }
              }
            }
          },
          {
            statusCode: '404',
            description: 'Not found'
          }
        ];
      }

      operations.push({
        id: `${method.toLowerCase()}_${path.replace(/[{}\/]/g, '_')}_${i}`,
        name: `${method} ${path}`,
        method,
        path,
        type: 'endpoint',
        description: operationDescription,
        parameters,
        responses,
        tags
      });
    }
  } else if (schema.protocol === 'graphql') {
    operations.push({
      id: 'query_root',
      name: 'Query',
      type: 'query',
      description: 'Root query type',
      parameters: [],
      responses: [],
      tags: ['query']
    });
  } else if (schema.protocol === 'websocket') {
    operations.push({
      id: 'message_handler',
      name: 'Message Handler',
      type: 'message',
      description: 'WebSocket message handler',
      parameters: [],
      responses: [],
      tags: ['websocket']
    });
  }

  return operations;
}

/**
 * Generate mock types based on schema info
 */
function generateMockTypes(schema) {
  const types = {};
  const typeCount = schema.types || 3;

  if (schema.name.includes('JSONPlaceholder')) {
    types.Post = {
      name: 'Post',
      type: 'object',
      description: 'A blog post',
      properties: {
        id: { name: 'id', type: 'integer', example: 1 },
        title: { name: 'title', type: 'string', required: true, example: 'Sample Post' },
        body: { name: 'body', type: 'string', required: true },
        userId: { name: 'userId', type: 'integer', required: true }
      }
    };
    types.User = {
      name: 'User',
      type: 'object',
      description: 'A user account',
      properties: {
        id: { name: 'id', type: 'integer', example: 1 },
        name: { name: 'name', type: 'string', required: true, example: 'John Doe' },
        email: { name: 'email', type: 'string', format: 'email', required: true }
      }
    };
  } else if (schema.name.includes('Petstore')) {
    types.Pet = {
      name: 'Pet',
      type: 'object',
      description: 'A pet from the pet store',
      properties: {
        id: { name: 'id', type: 'integer', format: 'int64', example: 10 },
        name: { name: 'name', type: 'string', required: true, example: 'doggie' },
        status: {
          name: 'status',
          type: 'string',
          description: 'pet status in the store',
          enum: ['available', 'pending', 'sold']
        }
      }
    };
  } else if (schema.name.includes('Box Platform')) {
    // Define core Box Platform types
    const coreTypes = {
      File: {
        name: 'File',
        type: 'object',
        description: 'A file object represents an individual file in Box',
        properties: {
          id: { name: 'id', type: 'string', example: '12345', description: 'The unique identifier for this file' },
          type: { name: 'type', type: 'string', example: 'file', description: 'The type of this object' },
          name: { name: 'name', type: 'string', required: true, example: 'Contract.pdf', description: 'The name of the file' },
          size: { name: 'size', type: 'integer', example: 629644, description: 'The file size in bytes' },
          created_at: { name: 'created_at', type: 'string', format: 'date-time', description: 'When the file was created' },
          modified_at: { name: 'modified_at', type: 'string', format: 'date-time', description: 'When the file was last modified' }
        }
      },
      Folder: {
        name: 'Folder',
        type: 'object',
        description: 'A folder object represents a folder from a user\'s account',
        properties: {
          id: { name: 'id', type: 'string', example: '12345', description: 'The unique identifier for this folder' },
          type: { name: 'type', type: 'string', example: 'folder', description: 'The type of this object' },
          name: { name: 'name', type: 'string', required: true, example: 'Contracts', description: 'The name of the folder' },
          item_count: { name: 'item_count', type: 'integer', example: 5, description: 'The number of items in this folder' }
        }
      },
      User: {
        name: 'User',
        type: 'object',
        description: 'A user represents an individual\'s account on Box',
        properties: {
          id: { name: 'id', type: 'string', example: '12345', description: 'The unique identifier for this user' },
          type: { name: 'type', type: 'string', example: 'user', description: 'The type of this object' },
          name: { name: 'name', type: 'string', required: true, example: 'John Doe', description: 'The display name of this user' },
          login: { name: 'login', type: 'string', format: 'email', example: 'john@example.com', description: 'The primary email address of this user' }
        }
      },
      Collaboration: {
        name: 'Collaboration',
        type: 'object',
        description: 'A collaboration object represents a user\'s permission level on a folder or file',
        properties: {
          id: { name: 'id', type: 'string', example: '12345', description: 'The unique identifier for this collaboration' },
          type: { name: 'type', type: 'string', example: 'collaboration', description: 'The type of this object' },
          role: { name: 'role', type: 'string', enum: ['editor', 'viewer', 'previewer', 'uploader', 'previewer_uploader', 'viewer_uploader', 'co-owner', 'owner'], description: 'The level of access granted' }
        }
      },
      Comment: {
        name: 'Comment',
        type: 'object',
        description: 'A comment object represents a user-created comment on a file',
        properties: {
          id: { name: 'id', type: 'string', example: '12345', description: 'The unique identifier for this comment' },
          type: { name: 'type', type: 'string', example: 'comment', description: 'The type of this object' },
          message: { name: 'message', type: 'string', required: true, example: 'This looks great!', description: 'The comment text' }
        }
      }
    };

    // Add core types
    Object.assign(types, coreTypes);

    // Generate additional types to reach the specified count
    const additionalTypeNames = [
      'Task', 'TaskAssignment', 'Group', 'GroupMembership', 'Collection', 'WebLink',
      'RetentionPolicy', 'RetentionPolicyAssignment', 'LegalHoldPolicy', 'LegalHoldPolicyAssignment',
      'MetadataTemplate', 'MetadataInstance', 'Webhook', 'Event', 'DevicePinner',
      'TermsOfService', 'TermsOfServiceUserStatus', 'StoragePolicy', 'StoragePolicyAssignment',
      'ZipDownload', 'SignRequest', 'SignRequestSigner', 'Workflow', 'WorkflowTrigger',
      'FileVersion', 'FileRequest', 'TrashItem', 'SharedLink', 'Watermark',
      'Classification', 'Shield', 'AccessToken', 'Enterprise', 'InviteUser',
      'RecentItem', 'SearchResult', 'UploadSession', 'ChunkedUpload', 'FileConflict',
      'Permission', 'PathCollection', 'ItemCollection', 'UserCollection', 'GroupCollection'
    ];

    const remainingCount = Math.max(0, typeCount - Object.keys(coreTypes).length);
    for (let i = 0; i < remainingCount && i < additionalTypeNames.length; i++) {
      const typeName = additionalTypeNames[i];
      types[typeName] = {
        name: typeName,
        type: 'object',
        description: `Box Platform ${typeName} object`,
        properties: {
          id: { name: 'id', type: 'string', description: `The unique identifier for this ${typeName.toLowerCase()}` },
          type: { name: 'type', type: 'string', example: typeName.toLowerCase(), description: 'The type of this object' },
          ...(i % 2 === 0 && { name: { name: 'name', type: 'string', description: `The name of the ${typeName.toLowerCase()}` } }),
          ...(i % 3 === 0 && { created_at: { name: 'created_at', type: 'string', format: 'date-time', description: 'When this object was created' } }),
          ...(i % 4 === 0 && { modified_at: { name: 'modified_at', type: 'string', format: 'date-time', description: 'When this object was last modified' } }),
          ...(i % 5 === 0 && { status: { name: 'status', type: 'string', enum: ['active', 'inactive', 'pending'], description: 'The status of this object' } })
        }
      };
    }

    // If we still need more types, generate generic ones
    const currentCount = Object.keys(types).length;
    if (currentCount < typeCount) {
      for (let i = currentCount; i < typeCount; i++) {
        const typeName = `BoxType${i + 1}`;
        types[typeName] = {
          name: typeName,
          type: 'object',
          description: `Box Platform generic type ${i + 1}`,
          properties: {
            id: { name: 'id', type: 'string' },
            type: { name: 'type', type: 'string' },
            name: { name: 'name', type: 'string' }
          }
        };
      }
    }
  } else {
    // Generic types - generate the actual number specified
    for (let i = 0; i < typeCount; i++) {
      const typeName = `Type${i + 1}`;
      types[typeName] = {
        name: typeName,
        type: 'object',
        description: `Generic type ${i + 1}`,
        properties: {
          id: { name: 'id', type: 'integer' },
          name: { name: 'name', type: 'string' },
          ...(i % 3 === 0 && { description: { name: 'description', type: 'string' } }),
          ...(i % 4 === 0 && { created_at: { name: 'created_at', type: 'string', format: 'date-time' } }),
          ...(i % 5 === 0 && { status: { name: 'status', type: 'string', enum: ['active', 'inactive', 'pending'] } })
        }
      };
    }
  }

  return types;
}

/**
 * Execute CLI command and return result
 */
function executeCLI(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [CLI_PATH, ...args], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || `CLI exited with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Parse CLI output as JSON
 */
function parseCliOutput(output) {
  try {
    // Try to find JSON in the output
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.trim().startsWith('{') || line.trim().startsWith('[')) {
        return JSON.parse(line.trim());
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to parse CLI output:', error);
    return null;
  }
}

/**
 * Make HTTP request to fetch content
 */
function makeHttpRequest(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Universal-API-Schema-Explorer/1.0',
        'Accept': 'application/json, application/yaml, text/yaml, text/plain, */*',
        ...headers
      },
      timeout: 10000
    };

    const req = client.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          contentType: res.headers['content-type'] || ''
        });
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Network error: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Perform real introspection on an API endpoint
 */
async function performRealIntrospection(protocol, url, headers = {}) {
  console.log(`Performing real introspection for ${protocol} at ${url}`);

  try {
    // Validate URL format
    new URL(url);
  } catch (error) {
    throw new Error(`Invalid URL format: ${url}`);
  }

  if (protocol === 'rest') {
    return await introspectRestAPI(url, headers);
  } else if (protocol === 'graphql') {
    return await introspectGraphQLAPI(url, headers);
  } else if (protocol === 'websocket') {
    return await introspectWebSocketAPI(url, headers);
  } else {
    throw new Error(`Unsupported protocol: ${protocol}`);
  }
}

/**
 * Introspect REST API by looking for OpenAPI/Swagger specs
 */
async function introspectRestAPI(url, headers) {
  const commonPaths = [
    '', // Try the URL as-is first
    '/swagger.json',
    '/openapi.json',
    '/api-docs',
    '/api/swagger.json',
    '/api/openapi.json',
    '/v1/swagger.json',
    '/v2/swagger.json',
    '/docs/swagger.json'
  ];

  const baseUrl = url.replace(/\/+$/, ''); // Remove trailing slashes
  const triedPaths = [];
  let lastError = null;

  for (const path of commonPaths) {
    const testUrl = path === '' ? url : `${baseUrl}${path}`;
    triedPaths.push(testUrl);

    try {
      console.log(`Trying: ${testUrl}`);
      const response = await makeHttpRequest(testUrl, headers);

      if (response.statusCode === 200) {
        // Try to parse as JSON first, then YAML
        let spec = null;
        let parseFormat = 'unknown';

        try {
          spec = JSON.parse(response.data);
          parseFormat = 'json';
          console.log(`Successfully parsed JSON at: ${testUrl}`);
        } catch (jsonError) {
          // Not valid JSON, try YAML
          try {
            spec = yaml.parse(response.data);
            parseFormat = 'yaml';
            console.log(`Successfully parsed YAML at: ${testUrl}`);
          } catch (yamlError) {
            console.log(`Failed to parse as JSON: ${jsonError.message}`);
            console.log(`Failed to parse as YAML: ${yamlError.message}`);
            continue; // Try next URL
          }
        }

        // Check if it looks like an OpenAPI/Swagger spec
        if (spec && (spec.swagger || spec.openapi || (spec.info && spec.paths))) {
          console.log(`Found OpenAPI spec at: ${testUrl} (format: ${parseFormat})`);
          return {
            success: true,
            schema: parseOpenAPISpec(spec, testUrl),
            warnings: [],
            metadata: {
              specUrl: testUrl,
              specVersion: spec.swagger || spec.openapi || 'unknown',
              specFormat: parseFormat
            }
          };
        } else {
          console.log(`Parsed content at ${testUrl} but doesn't look like OpenAPI spec`);
        }
      }
    } catch (error) {
      lastError = error;
      console.log(`Failed to fetch ${testUrl}: ${error.message}`);
    }
  }

  // If we get here, no OpenAPI spec was found
  return {
    success: false,
    error: `No OpenAPI/Swagger specification found. Tried ${triedPaths.length} common paths.`,
    warnings: [
      'This endpoint does not appear to expose an OpenAPI/Swagger specification',
      'REST API introspection requires access to API documentation in OpenAPI format'
    ],
    metadata: {
      endpoint: url,
      triedPaths: triedPaths,
      lastError: lastError?.message,
      suggestion: 'Ensure the API provides an OpenAPI specification at a standard path like /swagger.json or /openapi.json'
    }
  };
}

/**
 * Parse OpenAPI specification and extract schema information
 */
function parseOpenAPISpec(spec, specUrl) {
  const info = spec.info || {};
  const paths = spec.paths || {};
  const components = spec.components || spec.definitions || {};

  // Count operations
  let operationCount = 0;
  Object.values(paths).forEach(pathItem => {
    Object.keys(pathItem).forEach(method => {
      if (['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(method.toLowerCase())) {
        operationCount++;
      }
    });
  });

  // Count types/schemas
  const typeCount = Object.keys(components.schemas || components || {}).length;

  return {
    name: info.title || 'Unknown API',
    version: info.version || '1.0.0',
    description: info.description || 'API discovered via OpenAPI specification',
    operations: operationCount,
    types: typeCount,
    baseUrl: spec.servers?.[0]?.url || (spec.host ? `${spec.schemes?.[0] || 'https'}://${spec.host}${spec.basePath || ''}` : specUrl.replace(/\/[^\/]*$/, '')),
    source: specUrl,
    // Store the full OpenAPI spec for detailed parsing later
    fullSpec: spec
  };
}

/**
 * Parse operations from OpenAPI specification
 */
function parseOperationsFromSpec(spec) {
  const operations = [];
  const paths = spec.paths || {};

  Object.entries(paths).forEach(([path, pathItem]) => {
    Object.entries(pathItem).forEach(([method, operation]) => {
      if (['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(method.toLowerCase())) {
        const operationId = operation.operationId || `${method}_${path.replace(/[{}\/]/g, '_')}`;

        // Parse parameters
        const parameters = [];
        if (operation.parameters) {
          operation.parameters.forEach(param => {
            parameters.push({
              name: param.name,
              location: param.in,
              required: param.required || false,
              description: param.description || '',
              schema: param.schema || { type: 'string' }
            });
          });
        }

        // Parse request body (OpenAPI 3.0 style)
        if (operation.requestBody) {
          const content = operation.requestBody.content;
          if (content) {
            const contentType = Object.keys(content)[0];
            parameters.push({
              name: 'body',
              location: 'body',
              required: operation.requestBody.required || false,
              description: operation.requestBody.description || 'Request body',
              schema: content[contentType]?.schema || { type: 'object' },
              contentType
            });
          }
        }

        // Handle Swagger 2.0 body parameters
        if (operation.parameters) {
          operation.parameters.forEach(param => {
            if (param.in === 'body') {
              parameters.push({
                name: param.name || 'body',
                location: 'body',
                required: param.required || false,
                description: param.description || 'Request body',
                schema: param.schema || { type: 'object' }
              });
            }
          });
        }

        // Parse responses
        const responses = [];
        if (operation.responses) {
          Object.entries(operation.responses).forEach(([statusCode, response]) => {
            responses.push({
              statusCode,
              description: response.description || '',
              schema: response.content ?
                Object.values(response.content)[0]?.schema : undefined
            });
          });
        }

        operations.push({
          id: operationId,
          name: operation.summary || `${method.toUpperCase()} ${path}`,
          method: method.toUpperCase(),
          path,
          type: 'endpoint',
          description: operation.description || operation.summary || '',
          parameters,
          responses,
          tags: operation.tags || ['default'],
          deprecated: operation.deprecated || false
        });
      }
    });
  });

  return operations;
}

/**
 * Parse types/schemas from OpenAPI specification
 */
function parseTypesFromSpec(spec) {
  const types = {};
  // Handle both OpenAPI 3.0 (components.schemas) and Swagger 2.0 (definitions)
  const schemas = spec.components?.schemas || spec.definitions || {};

  Object.entries(schemas).forEach(([typeName, schema]) => {
    types[typeName] = parseSchemaObject(schema, typeName, schemas);
  });

  return types;
}

/**
 * Parse a schema object recursively
 */
function parseSchemaObject(schema, name = 'Unknown', allSchemas = {}) {
  // Handle $ref references
  if (schema.$ref) {
    const refName = schema.$ref.replace('#/definitions/', '').replace('#/components/schemas/', '');
    return {
      name: refName,
      type: 'reference',
      description: `Reference to ${refName}`,
      $ref: schema.$ref
    };
  }

  const result = {
    name,
    type: schema.type || 'object',
    description: schema.description || '',
    properties: {}
  };

  // Handle different schema types
  if (schema.type === 'object' && schema.properties) {
    Object.entries(schema.properties).forEach(([propName, propSchema]) => {
      result.properties[propName] = {
        name: propName,
        type: propSchema.type || (propSchema.$ref ? 'reference' : 'string'),
        description: propSchema.description || '',
        required: schema.required?.includes(propName) || false,
        example: propSchema.example,
        enum: propSchema.enum,
        format: propSchema.format,
        $ref: propSchema.$ref,
        items: propSchema.items ? parseSchemaObject(propSchema.items, `${propName}Item`, allSchemas) : undefined
      };
    });
  } else if (schema.type === 'array') {
    result.items = schema.items ? parseSchemaObject(schema.items, `${name}Item`, allSchemas) : undefined;
  } else if (schema.enum) {
    result.enum = schema.enum;
  }

  // Add additional properties
  if (schema.example !== undefined) result.example = schema.example;
  if (schema.format) result.format = schema.format;
  if (schema.minimum !== undefined) result.minimum = schema.minimum;
  if (schema.maximum !== undefined) result.maximum = schema.maximum;

  return result;
}

/**
 * Introspect GraphQL API by querying introspection endpoint
 */
async function introspectGraphQLAPI(url, headers) {
  const introspectionQuery = `
    query IntrospectionQuery {
      __schema {
        queryType { name }
        mutationType { name }
        subscriptionType { name }
        types {
          ...FullType
        }
      }
    }

    fragment FullType on __Type {
      kind
      name
      description
    }
  `;

  try {
    const response = await makeHttpRequest(url, {
      ...headers,
      'Content-Type': 'application/json'
    });

    // For GraphQL, we need to make a POST request with the introspection query
    // This is a simplified version - in reality we'd need to handle POST requests
    return {
      success: false,
      error: 'GraphQL introspection requires POST request capability (not yet implemented)',
      warnings: ['GraphQL introspection is partially implemented'],
      metadata: {
        endpoint: url,
        note: 'GraphQL introspection requires sending POST requests with introspection queries'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to connect to GraphQL endpoint: ${error.message}`,
      metadata: { endpoint: url }
    };
  }
}

/**
 * Introspect WebSocket API (basic connectivity test)
 */
async function introspectWebSocketAPI(url, headers) {
  // WebSocket introspection is complex and would require actual WebSocket connection
  // For now, just validate the URL format
  if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
    return {
      success: false,
      error: 'WebSocket URLs must start with ws:// or wss://',
      metadata: { endpoint: url }
    };
  }

  return {
    success: false,
    error: 'WebSocket introspection is not yet implemented',
    warnings: ['WebSocket introspection requires establishing WebSocket connections'],
    metadata: {
      endpoint: url,
      note: 'WebSocket introspection would require connecting and analyzing message patterns'
    }
  };
}

// API Routes

/**
 * POST /api/introspect
 * Introspect an API endpoint
 */
app.post('/api/introspect', async (req, res) => {
  try {
    const { protocol, url, headers, save, options } = req.body;

    if (!protocol || !url) {
      return res.status(400).json({
        success: false,
        error: 'Protocol and URL are required'
      });
    }

    // Build CLI arguments
    const args = ['introspect', protocol, url];
    
    if (save) {
      args.push('--save');
    }

    if (headers) {
      args.push('--headers', JSON.stringify(headers));
    }

    args.push('--verbose');

    // Perform actual introspection
    console.log(`Starting introspection for ${protocol} API: ${url}`);

    let introspectionResult;
    try {
      introspectionResult = await performRealIntrospection(protocol, url, headers);
    } catch (error) {
      console.error('Introspection failed:', error);
      return res.json({
        success: false,
        error: error.message,
        metadata: {
          endpoint: url,
          timestamp: new Date().toISOString(),
          method: 'real_introspection'
        }
      });
    }

    if (!introspectionResult.success) {
      return res.json(introspectionResult);
    }

    // Create new schema object from introspection result
    const newSchema = {
      id: `${protocol}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: introspectionResult.schema.name,
      protocol,
      version: introspectionResult.schema.version,
      operations: introspectionResult.schema.operations,
      types: introspectionResult.schema.types,
      discoveredAt: new Date().toISOString(),
      source: url,
      description: introspectionResult.schema.description,
      baseUrl: introspectionResult.schema.baseUrl,
      // Store the full OpenAPI spec for detailed parsing
      fullSpec: introspectionResult.schema.fullSpec
    };

    // Add to schemas store if save is requested
    if (save) {
      // Check if schema with same source already exists
      const existingIndex = schemasStore.findIndex(s => s.source === url);
      if (existingIndex >= 0) {
        // Update existing schema
        schemasStore[existingIndex] = newSchema;
        console.log(`Updated existing schema: ${newSchema.name}`);
      } else {
        // Add new schema
        schemasStore.push(newSchema);
        console.log(`Added new schema: ${newSchema.name} (Total: ${schemasStore.length})`);
      }
    }

    // Return successful introspection result
    const result = {
      success: true,
      schema: newSchema,
      warnings: introspectionResult.warnings || [],
      metadata: {
        ...introspectionResult.metadata,
        endpoint: url,
        timestamp: new Date().toISOString(),
        method: 'real_introspection',
        saved: save
      }
    };

    res.json(result);
  } catch (error) {
    console.error('Introspection error:', error);
    res.json({
      success: false,
      error: error.message || 'Introspection failed'
    });
  }
});

/**
 * GET /api/schemas
 * Get list of stored schemas
 */
app.get('/api/schemas', async (req, res) => {
  try {
    const { protocol, search } = req.query;
    
    const args = ['list', '--verbose'];
    
    if (protocol && protocol !== 'all') {
      args.push('--protocol', protocol);
    }

    // Simulate CLI execution without actually calling it
    console.log(`Fetching schemas with filters:`, { protocol, search });
    console.log(`Current schemas in store: ${schemasStore.length}`);

    // Use the dynamic schemas store
    const allSchemas = [...schemasStore]; // Create a copy to avoid mutations

    let filteredSchemas = allSchemas;

    // Apply protocol filter
    if (protocol && protocol !== 'all') {
      filteredSchemas = filteredSchemas.filter(schema => schema.protocol === protocol);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredSchemas = filteredSchemas.filter(schema =>
        schema.name.toLowerCase().includes(searchLower) ||
        (schema.description && schema.description.toLowerCase().includes(searchLower))
      );
    }

    res.json({ schemas: filteredSchemas });
  } catch (error) {
    console.error('Failed to fetch schemas:', error);
    res.json({ schemas: [] });
  }
});

/**
 * GET /api/schemas/:id
 * Get detailed schema by ID
 */
app.get('/api/schemas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Fetching schema details for ID: ${id}`);

    // Find schema in store
    const schema = schemasStore.find(s => s.id === id);

    if (!schema) {
      console.log(`Schema not found: ${id}`);
      return res.status(404).json({ error: 'Schema not found' });
    }

    // Create detailed schema with real operations and types if OpenAPI spec is available
    let operations, types, metadata;

    if (schema.fullSpec) {
      // Parse real operations and types from OpenAPI spec
      console.log(`Parsing real OpenAPI spec for: ${schema.name}`);
      operations = parseOperationsFromSpec(schema.fullSpec);
      types = parseTypesFromSpec(schema.fullSpec);

      // Extract metadata from OpenAPI spec
      const info = schema.fullSpec.info || {};
      metadata = {
        contact: info.contact,
        license: info.license,
        documentation: info.externalDocs?.url || schema.source,
        termsOfService: info.termsOfService,
        specVersion: schema.fullSpec.openapi || schema.fullSpec.swagger
      };
    } else {
      // Fall back to mock data for schemas without full spec
      console.log(`Using mock data for: ${schema.name} (no OpenAPI spec available)`);
      operations = generateMockOperations(schema);
      types = generateMockTypes(schema);
      metadata = {
        contact: schema.name.includes('JSONPlaceholder') ? {
          email: 'support@jsonplaceholder.typicode.com'
        } : schema.name.includes('Petstore') ? {
          email: 'apiteam@swagger.io'
        } : schema.name.includes('Box Platform') ? {
          name: 'Box Developer Support',
          email: 'developer@box.com',
          url: 'https://developer.box.com'
        } : undefined,
        license: schema.name.includes('Petstore') ? {
          name: 'Apache 2.0',
          url: 'http://www.apache.org/licenses/LICENSE-2.0.html'
        } : schema.name.includes('Box Platform') ? {
          name: 'Box API License',
          url: 'https://developer.box.com/guides/api-calls/permissions-and-errors/terms-of-service/'
        } : undefined,
        documentation: schema.name.includes('Petstore') ? 'http://swagger.io' :
                      schema.name.includes('Box Platform') ? 'https://developer.box.com/reference/' : undefined
      };
    }

    const detailedSchema = {
      ...schema,
      // Ensure discoveredAt is a valid ISO string
      discoveredAt: schema.discoveredAt || new Date().toISOString(),
      operations,
      types,
      metadata
    };

    console.log(`Returning schema details for: ${schema.name}`);
    res.json({ schema: detailedSchema });
  } catch (error) {
    console.error('Failed to fetch schema:', error);
    res.status(500).json({ error: 'Failed to fetch schema' });
  }
});

/**
 * DELETE /api/schemas/:id
 * Delete a schema
 */
app.delete('/api/schemas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Find and remove schema from store
    const initialLength = schemasStore.length;
    schemasStore = schemasStore.filter(schema => schema.id !== id);

    if (schemasStore.length < initialLength) {
      console.log(`Deleted schema: ${id} (Remaining: ${schemasStore.length})`);
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: 'Schema not found' });
    }
  } catch (error) {
    console.error('Failed to delete schema:', error);
    res.status(500).json({ error: 'Failed to delete schema' });
  }
});

/**
 * GET /api/status
 * Get system status
 */
app.get('/api/status', async (req, res) => {
  try {
    // Return actual system status with real schema count
    res.json({
      status: 'healthy',
      protocols: {
        rest: true,
        graphql: true,
        websocket: true
      },
      storage: {
        type: 'memory',
        available: true,
        schemaCount: schemasStore.length
      },
      version: '1.0.0'
    });
  } catch (error) {
    console.error('Failed to get status:', error);
    res.json({
      status: 'unhealthy',
      protocols: { rest: false, graphql: false, websocket: false },
      storage: { type: 'unknown', available: false, schemaCount: 0 },
      version: 'unknown'
    });
  }
});

/**
 * POST /api/test-connection
 * Test connection to an API endpoint
 */
app.post('/api/test-connection', async (req, res) => {
  try {
    const { url, protocol } = req.body;
    
    // For now, simulate a connection test
    // In a real implementation, you'd actually test the connection
    const responseTime = Math.floor(Math.random() * 1000) + 100;
    
    res.json({
      success: true,
      responseTime
    });
  } catch (error) {
    console.error('Connection test failed:', error);
    res.json({
      success: false,
      error: error.message || 'Connection test failed'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Universal API Schema Explorer backend running on port ${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
});
