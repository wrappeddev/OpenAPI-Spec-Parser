/**
 * GraphQL introspection query for schema discovery
 * 
 * This module contains the standard GraphQL introspection query used to
 * discover the complete schema of a GraphQL API endpoint.
 * 
 * The query follows the GraphQL introspection specification and retrieves:
 * - All types (objects, scalars, enums, interfaces, unions)
 * - All fields with their arguments and return types
 * - All directives and their locations
 * - Schema root types (query, mutation, subscription)
 */

/**
 * Complete GraphQL introspection query
 * This query retrieves the full schema information needed for analysis
 */
export const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      subscriptionType { name }
      types {
        ...FullType
      }
      directives {
        name
        description
        locations
        args {
          ...InputValue
        }
      }
    }
  }

  fragment FullType on __Type {
    kind
    name
    description
    fields(includeDeprecated: true) {
      name
      description
      args {
        ...InputValue
      }
      type {
        ...TypeRef
      }
      isDeprecated
      deprecationReason
    }
    inputFields {
      ...InputValue
    }
    interfaces {
      ...TypeRef
    }
    enumValues(includeDeprecated: true) {
      name
      description
      isDeprecated
      deprecationReason
    }
    possibleTypes {
      ...TypeRef
    }
  }

  fragment InputValue on __InputValue {
    name
    description
    type { ...TypeRef }
    defaultValue
  }

  fragment TypeRef on __Type {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                }
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Simplified introspection query for basic schema information
 * Use this when the full query is too complex or times out
 */
export const SIMPLE_INTROSPECTION_QUERY = `
  query SimpleIntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      subscriptionType { name }
      types {
        kind
        name
        description
        fields {
          name
          description
          type {
            kind
            name
            ofType {
              kind
              name
            }
          }
        }
      }
    }
  }
`;

/**
 * Query to test GraphQL endpoint availability
 */
export const HEALTH_CHECK_QUERY = `
  query HealthCheck {
    __schema {
      queryType {
        name
      }
    }
  }
`;
