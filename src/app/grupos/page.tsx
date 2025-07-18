"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEstudiantes } from '@/context/EstudiantesContext';

export default function GruposPage() {
    const router = useRouter();
    const { 
        claseActual, 
        identificadorClase, 
        estudiantes, 
        loading, 
        error 
    } = useEstudiantes();

    // Redirigir al panel si no hay clase seleccionada
    useEffect(() => {
        if (!claseActual) {
            router.push('/panel');
        }
    }, [claseActual, router]);

    if (!claseActual) {
        return <div className="panel-container">Redirigiendo al panel...</div>;
    }

    return (
        <div className="panel-container dashboard-container">
            <Link
                href="/panel"
                className="login-link dashboard-close-btn"
                title="Cerrar y volver al panel"
            >
                ❌
            </Link>
            <h2 className="panel-form-title">Grupos {identificadorClase && `- ${identificadorClase}`}</h2>
            
            {loading ? (
                <div className="loading-indicator">Cargando estudiantes...</div>
            ) : error ? (
                <div className="error-container">
                    <p><strong>Error al cargar estudiantes:</strong> {error.message}</p>
                </div>
            ) : (
                <div className="dashboard-content">
                    <div className="estudiantes-container">
                        <h3 className="stats-title">👥 Lista de Estudiantes</h3>
                        
                        {estudiantes.length > 0 ? (
                            <div className="estudiantes-stats">
                                <div className="stat-item">
                                    <span className="stat-icon">📊</span>
                                    <div className="stat-content">
                                        <span className="stat-label">Total de estudiantes:</span>
                                        <span className="stat-value">{estudiantes.length}</span>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                        
                        <div className="respuestas-adicionales-container">
                            {estudiantes.length > 0 ? (
                                <ul className="dashboard-students-list">
                                    {estudiantes.map((estudiante) => (
                                        <li key={estudiante.id}>
                                            <div>
                                                <span className="student-name">{estudiante.nombre}</span>
                                                <div className="student-info-row">
                                                    <div className="student-code">
                                                        Código estudiante: <span className="code-value">{estudiante.codigo_estudiante}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="student-additional-info">
                                                    <p className="student-details">
                                                        <strong>ID:</strong> {estudiante.id}
                                                    </p>
                                                    {estudiante.grupo_id && (
                                                        <p className="student-group">
                                                            <strong>Grupo ID:</strong> {estudiante.grupo_id}
                                                        </p>
                                                    )}
                                                    <p className="student-created">
                                                        <strong>Creado:</strong> {new Date(estudiante.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="no-respuestas-mensaje">
                                    <p>No hay estudiantes registrados en esta clase todavía.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            <div className="footer-nav">
                <Link href="/panel" className="login-link">
                    Regresar
                </Link>
            </div>
        </div>
    );
}