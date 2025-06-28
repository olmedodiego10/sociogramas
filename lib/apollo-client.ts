import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
const isSSR = typeof window === 'undefined';

// Usa el admin secret de Hasura para todas las peticiones (¡solo para desarrollo/MVP!)
const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_HASURA_ENDPOINT || 'http://localhost:8080/v1/graphql',
  headers: {
    'x-hasura-admin-secret': process.env.NEXT_PUBLIC_HASURA_ADMIN_SECRET || 'hasura_admin_secret',
  },
});

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
  connectToDevTools: process.env.NODE_ENV === 'development' && !isSSR,
});

export default client;