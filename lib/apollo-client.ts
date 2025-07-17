import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
const isSSR = typeof window === 'undefined';

// Usa el admin secret de Hasura para todas las peticiones (¡solo para desarrollo/MVP!)
const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_HASURA_ENDPOINT || 'http://localhost:8080/v1/graphql',
  headers: {
    'x-hasura-admin-secret': process.env.NEXT_PUBLIC_HASURA_ADMIN_SECRET || 'hasura_admin_secret',
  },
});

// Configurar el cache con funciones de merge personalizadas
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        respuesta: {
          // Función de merge para arrays de respuestas
          merge(existing = [], incoming = []) {
            // Si no hay datos existentes, simplemente devolver los nuevos
            if (!existing.length) {
              return incoming;
            }
            
            // Para arrays de respuestas, usamos replace en lugar de merge
            // ya que queremos los datos más actualizados
            return incoming;
          },
        },
        opcion_pregunta: {
          // Función de merge para opciones de pregunta
          merge(existing = [], incoming = []) {
            return incoming;
          },
        },
        pregunta: {
          // Función de merge para preguntas
          merge(existing = [], incoming = []) {
            return incoming;
          },
        },
      },
    },
    // Definir cómo identificar los objetos de respuesta de manera única
    respuesta: {
      keyFields: ["id"],
    },
    // Definir cómo identificar otros objetos de manera única
    opcion_pregunta: {
      keyFields: ["id"],
    },
    pregunta: {
      keyFields: ["id"],
    },
    estudiante: {
      keyFields: ["id"],
    },
    cuestionario: {
      keyFields: ["id"],
    },
    clase: {
      keyFields: ["id"],
    },
  },
});

const client = new ApolloClient({
  link: httpLink,
  cache,
  connectToDevTools: process.env.NODE_ENV === 'development' && !isSSR,
});

export default client;