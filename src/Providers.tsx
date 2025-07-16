'use client';

import { ApolloProvider } from '@apollo/client';
import client from '../lib/apollo-client';
import { EstudiantesProvider } from './context/EstudiantesContext';
import { RespuestasProvider } from './context/RespuestasContext';
import { PreguntasConOpcionesProvider } from './context/PreguntasConOpcionesContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApolloProvider client={client}>
      <EstudiantesProvider>
        <PreguntasConOpcionesProvider>
          <RespuestasProvider>
            {children}
          </RespuestasProvider>
        </PreguntasConOpcionesProvider>
      </EstudiantesProvider>
    </ApolloProvider>
  );
}
