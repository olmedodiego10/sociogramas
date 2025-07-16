'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { useLazyQuery } from '@apollo/client';
import { GET_RESPUESTAS_QUERY } from '@/graphql/queries';
import { usePreguntasConOpciones } from './PreguntasConOpcionesContext';

// Define the context type
type RespuestasContextType = {
  respuestasData: any | null;
  loading: boolean;
  error: any;
  cuestionarioActual: string | null;
  idPreguntaAfinidad: string | null;
  setCuestionarioActual: (cuestionarioId: string | null) => void;
  refetchRespuestas: () => Promise<void>;
};

// Create context with default values
const RespuestasContext = createContext<RespuestasContextType>({
  respuestasData: null,
  loading: false,
  error: null,
  cuestionarioActual: null,
  idPreguntaAfinidad: null,
  setCuestionarioActual: () => {},
  refetchRespuestas: async () => {},
});

// Hook to use the context
export const useRespuestas = () => useContext(RespuestasContext);

// Provider component
export function RespuestasProvider({ children }: { children: ReactNode }) {
  const [cuestionarioActual, setCuestionarioIdActual] = useState<string | null>(null);
  const { getPreguntaAfinidad } = usePreguntasConOpciones();
  
  // Use lazy query to fetch responses only when we have a cuestionario ID
  const [fetchRespuestas, { data: respuestasData, loading, error, refetch }] = useLazyQuery(GET_RESPUESTAS_QUERY, {
    fetchPolicy: 'network-only',
  });

  // Obtener el ID de la pregunta de afinidad desde el contexto de preguntas
  const idPreguntaAfinidad = useMemo(() => {
    const preguntaAfinidad = getPreguntaAfinidad();
    return preguntaAfinidad?.id || null;
  }, [getPreguntaAfinidad]);

  // Set cuestionario ID and fetch responses
  const setCuestionarioActual = useCallback((cuestionarioId: string | null) => {
    setCuestionarioIdActual(cuestionarioId);
    if (cuestionarioId) {
      fetchRespuestas({ variables: { cuestionario_id: cuestionarioId } });
    }
  }, [fetchRespuestas]);

  // Function to manually refetch responses data
  const refetchRespuestas = useCallback(async () => {
    if (cuestionarioActual) {
      await refetch({ cuestionario_id: cuestionarioActual });
    }
  }, [cuestionarioActual, refetch]);

  // Context value
  const value = useMemo(() => ({
    respuestasData,
    loading,
    error,
    cuestionarioActual,
    idPreguntaAfinidad,
    setCuestionarioActual,
    refetchRespuestas,
  }), [respuestasData, loading, error, cuestionarioActual, idPreguntaAfinidad, setCuestionarioActual, refetchRespuestas]);

  return (
    <RespuestasContext.Provider value={value}>
      {children}
    </RespuestasContext.Provider>
  );
}
