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
        <div className="panel-container" style={{ position: 'relative' }}>
            <Link
                href="/panel"
                className="login-link"
                style={{
                    position: 'absolute',
                    top: 18,
                    right: 24,
                    fontSize: '1.5em',
                    textDecoration: 'none',
                    color: '#b71c1c',
                    zIndex: 2,
                    fontWeight: 700
                }}
                title="Cerrar y volver al panel"
            >
                ❌
            </Link>
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
            <p>
                Pendiente funcionalidad de importar clase entera o importar un alumno existente mediante código de estudiante.
            </p>
            <ul className="panel-list">
                {estudiantesData?.estudiante?.map((est: any) => (
                    <li key={est.id} className="panel-list-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <strong>🎒{est.nombre}</strong>
                            <br />
                            <strong>Código de estudiante:</strong>
                            <button
                                type="button"
                                className="panel-btn"
                                style={{ marginLeft: 8, padding: '2px 10px', fontSize: '0.95em', verticalAlign: 'middle' }}
                                onClick={() => navigator.clipboard.writeText(est.codigo_estudiante)}
                                title="Copiar código"
                            >
                                📋
                            </button>
                            <br />
                            <span style={{ color: '#666', fontSize: '0.98em', wordBreak: 'break-all', verticalAlign: 'middle' }}>{est.codigo_estudiante}</span>
                        </div>
                        <span style={{ marginRight: 16, fontSize: '0.97em', color: est.cuestionario_id ? '#388e3c' : '#b71c1c' }}>
                            {est.cuestionario_id ? 'Cuestionario asignado' : 'Sin cuestionario asignado'}
                        </span>
                        <button className="panel-btn" type="button" style={{ minWidth: 60 }}>
                            Ver
                        </button>
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
