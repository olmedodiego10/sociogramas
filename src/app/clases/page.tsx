"use client";
import React, { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { CREATE_ESTUDIANTE_MUTATION } from "@/graphql/mutations";
import { GET_ESTUDIANTES_QUERY } from "@/graphql/queries";
import { useSearchParams } from "next/navigation";
import '../sociogramas.css';
import Link from "next/link";

export default function ClasesPage() {
    const searchParams = useSearchParams();
    const claseId = searchParams.get("id");
    const identificador = searchParams.get("identificador");
    const [nombre, setNombre] = useState("");
    const [createEstudiante] = useMutation(CREATE_ESTUDIANTE_MUTATION);
    const { data: estudiantesData, refetch: refetchEstudiantes } = useQuery(GET_ESTUDIANTES_QUERY, {
        variables: { claseId },
        skip: !claseId,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createEstudiante({ variables: { object: { nombre, clase_id: claseId } } });
            setNombre("");
            refetchEstudiantes();
        } catch (err) {
            alert("Error al crear el estudiante");
        }
    };

    return (
        <div className="panel-container">
            <form onSubmit={handleSubmit} className="panel-form">
                <h2 className="panel-form-title">Clase {identificador}</h2>
                <input
                    type="text"
                    className="panel-input"
                    id="nombre-estudiante"
                    name="nombre-estudiante"
                    placeholder="Nombre del estudiante"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    required
                    autoComplete="off"
                    aria-label="Nombre del estudiante"
                />
                <button type="submit" className="panel-btn panel-btn-green">
                    Agregar estudiante
                </button>
            </form>
            <ul className="panel-list">
                {estudiantesData?.estudiante?.map((est: any) => (
                    <li key={est.id} className="panel-list-item">
                        <strong>{est.nombre}</strong>
                    </li>
                ))}
            </ul>
            <div style={{ textAlign: 'center', marginTop: 32 }}>
                <Link href="/panel" className="login-link" style={{ display: 'block', marginTop: 16 }}>
                    Regresar
                </Link>
            </div>
        </div>
    );
}
