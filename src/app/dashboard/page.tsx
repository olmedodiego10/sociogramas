"use client";
import React, { useEffect } from "react";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../sociogramas.css';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEstudiantes } from "@/context/EstudiantesContext";

export default function DashboardPage() {
    const router = useRouter();
    const { claseActual, identificadorClase, estudiantes, loading } = useEstudiantes();

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
            <div className="panel-form">
                <h2 className="panel-form-title">Dashboard {identificadorClase && `- ${identificadorClase}`}</h2>
                <div className="panel-description">
                    Panel de visualización de datos
                </div>
                {claseActual && <p className="panel-clase-id">ID: {claseActual}</p>}
            </div>
            
            {loading ? (
                <div className="loading-indicator">Cargando estudiantes...</div>
            ) : (
                <div className="dashboard-content">
                    <h3>Estudiantes en la clase ({estudiantes.length})</h3>
                    <ul className="dashboard-students-list">
                        {estudiantes.map((est) => (
                            <li key={est.id}>
                                <span className="student-name">{est.nombre}</span>
                                {est.cuestionario_id && <span className="student-has-questionnaire">✅</span>}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
            <div style={{ textAlign: 'center', marginTop: 32 }}>
                <Link href="/panel" className="login-link" style={{ display: 'block', marginTop: 16 }}>
                    Regresar
                </Link>
            </div>
        </div>
    );
}