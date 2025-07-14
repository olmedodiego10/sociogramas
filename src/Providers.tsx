'use client';

import { ApolloProvider } from '@apollo/client';
import client from '../lib/apollo-client';
import { EstudiantesProvider } from './context/EstudiantesContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApolloProvider client={client}>
      <EstudiantesProvider>
        {children}
      </EstudiantesProvider>
    </ApolloProvider>
  );
}
