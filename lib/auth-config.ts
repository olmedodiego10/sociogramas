// Shared authentication configuration for both API routes and client
export const AUTH_CONFIG = {
  JWT_SECRET_KEY: process.env.JWT_SECRET_KEY || 'development_secret_key',
  JWT_ALGORITHM: 'HS256' as const,
  JWT_ACCESS_TOKEN_EXPIRE_MINUTES: parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRE_MINUTES || '60'),
  HASURA_GRAPHQL_ENDPOINT: process.env.HASURA_GRAPHQL_URL || process.env.NEXT_PUBLIC_HASURA_ENDPOINT || 'https://localhost:8010/v1/graphql',
  HASURA_GRAPHQL_ADMIN_SECRET: process.env.NEXT_PUBLIC_HASURA_ADMIN_SECRET || 'hasura_admin_secret',
};

// Function to get auth API URLs based on environment
export const getAuthUrls = () => {
  // Check if we should use local Next.js API routes
  const useLocalApi = process.env.NEXT_PUBLIC_USE_LOCAL_AUTH === 'true' || 
                     (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app'));
  
  if (useLocalApi) {
    // Use Next.js API routes
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return {
      login: `${baseUrl}/api/auth/login`,
      refresh: `${baseUrl}/api/auth/refresh`
    };
  } else {
    // Use external FastAPI backend (development/self-hosted)
    return {
      login: process.env.NEXT_PUBLIC_AUTH_API_URL || "https://localhost:8443/api/auth/login",
      refresh: process.env.NEXT_PUBLIC_AUTH_REFRESH_URL || "https://localhost:8443/api/auth/refresh"
    };
  }
};

// Common GraphQL queries
export const GRAPHQL_QUERIES = {
  FETCH_USER_BY_DOCUMENTO: `
    query GetUserForAuth($documento: String!) {
      usuario(where: {documento: {_eq: $documento}, activo: {_eq: true}, deleted_at: {_is_null: true}}, limit: 1) {
        id
        nombre
        email
        password
      }
    }
  `,
  
  FETCH_USER_BY_ID: `
    query GetUserById($user_id: uuid!) {
      usuario_by_pk(id: $user_id) {
        id
        nombre
        email
        password
      }
    }
  `,
  
  FETCH_ROLES: `
    query GetRoles {
      tipo_rol {
        value
        comment
      }
    }
  `
};

// Execute GraphQL query against Hasura
export async function executeGraphQLQuery(query: string, variables?: Record<string, any>): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Hasura-Admin-Secret': AUTH_CONFIG.HASURA_GRAPHQL_ADMIN_SECRET,
  };

  const response = await fetch(AUTH_CONFIG.HASURA_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query,
      variables: variables || {},
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  return data.data;
}

// Get available roles from database
export async function getAvailableRoles(): Promise<string[]> {
  try {
    const data = await executeGraphQLQuery(GRAPHQL_QUERIES.FETCH_ROLES);
    return data.tipo_rol?.map((role: any) => role.value) || ['PUBLIC'];
  } catch (error) {
    console.error('Error fetching roles:', error);
    return ['PUBLIC', 'ADMIN', 'USER']; // Fallback roles
  }
}

// Type definitions
export interface UserInDB {
  id: string;
  nombre: string;
  apellido: string;
  documento?: string;
  email?: string;
  telefono?: string;
  activo: boolean;
  rol: string;
  password: string;
}

export interface UserPublic {
  id: string;
  nombre: string;
  apellido: string;
  documento?: string;
  email?: string;
  telefono?: string;
  activo?: boolean;
  rol: string;
}

export interface LoginRequest {
  documento: string;
  password: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface LoginResponse {
  token: Token;
  user: UserPublic;
}

export interface TokenPayload {
  user_id: string;
  role: string;
  nombre: string;
  exp: number;
  sub: string;
  'https://hasura.io/jwt/claims': {
    'x-hasura-allowed-roles': string[];
    'x-hasura-default-role': string;
    'x-hasura-user-id': string;
  };
}
