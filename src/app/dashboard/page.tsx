"use client";
import React, { useEffect, useState } from "react";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../sociogramas.css';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEstudiantes } from "@/context/EstudiantesContext";
import { useQuery } from "@apollo/client";
import { GET_ID_PREGUNTA_AFINIDAD_ESTUDIANTE_QUERY, GET_RESPUESTAS_AFINIDAD_QUERY } from "@/graphql/queries";

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
    
    // Estado para almacenar el ID de la pregunta de afinidad
    const [idPreguntaAfinidad, setIdPreguntaAfinidad] = useState<string | null>(null);
    
    // Consulta para obtener el ID de la pregunta de afinidad
    const { 
        data: preguntaAfinidadData, 
        loading: loadingPreguntaAfinidad 
    } = useQuery(GET_ID_PREGUNTA_AFINIDAD_ESTUDIANTE_QUERY);
    
    // Actualizar el estado cuando lleguen los datos de la pregunta de afinidad
    useEffect(() => {
        if (preguntaAfinidadData?.pregunta?.[0]?.id) {
            setIdPreguntaAfinidad(preguntaAfinidadData.pregunta[0].id);
        }
    }, [preguntaAfinidadData]);
    
    // Consulta para obtener las respuestas de afinidad
    const {
        data: respuestasData,
        loading: loadingRespuestas,
        error: respuestasError,
        refetch: refetchRespuestas
    } = useQuery(GET_RESPUESTAS_AFINIDAD_QUERY, {
        variables: {
            cuestionario_id: cuestionarioActual?.id,
            pregunta_id: idPreguntaAfinidad
        },
        skip: !cuestionarioActual?.id || !idPreguntaAfinidad
    });

    // Depuración de variables y respuestas
    useEffect(() => {
        console.log('Variables de consulta:', {
            cuestionarioId: cuestionarioActual?.id,
            preguntaId: idPreguntaAfinidad
        });
        
        if (respuestasData) {
            console.log('Datos de respuestas:', respuestasData);
            
            // Verificar si tenemos las respuestas y opciones de pregunta
            if (respuestasData.respuesta && respuestasData.respuesta.length > 0) {
                console.log('Ejemplo de respuesta:', respuestasData.respuesta[0]);
                
                // Verificar opciones de pregunta
                if (respuestasData.opcion_pregunta && respuestasData.opcion_pregunta.length > 0) {
                    console.log('Ejemplo de opcion_pregunta:', respuestasData.opcion_pregunta[0]);
                    
                    // Probar el join
                    const primeraRespuesta = respuestasData.respuesta[0];
                    const opcionEncontrada = respuestasData.opcion_pregunta.find(
                        (op: any) => op.id === primeraRespuesta.opcion_pregunta_id
                    );
                    
                    console.log('Join manual de respuesta con opción:', opcionEncontrada);
                } else {
                    console.warn('No se encontraron opciones de pregunta en la respuesta');
                }
            }
        }
        
        if (respuestasError) {
            console.error('Error en consulta de respuestas:', respuestasError);
        }
    }, [cuestionarioActual, idPreguntaAfinidad, respuestasData, respuestasError]);

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
                {claseActual && <p className="panel-clase-id">ID de clase: {claseActual}</p>}
                
                {loadingCuestionario ? (
                    <p className="panel-loading-info">Cargando información del cuestionario...</p>
                ) : cuestionarioActual ? (
                    <div className="cuestionario-info">
                        <p className="panel-cuestionario-id" style={{ color: '#2e7d32' }}>
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
                    <p className="panel-no-cuestionario" style={{ color: '#b71c1c' }}>
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
                        <div className="cuestionario-stats" style={{ marginBottom: '16px' }}>
                            <p>
                                <strong>Asignados al cuestionario:</strong> {
                                    estudiantes.filter(est => est.cuestionario_id === cuestionarioActual.id).length
                                } de {estudiantes.length} estudiantes
                            </p>
                            
                            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #ddd' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Información de preguntas de afinidad:</h4>
                                
                                {loadingPreguntaAfinidad ? (
                                    <p>Cargando información de la pregunta de afinidad...</p>
                                ) : idPreguntaAfinidad ? (
                                    <div>
                                        <p>
                                            <strong>ID pregunta de afinidad:</strong> <span 
                                                style={{ 
                                                    backgroundColor: '#e8f5e9', 
                                                    padding: '3px 8px', 
                                                    borderRadius: '4px',
                                                    fontFamily: 'monospace',
                                                    fontSize: '0.9em'
                                                }}
                                            >
                                                {idPreguntaAfinidad}
                                            </span>
                                        </p>
                                        
                                        {loadingRespuestas ? (
                                            <p>Cargando respuestas de afinidad...</p>
                                        ) : respuestasError ? (
                                            <div style={{ color: '#d32f2f', padding: '10px', backgroundColor: '#ffebee', borderRadius: '4px', marginTop: '10px' }}>
                                                <p><strong>Error al cargar respuestas:</strong> {respuestasError.message}</p>
                                                <button 
                                                    onClick={() => refetchRespuestas()}
                                                    style={{
                                                        marginTop: '8px',
                                                        padding: '6px 12px',
                                                        backgroundColor: '#1976d2',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Reintentar
                                                </button>
                                            </div>
                                        ) : respuestasData?.respuesta ? (
                                            <div style={{ marginTop: '10px' }}>
                                                <p>
                                                    <strong>Total de respuestas de afinidad:</strong> 
                                                    <span style={{ 
                                                        backgroundColor: respuestasData.respuesta.length > 0 ? '#e8f5e9' : '#ffebee',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                        marginLeft: '5px',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {respuestasData.respuesta.length}
                                                    </span>
                                                    <button 
                                                        onClick={() => {
                                                            refetchRespuestas();
                                                            toast.info('Actualizando respuestas...');
                                                        }}
                                                        style={{
                                                            marginLeft: '10px',
                                                            padding: '2px 8px',
                                                            backgroundColor: '#f5f5f5',
                                                            border: '1px solid #ddd',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            fontSize: '0.8em'
                                                        }}
                                                    >
                                                        🔄 Actualizar
                                                    </button>
                                                </p>
                                                
                                                {respuestasData.respuesta && Array.isArray(respuestasData.respuesta) && respuestasData.respuesta.length > 0 && (
                                                    <div style={{ marginTop: '10px' }}>
                                                        <details open>
                                                            <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#1976d2' }}>
                                                                Ver detalles de respuestas de afinidad ({respuestasData.respuesta.length})
                                                            </summary>
                                                            <div style={{ 
                                                                marginTop: '10px', 
                                                                maxHeight: '400px', 
                                                                overflowY: 'auto', 
                                                                padding: '10px',
                                                                backgroundColor: '#fff',
                                                                borderRadius: '4px',
                                                                border: '1px solid #e0e0e0'
                                                            }}>
                                                                <div className="respuestas-table-container">
                                                                    <div style={{ marginBottom: '15px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                                                                        <p style={{ margin: '0', fontSize: '1em' }}>
                                                                            <strong>{respuestasData.respuesta.length}</strong> respuestas encontradas
                                                                        </p>
                                                                    </div>
                                                                    
                                                                    <table style={{ 
                                                                        width: '100%', 
                                                                        borderCollapse: 'collapse', 
                                                                        fontSize: '0.85em' 
                                                                    }}>
                                                                        <thead>
                                                                            <tr style={{ backgroundColor: '#f1f8e9' }}>
                                                                                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Estudiante</th>
                                                                                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Evaluó a</th>
                                                                                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Opción seleccionada</th>
                                                                                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Comentario</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>                                                            {respuestasData.respuesta.map((resp: any) => (
                                                                                                <tr key={resp.id} style={{ borderBottom: '1px solid #eee' }}>
                                                                                                    <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                                                                                        <div>
                                                                                                            {/* Buscamos el estudiante en nuestra lista */}
                                                                                                            {(() => {
                                                                                                                const estudiante = estudiantes.find(est => est.id === resp.estudiante_id);
                                                                                                                return estudiante ? (
                                                                                                                    <strong>{estudiante.nombre}</strong>
                                                                                                                ) : (
                                                                                                                    <span style={{ color: '#999' }}>
                                                                                                                        Estudiante desconocido
                                                                                                                    </span>
                                                                                                                );
                                                                                                            })()}
                                                                                                        </div>
                                                                                                    </td>
                                                                                                    <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                                                                                        <div>
                                                                                                            {/* Mostramos el nombre del estudiante evaluado */}
                                                                                                            {(() => {
                                                                                                                const estudianteEvaluado = estudiantes.find(est => est.id === resp.estudiante_evaluado_id);
                                                                                                                return estudianteEvaluado ? (
                                                                                                                    <strong>{estudianteEvaluado.nombre}</strong>
                                                                                                                ) : (
                                                                                                                    <span style={{ color: '#999' }}>
                                                                                                                        Estudiante desconocido
                                                                                                                    </span>
                                                                                                                );
                                                                                                            })()}
                                                                                                        </div>
                                                                                                    </td>
                                                                                                    <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                                                                                        <div style={{ 
                                                                                                            backgroundColor: '#e3f2fd', 
                                                                                                            padding: '4px 8px', 
                                                                                                            borderRadius: '4px',
                                                                                                            display: 'inline-block'
                                                                                                        }}>
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
                                                                                    <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                                                                        {resp.otro_texto ? (
                                                                                            <div style={{ 
                                                                                                fontStyle: 'italic',
                                                                                                color: '#555'
                                                                                            }}>
                                                                                                "{resp.otro_texto}"
                                                                                            </div>
                                                                                        ) : (
                                                                                            <span style={{ color: '#999' }}>
                                                                                                -
                                                                                            </span>
                                                                                        )}
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
                                        ) : (
                                            <p>No se encontraron respuestas de afinidad para este cuestionario.</p>
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
            
            <div style={{ textAlign: 'center', marginTop: 32 }}>
                <Link href="/panel" className="login-link" style={{ display: 'block', marginTop: 16 }}>
                    Regresar
                </Link>
            </div>
        </div>
    );
}