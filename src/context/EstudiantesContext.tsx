'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useLazyQuery } from '@apollo/client';
import { GET_ESTUDIANTES_QUERY } from '@/graphql/queries';

// Define the type for a student
export type Estudiante = {
  id: string;
  nombre: string;
  codigo_estudiante: string;
  created_at: string;
  clase_id: string;
  grupo_id: string | null;
  cuestionario_id: string | null;
};

// Define the context type
type EstudiantesContextType = {
  estudiantes: Estudiante[];
  claseActual: string | null;
  identificadorClase: string | null;
  loading: boolean;
  error: any;
  setClaseActual: (claseId: string | null, identificador: string | null) => void;
  refetchEstudiantes: () => Promise<void>;
};

// Create context with default values
const EstudiantesContext = createContext<EstudiantesContextType>({
  estudiantes: [],
  claseActual: null,
  identificadorClase: null,
  loading: false,
  error: null,
  setClaseActual: () => {},
  refetchEstudiantes: async () => {},
});

// Hook to use the context
export const useEstudiantes = () => useContext(EstudiantesContext);

// Provider component
export function EstudiantesProvider({ children }: { children: ReactNode }) {
  const [claseActual, setClaseIdActual] = useState<string | null>(null);
  const [identificadorClase, setIdentificadorClase] = useState<string | null>(null);
  
  // Use lazy query to fetch students only when we have a class ID
  const [fetchEstudiantes, { data, loading, error, refetch }] = useLazyQuery(GET_ESTUDIANTES_QUERY, {
    fetchPolicy: 'network-only',
  });

  // Set class ID and fetch students
  const setClaseActual = (claseId: string | null, identificador: string | null) => {
    setClaseIdActual(claseId);
    setIdentificadorClase(identificador);
    if (claseId) {
      fetchEstudiantes({ variables: { claseId } });
    }
  };

  // Function to manually refetch students data
  const refetchEstudiantes = async () => {
    if (claseActual) {
      await refetch({ claseId: claseActual });
    }
  };

  // Extract estudiantes from query data or default to empty array
  const estudiantes = data?.estudiante || [];

  // Context value
  const value = {
    estudiantes,
    claseActual,
    identificadorClase,
    loading,
    error,
    setClaseActual,
    refetchEstudiantes,
  };

  return (
    <EstudiantesContext.Provider value={value}>
      {children}
    </EstudiantesContext.Provider>
  );
}
