'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { useLazyQuery, useQuery } from '@apollo/client';
import { GET_RESPUESTAS_QUERY, GET_ID_PREGUNTA_AFINIDAD_ESTUDIANTE_QUERY } from '@/graphql/queries';

// Define the context type
type RespuestasContextType = {
  respuestasData: any | null;
  loading: boolean;
  error: any;
  cuestionarioActual: string | null;
  idPreguntaAfinidad: string | null;
  loadingPreguntaAfinidad: boolean;
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
  loadingPreguntaAfinidad: false,
  setCuestionarioActual: () => {},
  refetchRespuestas: async () => {},
});

// Hook to use the context
export const useRespuestas = () => useContext(RespuestasContext);

// Provider component
export function RespuestasProvider({ children }: { children: ReactNode }) {
  const [cuestionarioActual, setCuestionarioIdActual] = useState<string | null>(null);
  
  // Use lazy query to fetch responses only when we have a cuestionario ID
  const [fetchRespuestas, { data: respuestasData, loading, error, refetch }] = useLazyQuery(GET_RESPUESTAS_QUERY, {
    fetchPolicy: 'network-only',
  });

  // Consulta para obtener el ID de la pregunta de afinidad (una sola vez para toda la aplicación)
  const { 
    data: preguntaAfinidadData, 
    loading: loadingPreguntaAfinidad 
  } = useQuery(GET_ID_PREGUNTA_AFINIDAD_ESTUDIANTE_QUERY, {
    fetchPolicy: 'cache-first', // Cache first para evitar requests innecesarios
  });

  const idPreguntaAfinidad = preguntaAfinidadData?.pregunta?.[0]?.id || null;

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
    loadingPreguntaAfinidad,
    setCuestionarioActual,
    refetchRespuestas,
  }), [respuestasData, loading, error, cuestionarioActual, idPreguntaAfinidad, loadingPreguntaAfinidad, setCuestionarioActual, refetchRespuestas]);

  return (
    <RespuestasContext.Provider value={value}>
      {children}
    </RespuestasContext.Provider>
  );
}
