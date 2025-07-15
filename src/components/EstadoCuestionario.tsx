"use client";
import React from "react";
import { useEstudiantes } from "@/context/EstudiantesContext";
import { useRespuestas } from "@/context/RespuestasContext";

interface EstadoCuestionarioProps {
    estudianteId: string;
    cuestionarioId: string | null;
}

export function EstadoCuestionario({ estudianteId, cuestionarioId }: EstadoCuestionarioProps) {
    const { respuestasData, loading } = useRespuestas();
    const { ultimaPreguntaId, loadingUltimaPregunta } = useEstudiantes();
    
    // Si no hay cuestionario asignado, mostramos un mensaje específico
    if (!cuestionarioId) {
        return (
            <div className="estado-cuestionario estado-cuestionario-sin-asignar">
                Sin cuestionario asignado ❗
            </div>
        );
    }
    
    // Mostrar estado de carga
    if (loadingUltimaPregunta || loading) {
        return <span className="estado-cuestionario-verificando">Verificando estado...</span>;
    }
    
    // Si no tenemos el ID de la última pregunta, no podemos verificar
    if (!ultimaPreguntaId) {
        return <span className="estado-cuestionario-error">Error al verificar</span>;
    }
    
    // Verificar si hay al menos una respuesta del estudiante para la última pregunta
    const cuestionarioCompletado = respuestasData?.respuesta?.some((respuesta: any) => 
        respuesta.estudiante_id === estudianteId && 
        respuesta.pregunta_id === ultimaPreguntaId &&
        respuesta.cuestionario_id === cuestionarioId
    ) || false;

    return (
        <div className={`estado-cuestionario ${cuestionarioCompletado ? 'estado-cuestionario-completado' : 'estado-cuestionario-pendiente'}`}>
            {cuestionarioCompletado 
                ? "Cuestionario completado ✅" 
                : "Cuestionario pendiente ⌛"}
        </div>
    );
}
