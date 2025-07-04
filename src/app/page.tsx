"use client";
import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useLazyQuery } from "@apollo/client";
import client from "../../lib/apollo-client";
import { GET_ESTUDIANTE_BY_CODIGO_QUERY } from "@/graphql/queries";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// import '@/app/sociogramas.css'; // Ahora se importa globalmente en layout.tsx

export default function Home() {
  const [numero, setNumero] = useState("");
  const [buscarEstudiante, { data, loading, error }] = useLazyQuery(GET_ESTUDIANTE_BY_CODIGO_QUERY, { client });
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNumero(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numero) return;
    buscarEstudiante({ variables: { codigo: numero } });
  };

  // Manejo de resultados de la consulta para verificar si el estudiante existe y tiene un cuestionario asignado
  React.useEffect(() => {
    if (data && data.estudiante) {
      if (data.estudiante.length > 0) {
        const estudiante = data.estudiante[0];
        if (estudiante.cuestionario_id) {
          toast.success("Cargando cuestionario");
          setTimeout(() => {
            // Pasar el código del estudiante como query param
            router.push(`/cuestionario?codigo_estudiante=${encodeURIComponent(estudiante.codigo_estudiante)}`);
          }, 1000);
        } else {
          toast.warn("No tienes un cuestionario asignado");
        }
      } else {
        toast.error("Estudiante no encontrado");
      }
    }
    if (error) {
      console.log(error);
      toast.error("Error al buscar el estudiante");
    }
  }, [data, error, router]);

  return (
    <div className="login">
      <form onSubmit={handleSubmit}>
        <h2>Ingrese su código de estudiante</h2>
        <label htmlFor="codigo-estudiante">Código de estudiante</label>
        <input
          id="codigo-estudiante"
          type="text"
          placeholder="Tú código..."
          value={numero}
          onChange={handleChange}
          required
        />
        <button type="submit" className="btn btn-primary">
          Continuar
        </button>
      </form>
      <Link href="/login" className="login-link">
        O inicia sesión para gestionar tus sociogramas
      </Link>
    </div>
  );
}
