'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useQuery } from '@apollo/client';
import { GET_PREGUNTAS_QUERY, GET_OPCIONES_PREGUNTA_QUERY } from '@/graphql/queries';

// Define the context type
type PreguntasConOpcionesContextType = {
  preguntasData: any | null;
  opcionesPreguntaData: any | null;
  loading: boolean;
  error: any;
  // Helper functions para buscar preguntas específicas
  getPreguntaPorTipoYNumero: (tipo: string, numero: number) => any | null;
  getOpcionesPorPreguntaId: (preguntaId: string) => any[];
  getPreguntaAfinidad: () => any | null;
  getPreguntasMultipleSeleccion: (numeroMinimo?: number) => any[];
};

// Create context with default values
const PreguntasConOpcionesContext = createContext<PreguntasConOpcionesContextType>({
  preguntasData: null,
  opcionesPreguntaData: null,
  loading: false,
  error: null,
  getPreguntaPorTipoYNumero: () => null,
  getOpcionesPorPreguntaId: () => [],
  getPreguntaAfinidad: () => null,
  getPreguntasMultipleSeleccion: () => [],
});

// Hook to use the context
export const usePreguntasConOpciones = () => useContext(PreguntasConOpcionesContext);

// Provider component
export function PreguntasConOpcionesProvider({ children }: { children: ReactNode }) {
  // Cargar preguntas
  const { 
    data: preguntasData, 
    loading: loadingPreguntas, 
    error: errorPreguntas 
  } = useQuery(GET_PREGUNTAS_QUERY, {
    fetchPolicy: 'cache-first',
  });

  // Cargar opciones de pregunta
  const { 
    data: opcionesPreguntaData, 
    loading: loadingOpciones, 
    error: errorOpciones 
  } = useQuery(GET_OPCIONES_PREGUNTA_QUERY, {
    fetchPolicy: 'cache-first',
  });

  // Estado de carga combinado
  const loading = loadingPreguntas || loadingOpciones;
  const error = errorPreguntas || errorOpciones;

  // Helper function para buscar pregunta por tipo y número
  const getPreguntaPorTipoYNumero = useMemo(() => (tipo: string, numero: number) => {
    if (!preguntasData?.pregunta) return null;
    
    return (preguntasData.pregunta as Array<{ 
      id: string; 
      texto: string; 
      tipo_pregunta: string; 
      numero_pregunta: number;
    }>).find(p => p.tipo_pregunta === tipo && p.numero_pregunta === numero) || null;
  }, [preguntasData]);

  // Helper function para obtener opciones por pregunta ID
  const getOpcionesPorPreguntaId = useMemo(() => (preguntaId: string) => {
    if (!opcionesPreguntaData?.opcion_pregunta) return [];
    
    return (opcionesPreguntaData.opcion_pregunta as Array<{ 
      id: string; 
      pregunta_id: string; 
      texto_opcion: string;
    }>).filter(op => op.pregunta_id === preguntaId);
  }, [opcionesPreguntaData]);

  // Helper function para obtener la pregunta de afinidad
  const getPreguntaAfinidad = useMemo(() => () => {
    if (!preguntasData?.pregunta) return null;
    
    return (preguntasData.pregunta as Array<{ 
      id: string; 
      texto: string; 
      tipo_pregunta: string; 
      numero_pregunta: number;
    }>).find(p => p.tipo_pregunta === "AFINIDAD_ESTUDIANTE" && p.numero_pregunta === 1) || null;
  }, [preguntasData]);

  // Helper function para obtener preguntas de selección múltiple
  const getPreguntasMultipleSeleccion = useMemo(() => (numeroMinimo: number = 1) => {
    if (!preguntasData?.pregunta) return [];
    
    return (preguntasData.pregunta as Array<{ 
      id: string; 
      tipo_pregunta: string; 
      numero_pregunta: number;
    }>)
      .filter(p => p.tipo_pregunta === "MULTIPLE_SELECCION" && p.numero_pregunta >= numeroMinimo)
      .sort((a, b) => a.numero_pregunta - b.numero_pregunta);
  }, [preguntasData]);

  // Context value
  const value = useMemo(() => ({
    preguntasData,
    opcionesPreguntaData,
    loading,
    error,
    getPreguntaPorTipoYNumero,
    getOpcionesPorPreguntaId,
    getPreguntaAfinidad,
    getPreguntasMultipleSeleccion,
  }), [
    preguntasData, 
    opcionesPreguntaData, 
    loading, 
    error
    // Removemos las funciones de las dependencias para evitar ciclos infinitos
  ]);

  return (
    <PreguntasConOpcionesContext.Provider value={value}>
      {children}
    </PreguntasConOpcionesContext.Provider>
  );
}
