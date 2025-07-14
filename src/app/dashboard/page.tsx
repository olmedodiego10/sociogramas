"use client";
import React, { useEffect, useState } from "react";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../sociogramas.css';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEstudiantes } from "@/context/EstudiantesContext";
import { useQuery } from "@apollo/client";
import { GET_RESPUESTAS_QUERY } from "@/graphql/queries";

export default function DashboardPage() {
    const router = useRouter();
    const { 
        claseActual, 
        identificadorClase, 
        estudiantes, 
        loading, 
        cuestionarioActual, 
        loadingCuestionario 
    } = useEstudiantes();
    
    // Estados para almacenar datos filtrados
    const [idPreguntaAfinidad, setIdPreguntaAfinidad] = useState<string | null>(null);
    const [respuestasAfinidad, setRespuestasAfinidad] = useState<any[]>([]);
    const [loadingPreguntaAfinidad, setLoadingPreguntaAfinidad] = useState<boolean>(true);
    
    // Consulta para obtener todas las respuestas del cuestionario
    const {
        data: respuestasData,
        loading: loadingRespuestas,
        error: respuestasError,
        refetch: refetchRespuestas
    } = useQuery(GET_RESPUESTAS_QUERY, {
        variables: {
            cuestionario_id: cuestionarioActual?.id
        },
        skip: !cuestionarioActual?.id
    });

    // Filtrar respuestas de afinidad y otras
    useEffect(() => {
        setLoadingPreguntaAfinidad(true);
        
        if (respuestasData) {
            console.log('Datos de respuestas:', respuestasData);
            
            // Buscar la pregunta de tipo AFINIDAD_ESTUDIANTE
            const preguntaAfinidad = respuestasData.pregunta?.find(
                (p: any) => p.tipo_pregunta === 'AFINIDAD_ESTUDIANTE'
            );
            
            if (preguntaAfinidad) {
                console.log('Pregunta de afinidad encontrada:', preguntaAfinidad);
                setIdPreguntaAfinidad(preguntaAfinidad.id);
                
                // Filtrar las respuestas por el ID de la pregunta de afinidad
                const respuestasDeAfinidad = respuestasData.respuesta?.filter(
                    (r: any) => r.pregunta_id === preguntaAfinidad.id
                ) || [];
                
                // Filtrar las respuestas que NO son de afinidad
                const otrasRespuestas = respuestasData.respuesta?.filter(
                    (r: any) => r.pregunta_id !== preguntaAfinidad.id
                ) || [];
                
                console.log('Respuestas de afinidad:', respuestasDeAfinidad);
                console.log('Otras respuestas (sólo consola):', otrasRespuestas);
                
                // Actualizar estado con las respuestas de afinidad
                setRespuestasAfinidad(respuestasDeAfinidad);
                
                // Verificar opciones de pregunta
                if (respuestasData.opcion_pregunta && respuestasData.opcion_pregunta.length > 0) {
                    console.log('Ejemplo de opcion_pregunta:', respuestasData.opcion_pregunta[0]);
                    
                    // Probar el join con la primera respuesta de afinidad si existe
                    if (respuestasDeAfinidad.length > 0) {
                        const primeraRespuesta = respuestasDeAfinidad[0];
                        const opcionEncontrada = respuestasData.opcion_pregunta.find(
                            (op: any) => op.id === primeraRespuesta.opcion_pregunta_id
                        );
                        
                        console.log('Join manual de respuesta con opción:', opcionEncontrada);
                    }
                } else {
                    console.warn('No se encontraron opciones de pregunta en la respuesta');
                }
            } else {
                console.warn('No se encontró una pregunta de tipo AFINIDAD_ESTUDIANTE');
                setIdPreguntaAfinidad(null);
                setRespuestasAfinidad([]);
            }
        }
        
        if (respuestasError) {
            console.error('Error en consulta de respuestas:', respuestasError);
        }
        
        setLoadingPreguntaAfinidad(false);
    }, [respuestasData, respuestasError]);

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
            <div className="panel-form">
                <h2 className="panel-form-title">Dashboard {identificadorClase && `- ${identificadorClase}`}</h2>
                <div className="panel-description">
                    Panel de visualización de datos
                </div>
                {claseActual && <p className="panel-clase-id">ID de clase: {claseActual}</p>}
                
                {loadingCuestionario ? (
                    <p className="panel-loading-info">Cargando información del cuestionario...</p>
                ) : cuestionarioActual ? (
                    <div className="cuestionario-info">
                        <p className="panel-cuestionario-id">
                            <strong>Cuestionario activo:</strong> {cuestionarioActual.id}
                        </p>
                        <p>
                            <strong>Estado:</strong> {cuestionarioActual.estado}
                        </p>
                        <p>
                            <strong>Fecha de creación:</strong> {new Date(cuestionarioActual.created_at).toLocaleString()}
                        </p>
                    </div>
                ) : (
                    <p className="panel-no-cuestionario">
                        No hay cuestionario activo para esta clase
                    </p>
                )}
            </div>
            
            {loading ? (
                <div className="loading-indicator">Cargando estudiantes...</div>
            ) : (
                <div className="dashboard-content">
                    <h3>Estudiantes en la clase ({estudiantes.length})</h3>
                    
                    {cuestionarioActual && (
                        <div className="cuestionario-stats">
                            <p>
                                <strong>Asignados al cuestionario:</strong> {
                                    estudiantes.filter(est => est.cuestionario_id === cuestionarioActual.id).length
                                } de {estudiantes.length} estudiantes
                            </p>
                            
                            <div className="afinidad-info-container">
                                <h4 className="afinidad-heading">Información de preguntas de afinidad:</h4>
                                
                                {loadingPreguntaAfinidad ? (
                                    <p>Cargando información de la pregunta de afinidad...</p>
                                ) : idPreguntaAfinidad ? (
                                    <div>
                                        <p>
                                            <strong>ID pregunta de afinidad:</strong> <span className="afinidad-id-badge">
                                                {idPreguntaAfinidad}
                                            </span>
                                        </p>
                                        
                                        {loadingRespuestas ? (
                                            <p>Cargando respuestas de afinidad...</p>
                                        ) : respuestasError ? (
                                            <div className="afinidad-error-container">
                                                <p><strong>Error al cargar respuestas:</strong> {respuestasError.message}</p>
                                                <button 
                                                    onClick={() => refetchRespuestas()}
                                                    className="afinidad-retry-btn"
                                                >
                                                    Reintentar
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="afinidad-respuestas-container">
                                                <p>
                                                    <strong>Total de respuestas de afinidad:</strong> 
                                                    <span className={respuestasAfinidad.length > 0 ? "afinidad-count" : "afinidad-empty-count"}>
                                                        {respuestasAfinidad.length}
                                                    </span>
                                                    <button 
                                                        onClick={() => {
                                                            refetchRespuestas();
                                                            toast.info('Actualizando respuestas...');
                                                        }}
                                                        className="afinidad-refresh-btn"
                                                    >
                                                        🔄 Actualizar
                                                    </button>
                                                </p>
                                                
                                                {respuestasAfinidad.length > 0 && (
                                    <div className="afinidad-respuestas-container">
                                        <details open>
                                            <summary className="afinidad-details-summary">
                                                Ver detalles de respuestas de afinidad ({respuestasAfinidad.length})
                                            </summary>
                                            <div className="afinidad-details-content">
                                                <div className="respuestas-table-container">
                                    <div className="respuestas-counter">
                                        <p>
                                            <strong>{respuestasAfinidad.length}</strong> respuestas encontradas
                                        </p>
                                    </div>
                                    
                                    <table className="respuestas-table">
                                        <thead>
                                            <tr>
                                                <th>Estudiante</th>
                                                <th>Evaluó a</th>
                                                <th>Opción seleccionada</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {respuestasAfinidad.map((resp: any) => (
                                                <tr key={resp.id}>
                                    <td>
                                        <div>
                                            {/* Buscamos el estudiante en nuestra lista */}
                                            {(() => {
                                                const estudiante = estudiantes.find(est => est.id === resp.estudiante_id);
                                                return estudiante ? (
                                                    <strong>{estudiante.nombre}</strong>
                                                ) : (
                                                    <span className="estudiante-desconocido">
                                                        Estudiante desconocido
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                    <td>
                                        <div>
                                            {/* Mostramos el nombre del estudiante evaluado */}
                                            {(() => {
                                                const estudianteEvaluado = estudiantes.find(est => est.id === resp.estudiante_evaluado_id);
                                                return estudianteEvaluado ? (
                                                    <strong>{estudianteEvaluado.nombre}</strong>
                                                ) : (
                                                    <span className="estudiante-desconocido">
                                                        Estudiante desconocido
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="opcion-badge">
                                            {/* Hacemos join manual con la tabla opcion_pregunta */}
                                            {(() => {
                                                // Buscamos la opción correspondiente por ID
                                                const opcion = respuestasData.opcion_pregunta && Array.isArray(respuestasData.opcion_pregunta) ?
                                                    respuestasData.opcion_pregunta.find(
                                                        (op: any) => op.id === resp.opcion_pregunta_id
                                                    ) : null;
                                                
                                                // Si encontramos la opción, mostramos su texto
                                                if (opcion && opcion.texto_opcion) {
                                                    return opcion.texto_opcion;
                                                }
                                                
                                                // Si no la encontramos, mostramos un mensaje genérico
                                                return resp.opcion_pregunta_id ? 
                                                    "Opción seleccionada" : 
                                                    "No disponible";
                                            })()}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </details>
                                    </div>
                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p>No se encontró la pregunta de afinidad.</p>
                                )}
                            </div>
                        </div>
                    )}
                    
                    <ul className="dashboard-students-list">
                                        {estudiantes.map((est) => (
                            <li key={est.id}>
                                <span className="student-name">{est.nombre}</span>
                                {est.cuestionario_id && (
                                    <span 
                                        className="student-has-questionnaire" 
                                        title={`Cuestionario asignado: ${est.cuestionario_id}`}
                                    >
                                        {est.cuestionario_id === cuestionarioActual?.id ? '✅ Actual' : '📝 Otro'}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
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