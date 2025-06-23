/**
 * GraphQL-specific types for introspection results
 * 
 * These types represent the structure of GraphQL introspection responses
 * as defined by the GraphQL specification.
 */

/**
 * GraphQL type kinds as returned by introspection
 */
export enum GraphQLTypeKind {
  SCALAR = 'SCALAR',
  OBJECT = 'OBJECT',
  INTERFACE = 'INTERFACE',
  UNION = 'UNION',
  ENUM = 'ENUM',
  INPUT_OBJECT = 'INPUT_OBJECT',
  LIST = 'LIST',
  NON_NULL = 'NON_NULL'
}

/**
 * GraphQL directive locations
 */
export enum GraphQLDirectiveLocation {
  QUERY = 'QUERY',
  MUTATION = 'MUTATION',
  SUBSCRIPTION = 'SUBSCRIPTION',
  FIELD = 'FIELD',
  FRAGMENT_DEFINITION = 'FRAGMENT_DEFINITION',
  FRAGMENT_SPREAD = 'FRAGMENT_SPREAD',
  INLINE_FRAGMENT = 'INLINE_FRAGMENT',
  VARIABLE_DEFINITION = 'VARIABLE_DEFINITION',
  SCHEMA = 'SCHEMA',
  SCALAR = 'SCALAR',
  OBJECT = 'OBJECT',
  FIELD_DEFINITION = 'FIELD_DEFINITION',
  ARGUMENT_DEFINITION = 'ARGUMENT_DEFINITION',
  INTERFACE = 'INTERFACE',
  UNION = 'UNION',
  ENUM = 'ENUM',
  ENUM_VALUE = 'ENUM_VALUE',
  INPUT_OBJECT = 'INPUT_OBJECT',
  INPUT_FIELD_DEFINITION = 'INPUT_FIELD_DEFINITION'
}

/**
 * GraphQL type reference from introspection
 */
export interface GraphQLTypeRef {
  kind: GraphQLTypeKind;
  name?: string;
  ofType?: GraphQLTypeRef;
}

/**
 * GraphQL input value (argument or input field)
 */
export interface GraphQLInputValue {
  name: string;
  description?: string;
  type: GraphQLTypeRef;
  defaultValue?: string;
}

/**
 * GraphQL enum value
 */
export interface GraphQLEnumValue {
  name: string;
  description?: string;
  isDeprecated: boolean;
  deprecationReason?: string;
}

/**
 * GraphQL field definition
 */
export interface GraphQLField {
  name: string;
  description?: string;
  args: GraphQLInputValue[];
  type: GraphQLTypeRef;
  isDeprecated: boolean;
  deprecationReason?: string;
}

/**
 * GraphQL type definition from introspection
 */
export interface GraphQLType {
  kind: GraphQLTypeKind;
  name?: string;
  description?: string;
  fields?: GraphQLField[];
  inputFields?: GraphQLInputValue[];
  interfaces?: GraphQLTypeRef[];
  enumValues?: GraphQLEnumValue[];
  possibleTypes?: GraphQLTypeRef[];
}

/**
 * GraphQL directive definition
 */
export interface GraphQLDirective {
  name: string;
  description?: string;
  locations: GraphQLDirectiveLocation[];
  args: GraphQLInputValue[];
}

/**
 * GraphQL schema root types
 */
export interface GraphQLSchemaRoots {
  queryType?: { name: string };
  mutationType?: { name: string };
  subscriptionType?: { name: string };
}

/**
 * Complete GraphQL schema from introspection
 */
export interface GraphQLIntrospectionSchema extends GraphQLSchemaRoots {
  types: GraphQLType[];
  directives: GraphQLDirective[];
}

/**
 * GraphQL introspection response wrapper
 */
export interface GraphQLIntrospectionResponse {
  data?: {
    __schema: GraphQLIntrospectionSchema;
  };
  errors?: Array<{
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
    path?: (string | number)[];
  }>;
}
