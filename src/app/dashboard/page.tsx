"use client";
import React, { useEffect, useState } from "react";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../sociogramas.css';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEstudiantes } from "@/context/EstudiantesContext";
import { useRespuestas } from "@/context/RespuestasContext";
import { EstadoCuestionario } from "@/components";

// Funciones utilitarias para el manejo de opciones
const getOptionIcon = (texto: string) => {
    const textoLowerCase = texto.toLowerCase();
    if (textoLowerCase.includes('verde')) return '🟩';
    if (textoLowerCase.includes('amarillo')) return '🟨';
    if (textoLowerCase.includes('rojo')) return '🟥';
    if (textoLowerCase.includes('blanco')) return '⚪';
    return '';
};

const getOptionClass = (texto: string) => {
    const textoLowerCase = texto.toLowerCase();
    if (textoLowerCase.includes('verde')) return 'opcion-verde';
    if (textoLowerCase.includes('amarillo')) return 'opcion-amarillo';
    if (textoLowerCase.includes('rojo')) return 'opcion-rojo';
    if (textoLowerCase.includes('blanco')) return 'opcion-blanco';
    return 'opcion-badge';
};

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
    
    const {
        respuestasData,
        loading: loadingRespuestas,
        error: respuestasError,
        setCuestionarioActual,
        refetchRespuestas,
        idPreguntaAfinidad,
        loadingPreguntaAfinidad
    } = useRespuestas();
    
    // Estados para almacenar datos filtrados
    const [respuestasAfinidad, setRespuestasAfinidad] = useState<any[]>([]);
    
    // Estados para las estadísticas de tipos de respuestas
    const [contadorRespuestas, setContadorRespuestas] = useState({
        verde: 0,
        amarillo: 0,
        rojo: 0,
        blanco: 0,
        total: 0
    });
    
    // Efecto para establecer el cuestionario actual en el contexto de respuestas
    useEffect(() => {
        const cuestionarioId = cuestionarioActual?.id || null;
        setCuestionarioActual(cuestionarioId);
    }, [cuestionarioActual?.id, setCuestionarioActual]);

    // Filtrar respuestas de afinidad y otras
    useEffect(() => {
        if (respuestasData && idPreguntaAfinidad) {
            // Filtrar las respuestas por el ID de la pregunta de afinidad
            const respuestasDeAfinidad = respuestasData.respuesta?.filter(
                (r: any) => r.pregunta_id === idPreguntaAfinidad
            ) || [];
            
            // Actualizar estado con las respuestas de afinidad
            setRespuestasAfinidad(respuestasDeAfinidad);
            
            // Contar respuestas por tipo (verde, amarillo, rojo, blanco)
            if (respuestasData.opcion_pregunta && Array.isArray(respuestasData.opcion_pregunta)) {
                const contadores = {
                    verde: 0,
                    amarillo: 0,
                    rojo: 0,
                    blanco: 0,
                    total: respuestasDeAfinidad.length
                };
                
                respuestasDeAfinidad.forEach((resp: any) => {
                    const opcion = respuestasData.opcion_pregunta.find(
                        (op: any) => op.id === resp.opcion_pregunta_id
                    );
                    
                    if (opcion && opcion.texto_opcion) {
                        const textoLowerCase = opcion.texto_opcion.toLowerCase();
                        
                        if (textoLowerCase.includes('verde')) {
                            contadores.verde += 1;
                        } else if (textoLowerCase.includes('amarillo')) {
                            contadores.amarillo += 1;
                        } else if (textoLowerCase.includes('rojo')) {
                            contadores.rojo += 1;
                        } else if (textoLowerCase.includes('blanco')) {
                            contadores.blanco += 1;
                        }
                    }
                });
                
                setContadorRespuestas(contadores);
            }
        } else if (respuestasError || !idPreguntaAfinidad) {
            // Si hay error o no hay pregunta de afinidad, reiniciar estados
            setRespuestasAfinidad([]);
            setContadorRespuestas({
                verde: 0,
                amarillo: 0,
                rojo: 0,
                blanco: 0,
                total: 0
            });
        }
    }, [respuestasData, idPreguntaAfinidad, respuestasError]);

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
            <h2 className="panel-form-title">Dashboard {identificadorClase && `- ${identificadorClase}`}</h2>
            
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
                                {loadingPreguntaAfinidad ? (
                                    <p>Cargando información de la pregunta de afinidad...</p>
                                ) : idPreguntaAfinidad ? (
                                    <div>
                                        {loadingRespuestas ? (
                                            <p>Cargando respuestas de afinidad...</p>
                                        ) : respuestasError ? (
                                            <div className="afinidad-error-container">
                                                <p><strong>Error al cargar respuestas:</strong> {respuestasError.message}</p>
                                                <button 
                                                    onClick={() => {
                                                        // Reiniciar contadores cuando se reintenta después de un error
                                                        setContadorRespuestas({
                                                            verde: 0,
                                                            amarillo: 0,
                                                            rojo: 0,
                                                            blanco: 0,
                                                            total: 0
                                                        });
                                                        refetchRespuestas();
                                                    }}
                                                    className="afinidad-retry-btn"
                                                >
                                                    Reintentar
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="afinidad-respuestas-container">
                                                
                                                {/* Estadísticas de respuestas por tipo */}
                                                <div className="estadisticas-container">
                                                    <div className="estadistica-box estadistica-verde">
                                                        <div className="estadistica-icono">🟩</div>
                                                        <div className="estadistica-numero">{contadorRespuestas.verde}</div>
                                                        <div className="estadistica-etiqueta">Verde</div>
                                                        <div className="estadistica-porcentaje">
                                                            {contadorRespuestas.total > 0 
                                                                ? Math.round((contadorRespuestas.verde / contadorRespuestas.total) * 100) + '%'
                                                                : '0%'
                                                            }
                                                        </div>
                                                    </div>
                                                    <div className="estadistica-box estadistica-amarillo">
                                                        <div className="estadistica-icono">🟨</div>
                                                        <div className="estadistica-numero">{contadorRespuestas.amarillo}</div>
                                                        <div className="estadistica-etiqueta">Amarillo</div>
                                                        <div className="estadistica-porcentaje">
                                                            {contadorRespuestas.total > 0 
                                                                ? Math.round((contadorRespuestas.amarillo / contadorRespuestas.total) * 100) + '%'
                                                                : '0%'
                                                            }
                                                        </div>
                                                    </div>
                                                    <div className="estadistica-box estadistica-rojo">
                                                        <div className="estadistica-icono">🟥</div>
                                                        <div className="estadistica-numero">{contadorRespuestas.rojo}</div>
                                                        <div className="estadistica-etiqueta">Rojo</div>
                                                        <div className="estadistica-porcentaje">
                                                            {contadorRespuestas.total > 0 
                                                                ? Math.round((contadorRespuestas.rojo / contadorRespuestas.total) * 100) + '%'
                                                                : '0%'
                                                            }
                                                        </div>
                                                    </div>
                                                    <div className="estadistica-box estadistica-blanco">
                                                        <div className="estadistica-icono">⚪</div>
                                                        <div className="estadistica-numero">{contadorRespuestas.blanco}</div>
                                                        <div className="estadistica-etiqueta">Blanco</div>
                                                        <div className="estadistica-porcentaje">
                                                            {contadorRespuestas.total > 0 
                                                                ? Math.round((contadorRespuestas.blanco / contadorRespuestas.total) * 100) + '%'
                                                                : '0%'
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {respuestasAfinidad.length > 0 ? (
                                    <div className="afinidad-respuestas-container">
                                        <details>
                                            <summary className="afinidad-details-summary">
                                                Ver detalles de respuestas de afinidad ({respuestasAfinidad.length})
                                            </summary>
                                            <div className="afinidad-details-content">
                                                <div className="respuestas-table-container">
                                    <table className="respuestas-table">
                                        <thead>
                                            <tr>
                                                <th>Estudiante</th>
                                                <th>Evaluaciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* Agrupar las respuestas por estudiante evaluador */}
                                            {(() => {
                                                // Crear un mapa de estudiante -> evaluaciones
                                                const evaluacionesPorEstudiante = new Map();
                                                
                                                // Agrupar las respuestas por estudiante
                                                respuestasAfinidad.forEach(resp => {
                                                    const estudianteId = resp.estudiante_id;
                                                    if (!evaluacionesPorEstudiante.has(estudianteId)) {
                                                        evaluacionesPorEstudiante.set(estudianteId, []);
                                                    }
                                                    evaluacionesPorEstudiante.get(estudianteId).push(resp);
                                                });
                                                
                                                // Convertir el mapa en un array para renderizar
                                                return Array.from(evaluacionesPorEstudiante).map(([estudianteId, evaluaciones]) => {
                                                    const estudiante = estudiantes.find(est => est.id === estudianteId);
                                                    
                                                    return (
                                                        <tr key={estudianteId}>
                                                            <td>
                                                                <strong>
                                                                    {estudiante ? estudiante.nombre : "Estudiante desconocido"}
                                                                </strong>
                                                            </td>
                                                            <td>
                                                                <details>
                                                                    <summary className="evaluaciones-summary">
                                                                        Ver {evaluaciones.length} evaluación(es)
                                                                    </summary>
                                                                    <div className="evaluaciones-lista">
                                                                        <table className="evaluaciones-subtabla">
                                                                            <thead>
                                                                                <tr>
                                                                                    <th>Evaluó a</th>
                                                                                    <th>Opción seleccionada</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {evaluaciones.map((resp: any) => {
                                                                                    const estudianteEvaluado = estudiantes.find(est => est.id === resp.estudiante_evaluado_id);
                                                                                    
                                                                                    const opcion = respuestasData.opcion_pregunta && Array.isArray(respuestasData.opcion_pregunta) ?
                                                                                        respuestasData.opcion_pregunta.find((op: any) => op.id === resp.opcion_pregunta_id) : null;
                                                                                    
                                                                                    return (
                                                                                        <tr key={resp.id}>
                                                                                            <td>
                                                                                                {estudianteEvaluado ? (
                                                                                                    <strong>{estudianteEvaluado.nombre}</strong>
                                                                                                ) : (
                                                                                                    <span className="estudiante-desconocido">
                                                                                                        Estudiante desconocido
                                                                                                    </span>
                                                                                                )}
                                                                                            </td>
                                                                                            <td>
                                                                                                {opcion && opcion.texto_opcion ? (
                                                                                                    <div className={getOptionClass(opcion.texto_opcion)}>
                                                                                                        {getOptionIcon(opcion.texto_opcion)} {opcion.texto_opcion}
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    <div className="opcion-badge">
                                                                                                        {resp.opcion_pregunta_id ? "Opción seleccionada" : "No disponible"}
                                                                                                    </div>
                                                                                                )}
                                                                                            </td>
                                                                                        </tr>
                                                                                    );
                                                                                })}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </details>
                                                            </td>
                                                        </tr>
                                                    );
                                                });
                                            })()}
                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </details>
                                    </div>
                                ) : (
                                    <div className="no-respuestas-mensaje">
                                        <p>No hay respuestas de afinidad registradas todavía.</p>
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
                                <div>
                                    <span className="student-name">{est.nombre}</span>
                                    <div className="student-code">
                                        Código estudiante: <span className="code-value">{est.codigo_estudiante}</span>
                                    </div>
                                    <EstadoCuestionario 
                                        estudianteId={est.id} 
                                        cuestionarioId={est.cuestionario_id}
                                    />
                                </div>
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