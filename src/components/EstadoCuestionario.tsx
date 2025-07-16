"use client";
import React from "react";
import { useRespuestas } from "@/context/RespuestasContext";
import { usePreguntasConOpciones } from "@/context/PreguntasConOpcionesContext";

interface EstadoCuestionarioProps {
    estudianteId: string;
    cuestionarioId: string | null;
}

export function EstadoCuestionario({ estudianteId, cuestionarioId }: EstadoCuestionarioProps) {
    const { respuestasData, loading } = useRespuestas();
    const { preguntasData, loading: loadingPreguntas } = usePreguntasConOpciones();
    
    // Obtener el ID de la última pregunta (la de mayor numero_pregunta)
    const ultimaPreguntaId = React.useMemo(() => {
        if (!preguntasData?.pregunta) return null;
        
        const preguntasOrdenadas = [...preguntasData.pregunta].sort((a, b) => b.numero_pregunta - a.numero_pregunta);
        return preguntasOrdenadas[0]?.id || null;
    }, [preguntasData]);
    
    // Si no hay cuestionario asignado, mostramos un mensaje específico
    if (!cuestionarioId) {
        return (
            <div className="estado-cuestionario estado-cuestionario-sin-asignar">
                Sin cuestionario asignado ❗
            </div>
        );
    }
    
    // Mostrar estado de carga
    if (loadingPreguntas || loading) {
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
