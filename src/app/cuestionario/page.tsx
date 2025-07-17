"use client";
import React, { useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useLazyQuery, useMutation } from "@apollo/client";
import Link from "next/link";
import { GET_ESTUDIANTE_BY_CODIGO_QUERY } from "@/graphql/queries";
import { GET_RESPUESTAS_BY_ESTUDIANTE_ID_QUERY } from "@/graphql/queries";
import { UPSERT_RESPUESTA_MUTATION } from "@/graphql/mutations";
import { usePreguntasConOpciones } from "@/context/PreguntasConOpcionesContext";
import { useEstudiantes } from "@/context/EstudiantesContext";

// Hook personalizado para cargar datos iniciales
const useEstudianteData = (codigoEstudiante: string | null) => {
  const [getEstudiante, { data, loading, error }] = useLazyQuery(GET_ESTUDIANTE_BY_CODIGO_QUERY);
  const [getRespuestasEstudiante, { data: dataRespuestasEstudiante }] = useLazyQuery(GET_RESPUESTAS_BY_ESTUDIANTE_ID_QUERY);
  const { estudiantes, setClaseActual, claseActual } = useEstudiantes();

  // Efecto para cargar estudiante inicial
  useEffect(() => {
    if (!codigoEstudiante) return;
    getEstudiante({ variables: { codigo: codigoEstudiante } });
  }, [codigoEstudiante, getEstudiante]);

  // Efecto para cargar estudiantes de la clase y respuestas
  useEffect(() => {
    const estudiante = data?.estudiante?.[0];
    if (!estudiante) return;

    const { clase_id, id: estudianteId } = estudiante;
    
    // Solo llamar setClaseActual si la clase ha cambiado
    if (clase_id && clase_id !== claseActual) {
      setClaseActual(clase_id, estudiante.clase?.identificador || null);
    }
    
    getRespuestasEstudiante({ variables: { estudiante_id: estudianteId } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.estudiante?.[0]?.id, data?.estudiante?.[0]?.clase_id, claseActual]); // Solo dependencias primitivas

  return useMemo(() => ({
    data,
    dataEstudiantes: { estudiante: estudiantes },
    dataRespuestasEstudiante,
    loading,
    error,
    cuestionarioId: data?.estudiante?.[0]?.cuestionario_id || null
  }), [data, estudiantes, dataRespuestasEstudiante, loading, error]);
};

// Hook para procesar el estado del cuestionario
const useCuestionarioState = (
  dataRespuestasEstudiante: any,
  dataEstudiantes: any,
  data: any,
  cuestionarioId: string | null,
  preguntasData: any,
  opcionesPreguntaData: any
) => {
  const [estudiantesPendientes, setEstudiantesPendientes] = React.useState<any[]>([]);
  const [preguntasAdicionalesPendientes, setPreguntasAdicionalesPendientes] = React.useState<number[]>([]);
  const [faseEvaluacionEstudiantesCompletada, setFaseEvaluacionEstudiantesCompletada] = React.useState(false);
  const [preguntasAdicionales, setPreguntasAdicionales] = React.useState<number[]>([]);
  const [finalizado, setFinalizado] = React.useState(false);

  // Funciones helper internas estables
  const getPreguntaAfinidad = React.useCallback(() => {
    if (!preguntasData?.pregunta) return null;
    return (preguntasData.pregunta as Array<{ 
      id: string; 
      texto: string; 
      tipo_pregunta: string; 
      numero_pregunta: number;
    }>).find(p => p.tipo_pregunta === "AFINIDAD_ESTUDIANTE" && p.numero_pregunta === 1) || null;
  }, [preguntasData]);

  const getPreguntasMultipleSeleccion = React.useCallback((numero: number) => {
    if (!preguntasData?.pregunta) return [];
    return (preguntasData.pregunta as Array<{ 
      id: string; 
      tipo_pregunta: string; 
      numero_pregunta: number;
    }>)
      .filter(p => p.tipo_pregunta === "MULTIPLE_SELECCION" && p.numero_pregunta >= numero)
      .sort((a, b) => a.numero_pregunta - b.numero_pregunta);
  }, [preguntasData]);

  // Efecto principal con dependencias estabilizadas
  useEffect(() => {
    if (!dataRespuestasEstudiante || !dataEstudiantes || !preguntasData || !opcionesPreguntaData) {
      return;
    }

    const respuestasExistentes = dataRespuestasEstudiante.respuesta || [];
    const estudianteActual = data?.estudiante?.[0];
    
    if (!estudianteActual) {
      return;
    }

    // Obtener estudiantes del curso
    const todosLosEstudiantes = (dataEstudiantes.estudiante as Array<{ id: string; nombre: string; cuestionario_id: string }>)
      .filter((e) => e.cuestionario_id === cuestionarioId && e.id !== estudianteActual.id);

    // Analizar respuestas de afinidad
    const preguntaAfinidad = getPreguntaAfinidad();
    const estudiantesConRespuesta = new Set();
    
    if (preguntaAfinidad) {
      respuestasExistentes.forEach((respuesta: any) => {
        if (respuesta.pregunta_id === preguntaAfinidad.id && respuesta.estudiante_evaluado_id) {
          estudiantesConRespuesta.add(respuesta.estudiante_evaluado_id);
        }
      });
    }

    const estudiantesSinRespuesta = todosLosEstudiantes.filter(est => !estudiantesConRespuesta.has(est.id));

    // Analizar preguntas adicionales
    const preguntasAdicionalesArray = getPreguntasMultipleSeleccion(5);
    const preguntasAdicionalesRespondidas = new Set();
    
    if (estudiantesSinRespuesta.length === 0) {
      preguntasAdicionalesArray.forEach((pregunta: any) => {
        const tieneRespuesta = respuestasExistentes.some((respuesta: any) => 
          respuesta.pregunta_id === pregunta.id
        );
        if (tieneRespuesta) {
          preguntasAdicionalesRespondidas.add(pregunta.numero_pregunta);
        }
      });
    }

    const preguntasAdicionalesFaltantes = preguntasAdicionalesArray
      .filter((p: any) => !preguntasAdicionalesRespondidas.has(p.numero_pregunta))
      .map((p: any) => p.numero_pregunta);

    // Actualizar estados
    setEstudiantesPendientes(estudiantesSinRespuesta);
    setPreguntasAdicionalesPendientes(preguntasAdicionalesFaltantes);

    // Determinar estado del cuestionario
    if (estudiantesSinRespuesta.length === 0 && preguntasAdicionalesFaltantes.length === 0) {
      const hayNuevosEstudiantesParaPreguntas = todosLosEstudiantes.length > 0;
      
      if (hayNuevosEstudiantesParaPreguntas) {
        setFaseEvaluacionEstudiantesCompletada(true);
        setPreguntasAdicionales(preguntasAdicionalesArray.map(p => p.numero_pregunta));
      } else {
        setFinalizado(true);
      }
    } else if (estudiantesSinRespuesta.length === 0 && preguntasAdicionalesFaltantes.length > 0) {
      setFaseEvaluacionEstudiantesCompletada(true);
      setPreguntasAdicionales(preguntasAdicionalesFaltantes);
    } else {
      setFaseEvaluacionEstudiantesCompletada(false);
    }
  }, [
    dataRespuestasEstudiante,
    dataEstudiantes,
    data?.estudiante?.[0]?.id,
    cuestionarioId,
    preguntasData,
    opcionesPreguntaData
    // Excluimos getPreguntaAfinidad y getPreguntasMultipleSeleccion para evitar dependencias circulares
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]);

  return useMemo(() => ({
    estudiantesPendientes,
    preguntasAdicionalesPendientes,
    faseEvaluacionEstudiantesCompletada,
    setFaseEvaluacionEstudiantesCompletada,
    preguntasAdicionales,
    setPreguntasAdicionales,
    finalizado,
    setFinalizado
  }), [
    estudiantesPendientes,
    preguntasAdicionalesPendientes,
    faseEvaluacionEstudiantesCompletada,
    preguntasAdicionales,
    finalizado
  ]);
};

const CuestionarioEstudiante = React.memo(() => {
  // Sistema de monitoreo de renders ligero
  const renderCountRef = React.useRef(0);
  renderCountRef.current++;
  
  // Solo log en development y si hay renders excesivos
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development' && renderCountRef.current > 10) {
      console.warn(`⚠️ Renders excesivos detectados: #${renderCountRef.current}`);
    }
  });

  const [indiceEstudiante, setIndiceEstudiante] = React.useState(0);
  const [mostrarPreguntas, setMostrarPreguntas] = React.useState(false);
  const [indicePreguntaActual, setIndicePreguntaActual] = React.useState(0);
  
  // Estados para interacciones del usuario
  const [opcionesSeleccionadas, setOpcionesSeleccionadas] = React.useState<{ [estudianteId: string]: string }>({});
  const [checkboxesSeleccionados, setCheckboxesSeleccionados] = React.useState<{ [key: string]: string[] }>({});
  const [otroMotivoText, setOtroMotivoText] = React.useState<{ [key: string]: string }>({});
  const [estudiantesSeleccionados, setEstudiantesSeleccionados] = React.useState<{ [key: string]: string[] }>({});
  const [errorSeleccion, setErrorSeleccion] = React.useState<string>("");
  
  const searchParams = useSearchParams();
  const codigoEstudiante = useMemo(() => {
    return searchParams.get("codigo_estudiante");
  }, [searchParams]);

  // Context de preguntas con memoización
  const preguntasContext = usePreguntasConOpciones();
  const { 
    preguntasData, 
    opcionesPreguntaData, 
    loading: loadingPreguntas, 
    error: errorPreguntas,
    getPreguntaPorTipoYNumero,
    getOpcionesPorPreguntaId,
    getPreguntaAfinidad,
    getPreguntasMultipleSeleccion
  } = preguntasContext;

  // Hook personalizado para datos del estudiante con memoización
  const estudianteData = useEstudianteData(codigoEstudiante);
  const {
    data,
    dataEstudiantes,
    dataRespuestasEstudiante,
    loading,
    error,
    cuestionarioId
  } = estudianteData;

  // Hook personalizado para estado del cuestionario con memoización
  const cuestionarioState = useCuestionarioState(
    dataRespuestasEstudiante,
    dataEstudiantes,
    data,
    cuestionarioId,
    preguntasData,
    opcionesPreguntaData
  );
  const {
    estudiantesPendientes,
    preguntasAdicionalesPendientes,
    faseEvaluacionEstudiantesCompletada,
    setFaseEvaluacionEstudiantesCompletada,
    preguntasAdicionales,
    setPreguntasAdicionales,
    finalizado,
    setFinalizado
  } = cuestionarioState;

  // Datos derivados memorizados con dependencias específicas
  const nombreEstudiante = useMemo(() => {
    return data?.estudiante?.[0]?.nombre || "";
  }, [data?.estudiante?.[0]?.nombre]);

  const identificadorClase = useMemo(() => {
    return data?.estudiante?.[0]?.clase?.identificador || "";
  }, [data?.estudiante?.[0]?.clase?.identificador]);

  // Mutación para respuestas
  const [upsertRespuesta] = useMutation(UPSERT_RESPUESTA_MUTATION);

  // Función optimizada para transición a preguntas adicionales
  const transicionarAPreguntasAdicionales = useCallback(() => {
    setFaseEvaluacionEstudiantesCompletada(true);
    
    if (preguntasAdicionalesPendientes.length > 0) {
      setPreguntasAdicionales(preguntasAdicionalesPendientes);
    } else {
      // Usar función interna en lugar del contexto
      const preguntasAdicionalesArray = preguntasData?.pregunta ? 
        (preguntasData.pregunta as Array<{ 
          id: string; 
          tipo_pregunta: string; 
          numero_pregunta: number;
        }>)
          .filter(p => p.tipo_pregunta === "MULTIPLE_SELECCION" && p.numero_pregunta >= 5)
          .sort((a, b) => a.numero_pregunta - b.numero_pregunta) : [];
      
      if (preguntasAdicionalesArray.length > 0) {
        setPreguntasAdicionales(preguntasAdicionalesArray.map(p => p.numero_pregunta));
      } else {
        setFinalizado(true);
        return;
      }
    }
    setIndicePreguntaActual(0);
  }, [preguntasAdicionalesPendientes, preguntasData]);

  // Handler optimizado para siguiente (guarda respuesta antes de avanzar)
  const handleSiguiente = useCallback(async (estudiantesFiltrados: any[]) => {
    // Buscar datos necesarios
    if (!data || !data.estudiante || !preguntasData || !preguntasData.pregunta || !opcionesPreguntaData || !opcionesPreguntaData.opcion_pregunta) {
      // Si falta data, solo avanzar
      if (indiceEstudiante >= estudiantesFiltrados.length - 1) {
        transicionarAPreguntasAdicionales();
      } else {
        setIndiceEstudiante((prev) => prev + 1);
      }
      return;
    }
    const estudianteQueResponde = data.estudiante[0];
    const estudianteActual = estudiantesFiltrados[indiceEstudiante];
    
    // Pregunta de afinidad - función interna en lugar del contexto
    const pregunta = preguntasData?.pregunta ? 
      (preguntasData.pregunta as Array<{ 
        id: string; 
        texto: string; 
        tipo_pregunta: string; 
        numero_pregunta: number;
      }>).find(p => p.tipo_pregunta === "AFINIDAD_ESTUDIANTE" && p.numero_pregunta === 1) || null : null;
    if (!pregunta) {
      if (indiceEstudiante >= estudiantesFiltrados.length - 1) {
        transicionarAPreguntasAdicionales();
      } else {
        setIndiceEstudiante((prev) => prev + 1);
      }
      return;
    }
    // Opción seleccionada
    const opcionSeleccionadaId = opcionesSeleccionadas[estudianteActual.id];
    if (!opcionSeleccionadaId) {
      setErrorSeleccion("Debes seleccionar una opción para continuar.");
      return;
    }
    setErrorSeleccion("");
    const opcionSeleccionada = (opcionesPreguntaData.opcion_pregunta as Array<{ id: string; texto_opcion: string }> ).find(
      (op) => op.id === opcionSeleccionadaId
    );
    const valorRespuesta = opcionSeleccionada ? opcionSeleccionada.texto_opcion : ""; // Mantener para la lógica condicional
    // Ejecutar mutación para la opción principal
    if (opcionSeleccionadaId) {
      try {
        await upsertRespuesta({
          variables: {
            cuestionario_id: cuestionarioId,
            estudiante_id: estudianteQueResponde.id,
            pregunta_id: pregunta.id,
            estudiante_evaluado_id: estudianteActual.id,
            opcion_pregunta_id: opcionSeleccionadaId,
            otro_texto: null, // No hay texto adicional para la pregunta principal
          },
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Error guardando respuesta principal", e);
      }
    }

    // Guardar respuestas de checkboxes si hay pregunta extra
    let preguntaExtra: any = null;
    if (/verde/i.test(valorRespuesta)) {
      preguntaExtra = preguntasData?.pregunta ? 
        (preguntasData.pregunta as Array<{ 
          id: string; 
          texto: string; 
          tipo_pregunta: string; 
          numero_pregunta: number;
        }>).find(p => p.tipo_pregunta === "MULTIPLE_SELECCION" && p.numero_pregunta === 2) || null : null;
    } else if (/amarillo/i.test(valorRespuesta)) {
      preguntaExtra = preguntasData?.pregunta ? 
        (preguntasData.pregunta as Array<{ 
          id: string; 
          texto: string; 
          tipo_pregunta: string; 
          numero_pregunta: number;
        }>).find(p => p.tipo_pregunta === "MULTIPLE_SELECCION" && p.numero_pregunta === 3) || null : null;
    } else if (/rojo/i.test(valorRespuesta)) {
      preguntaExtra = preguntasData?.pregunta ? 
        (preguntasData.pregunta as Array<{ 
          id: string; 
          texto: string; 
          tipo_pregunta: string; 
          numero_pregunta: number;
        }>).find(p => p.tipo_pregunta === "MULTIPLE_SELECCION" && p.numero_pregunta === 4) || null : null;
    }
    if (preguntaExtra) {
      const key = `${estudianteActual.id}_${preguntaExtra.texto}`;
      const seleccionados = checkboxesSeleccionados[key] || [];
      
      // Función interna para obtener opciones por pregunta ID
      const opcionesExtra = opcionesPreguntaData?.opcion_pregunta ? 
        (opcionesPreguntaData.opcion_pregunta as Array<{ 
          id: string; 
          texto_opcion: string; 
          pregunta_id: string;
        }>).filter(op => op.pregunta_id === preguntaExtra.id) : [];
      
      // Validar que si "Otro motivo" está seleccionado, el campo no esté vacío
      let errorOtroMotivo = false;
      const respuestasCheckbox: string[] = [];
      for (const opId of seleccionados) {
        const opcion = opcionesExtra.find((o) => o.id === opId);
        if (!opcion) continue;
        let valor = opcion.texto_opcion;
        if (/otro motivo/i.test(opcion.texto_opcion)) {
          valor = otroMotivoText[key]?.trim() || "";
          if (!valor) {
            errorOtroMotivo = true;
          }
        }
        respuestasCheckbox.push(valor);
      }
      if (errorOtroMotivo) {
        setErrorSeleccion("Debes especificar el motivo si seleccionas 'Otro motivo'.");
        return;
      }
      // Si pasa la validación, guardar todas las respuestas una a una (no en paralelo, sin duplicados, usando upsert)
      try {
        // Función interna para obtener opciones por pregunta ID
        const opcionesExtraCompletas = opcionesPreguntaData?.opcion_pregunta ? 
          (opcionesPreguntaData.opcion_pregunta as Array<{ 
            id: string; 
            texto_opcion: string; 
            pregunta_id: string;
          }>).filter(op => op.pregunta_id === preguntaExtra.id) : [];
        
        for (const opId of seleccionados) {
          // Buscar la opción por su ID
          const opcion = opcionesExtraCompletas.find(o => o.id === opId);
          if (!opcion) continue;
          
          // Para "Otro motivo", guardar el texto adicional
          let otroTexto = null;
          if (/otro motivo/i.test(opcion.texto_opcion)) {
            // Obtener el texto, pero permitir que sea null si está vacío
            const textoIngresado = otroMotivoText[key]?.trim();
            // Si no tiene texto, saltar esta opción
            if (!textoIngresado) {
              continue;
            }
            otroTexto = textoIngresado; // Solo asignar si hay texto
          }
          
          await upsertRespuesta({
            variables: {
              cuestionario_id: cuestionarioId,
              estudiante_id: estudianteQueResponde.id,
              pregunta_id: preguntaExtra.id,
              estudiante_evaluado_id: estudianteActual.id,
              opcion_pregunta_id: opId,
              otro_texto: otroTexto,
            },
          });
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Error guardando respuestas checkbox", e);
      }
    }
    
    // Verificar si se han procesado todos los estudiantes
    if (indiceEstudiante >= estudiantesFiltrados.length - 1) {
      transicionarAPreguntasAdicionales();
    } else {
      setIndiceEstudiante((prev) => prev + 1);
    }
  }, [
    data?.estudiante?.[0]?.id,
    indiceEstudiante,
    cuestionarioId,
    opcionesSeleccionadas,
    checkboxesSeleccionados,
    otroMotivoText,
    transicionarAPreguntasAdicionales,
    preguntasData,
    opcionesPreguntaData
  ]);
  const handleVolverInicio = () => {
    window.location.href = "/";
  };

  // Método optimizado para manejar las preguntas adicionales
  const handleSiguientePreguntaAdicional = useCallback(async () => {
    if (!data?.estudiante?.[0] || !preguntasData?.pregunta || !cuestionarioId || !dataEstudiantes?.estudiante) return;
    
    const estudianteQueResponde = data.estudiante[0];
    const numeroPreguntaActual = preguntasAdicionales[indicePreguntaActual];
    
    // Buscar la pregunta actual - función interna
    const preguntaActual = preguntasData?.pregunta ? 
      (preguntasData.pregunta as Array<{ 
        id: string; 
        texto: string; 
        tipo_pregunta: string; 
        numero_pregunta: number;
      }>).find(p => p.tipo_pregunta === "MULTIPLE_SELECCION" && p.numero_pregunta === numeroPreguntaActual) || null : null;
    
    if (!preguntaActual) {
      // Si no se encuentra la pregunta, avanzar a la siguiente
      if (indicePreguntaActual < preguntasAdicionales.length - 1) {
        setIndicePreguntaActual(prev => prev + 1);
      } else {
        setFinalizado(true);
      }
      return;
    }
    
    // Clave única para esta pregunta adicional
    const key = `adicional_${preguntaActual.id}`;
    
    // Estudiantes seleccionados para esta pregunta
    const estudiantesSeleccionadosParaPregunta = estudiantesSeleccionados[key] || [];
    
    setErrorSeleccion("");
    
    // Obtener los estudiantes relacionados con las selecciones
    const estudiantesDelCurso = (dataEstudiantes.estudiante as Array<{ id: string; nombre: string; cuestionario_id: string }> )
      .filter((e) => e.cuestionario_id === cuestionarioId && e.id !== estudianteQueResponde.id);
    
    try {
      // Guardar una respuesta por cada estudiante seleccionado (solo los nuevos)
      for (const estudianteId of estudiantesSeleccionadosParaPregunta) {
        // Verificar si este estudiante ya fue seleccionado previamente
        const yaSeleccionado = dataRespuestasEstudiante?.respuesta?.some((respuesta: any) => 
          respuesta.estudiante_id === estudianteQueResponde.id &&
          respuesta.estudiante_evaluado_id === estudianteId &&
          respuesta.pregunta_id === preguntaActual.id &&
          respuesta.cuestionario_id === cuestionarioId
        );
        
        // Solo guardar si no fue seleccionado previamente
        if (yaSeleccionado) {
          console.log(`Estudiante ${estudianteId} ya fue seleccionado previamente para la pregunta ${preguntaActual.id}`);
          continue;
        }
        
        // Encontrar el estudiante seleccionado
        const estudianteSeleccionado = estudiantesDelCurso.find(e => e.id === estudianteId);
        if (!estudianteSeleccionado) continue;
        
        console.log(`Guardando nueva respuesta para estudiante ${estudianteId} en pregunta ${preguntaActual.id}`);
        
        // Guardar respuesta con el estudiante evaluado
        await upsertRespuesta({
          variables: {
            cuestionario_id: cuestionarioId,
            estudiante_id: estudianteQueResponde.id,
            pregunta_id: preguntaActual.id,
            estudiante_evaluado_id: estudianteId,
            opcion_pregunta_id: null, // Valor nulo según los nuevos requisitos ya que la respuesta es un estudiante
            otro_texto: null, // No hay texto adicional para estas preguntas
          },
        });
      }
      
      // Avanzar a la siguiente pregunta o finalizar
      if (indicePreguntaActual < preguntasAdicionales.length - 1) {
        setIndicePreguntaActual(prev => prev + 1);
      } else {
        // Verificar si hay más estudiantes que evaluar en futuras sesiones
        const todosLosEstudiantesDelCurso = (dataEstudiantes.estudiante as Array<{ id: string; nombre: string; cuestionario_id: string }>)
          .filter((e) => e.cuestionario_id === cuestionarioId && e.id !== estudianteQueResponde.id);
        
        // Si ya no hay más preguntas adicionales que mostrar, finalizar
        setFinalizado(true);
      }
      
    } catch (e) {
      console.error("Error guardando respuestas de pregunta adicional", e);
    }
  }, [
    data?.estudiante?.[0]?.id,
    preguntasData,
    cuestionarioId,
    dataEstudiantes,
    preguntasAdicionales,
    indicePreguntaActual,
    estudiantesSeleccionados,
    dataRespuestasEstudiante,
    upsertRespuesta
  ]);
  return (
    <>
      {/* Panel estudiante y clase siempre visible */}
      {nombreEstudiante && (
        <div className="panel-estudiante-title">
          <div>Estudiante: {nombreEstudiante}</div>
          {identificadorClase && (
            <div className="panel-clase-id">
              Clase: {identificadorClase}
            </div>
          )}
        </div>
      )}
      {!mostrarPreguntas && !finalizado && (
        <>
          <div className="panel-container">
            {loading && <p>Cargando estudiante...</p>}
            {error && <p>Error al cargar el estudiante</p>}
            <h2 className="panel-form-title">Instrucciones</h2>
            <div style={{ marginTop: 12 }}>
              <p style={{ marginBottom: 12 }}>✅ La información es confidencial y solo será leída por tu referente. Nadie más tendrá acceso a las respuestas.</p>
              <p style={{ marginBottom: 12 }}>🎯 El objetivo es armar grupos de trabajo donde todos se sientan cómodos, puedan colaborar, aprender y participar.</p>
              <p style={{ marginBottom: 12 }}>✋ No estamos preguntando si te llevás bien o mal con alguien, ni si son amigos. Podés ser muy amigo/a de alguien y que al momento de trabajar no se entiendan, o no ser cercanos y funcionar muy bien juntos.</p>
              <p style={{ marginBottom: 12 }}>Por eso, respondé según tu experiencia real al trabajar en grupo, más allá de lo personal.</p>
              <p style={{ marginBottom: 12 }}>Vas a ver una lista con los nombres de tus compañeros/as. Para cada uno, elegí el color que mejor represente tu experiencia real al trabajar con esa persona en grupo.</p>
              <p style={{ marginBottom: 12 }}>✋ Importante: Esto no trata de si te llevás bien o mal, ni si son amigos o amigas. Podés ser muy amigo/a de alguien pero que al trabajar juntos no funcione, o no tener relación fuera del aula y trabajar excelente.</p>
              <h2 className="panel-form-title" style={{ marginTop: 24 }}>CÓMO COMPLETAR LA ENCUESTA</h2>
              <p style={{ marginBottom: 12 }}>✅ Usá estos colores y leé bien lo que significa cada uno:</p>
              <p style={{ marginBottom: 12 }}>🟩 <b>VERDE</b> – Me gusta trabajar con esta persona</p>
              <p style={{ marginBottom: 12 }}>👉 Esta persona participa, escucha, propone ideas, cumple con las tareas, ayuda a otros y respeta los tiempos y espacios del grupo. Con ella el trabajo fluye, se avanza, y es más fácil ponerse de acuerdo. Te sentís cómodo/a, incluido/a, y hay respeto.</p>
              <p style={{ marginBottom: 12 }}>🟨 <b>AMARILLO</b> – A veces sí, a veces no</p>
              <p style={{ marginBottom: 12 }}>👉 Hay días o tareas en las que trabajar con esta persona funciona bien, pero otras veces se distrae, interrumpe o no cumple. Tal vez se pone las pilas si el grupo lo motiva, pero también puede hablar más de lo que trabaja, o dejar las cosas a medias. A veces te resulta fácil, otras veces, frustrante.</p>
              <p style={{ marginBottom: 12 }}>🟥 <b>ROJO</b> – Me resulta muy difícil trabajar con esta persona</p>
              <p style={{ marginBottom: 12 }}>👉 Esta persona interrumpe, se queja sin ayudar, no cumple con las tareas, o incluso maltrata, critica sin aportar o ignora al grupo. Puede generar conflictos, desconcentración o tensión. Sentís que trabajar con ella te hace más difícil aprender o avanzar.</p>
              <p style={{ marginBottom: 12 }}>⚪ <b>BLANCO</b> – No tengo suficientes experiencias de trabajo con esta persona</p>
              <p style={{ marginBottom: 12 }}>👉 No trabajaste con esta persona en ningún grupo, o fue tan poco que no podés opinar con certeza. Tal vez te llevás bien o mal, pero no tuviste experiencia real trabajando juntos/as.</p>
              <p style={{ marginBottom: 12 }}>🧠 Elegí una opción por cada compañero/a según cómo fue trabajar juntos/as en actividades reales. No hay respuestas correctas o incorrectas. Tus respuestas nos ayudan a pensar grupos más justos, cómodos y donde todos y todas puedan participar mejor.</p>
            </div>
            {/* Línea agregada antes del botón */}
            <hr className="cuestionario-separador" />
            <div className="cuestionario-centrar-boton">
              <button className="panel-btn" onClick={() => setMostrarPreguntas(true)}>
                Continuar
              </button>
            </div>
          </div>
        </>
      )}
      {mostrarPreguntas && !finalizado && !faseEvaluacionEstudiantesCompletada && (
        <div className="panel-container">
          {preguntasData && preguntasData.pregunta ? (() => {
            // Función interna para obtener pregunta de afinidad
            const pregunta = (preguntasData.pregunta as Array<{ 
              id: string; 
              texto: string; 
              tipo_pregunta: string; 
              numero_pregunta: number;
            }>).find(p => p.tipo_pregunta === "AFINIDAD_ESTUDIANTE" && p.numero_pregunta === 1) || null;
            
            return pregunta ? (
              <p className="cuestionario-pregunta-texto">{pregunta.texto}</p>
            ) : null;
          })() : null}
          {/* Mostrar un estudiante a la vez con botón siguiente */}
          {dataEstudiantes && dataEstudiantes.estudiante && preguntasData && preguntasData.pregunta && opcionesPreguntaData && opcionesPreguntaData.opcion_pregunta ? (() => {
            // Usar estudiantes pendientes en lugar de todos los estudiantes
            const estudiantesFiltrados = estudiantesPendientes.length > 0 ? estudiantesPendientes : 
              (dataEstudiantes.estudiante as Array<{ id: string; nombre: string; cuestionario_id: string }> )
                .filter((e) => e.cuestionario_id === cuestionarioId && e.id !== (data?.estudiante?.[0]?.id));
            
            if (estudiantesFiltrados.length === 0) {
              return <p style={{ textAlign: 'center', marginTop: 24 }}>No hay estudiantes pendientes para evaluar.</p>;
            }
            // Si ya se finalizó, no mostrar nada aquí
            if (indiceEstudiante >= estudiantesFiltrados.length) return null;
            const estudianteActual = estudiantesFiltrados[indiceEstudiante];
            
            // Buscar la pregunta de afinidad - función interna
            const pregunta = preguntasData?.pregunta ? 
              (preguntasData.pregunta as Array<{ 
                id: string; 
                texto: string; 
                tipo_pregunta: string; 
                numero_pregunta: number;
              }>).find(p => p.tipo_pregunta === "AFINIDAD_ESTUDIANTE" && p.numero_pregunta === 1) || null : null;
            
            // Opciones para la pregunta - función interna
            const opciones = pregunta && opcionesPreguntaData?.opcion_pregunta ? 
              (opcionesPreguntaData.opcion_pregunta as Array<{ 
                id: string; 
                texto_opcion: string; 
                pregunta_id: string;
              }>).filter(op => op.pregunta_id === pregunta.id) : [];
            // Función para obtener icono (ya no necesitamos getOptionStyle porque usamos clases CSS)
            const getOptionIcon = (texto: string) => {
              if (/verde/i.test(texto)) return '🟩';
              if (/amarillo/i.test(texto)) return '🟨';
              if (/rojo/i.test(texto)) return '🟥';
              if (/blanco/i.test(texto)) return '⚪';
              return '';
            };

            // Determinar la opción seleccionada para este estudiante
            const opcionSeleccionada = opcionesSeleccionadas[estudianteActual.id] || "";
            const textoSeleccionado = opciones.find((op) => op.id === opcionSeleccionada)?.texto_opcion || "";

            // Determinar la pregunta a mostrar según la opción seleccionada
            let preguntaExtra: { texto: string; id: string } | null = null;
            if (/verde/i.test(textoSeleccionado)) {
              preguntaExtra = preguntasData?.pregunta ? 
                (preguntasData.pregunta as Array<{ 
                  id: string; 
                  texto: string; 
                  tipo_pregunta: string; 
                  numero_pregunta: number;
                }>).find(p => p.tipo_pregunta === "MULTIPLE_SELECCION" && p.numero_pregunta === 2) || null : null;
            } else if (/amarillo/i.test(textoSeleccionado)) {
              preguntaExtra = preguntasData?.pregunta ? 
                (preguntasData.pregunta as Array<{ 
                  id: string; 
                  texto: string; 
                  tipo_pregunta: string; 
                  numero_pregunta: number;
                }>).find(p => p.tipo_pregunta === "MULTIPLE_SELECCION" && p.numero_pregunta === 3) || null : null;
            } else if (/rojo/i.test(textoSeleccionado)) {
              preguntaExtra = preguntasData?.pregunta ? 
                (preguntasData.pregunta as Array<{ 
                  id: string; 
                  texto: string; 
                  tipo_pregunta: string; 
                  numero_pregunta: number;
                }>).find(p => p.tipo_pregunta === "MULTIPLE_SELECCION" && p.numero_pregunta === 4) || null : null;
            }

            return (
              <div className="cuestionario-centro">
                <div className="cuestionario-nombre-estudiante">
                  {estudianteActual.nombre}
                </div>
                {/* Selector de opciones debajo del nombre */}
                <div className="cuestionario-opciones-container">
                  <select
                    className="cuestionario-select"
                    value={opcionSeleccionada}
                    onChange={e => setOpcionesSeleccionadas(prev => ({ ...prev, [estudianteActual.id]: e.target.value }))}
                  >
                    <option value="">Selecciona una opción</option>
                    {opciones.map((op) => (
                      <option 
                        key={op.id} 
                        value={op.id} 
                        className={
                          /verde/i.test(op.texto_opcion) ? 'opcion-verde' : 
                          /amarillo/i.test(op.texto_opcion) ? 'opcion-amarillo' : 
                          /rojo/i.test(op.texto_opcion) ? 'opcion-rojo' : 
                          /blanco/i.test(op.texto_opcion) ? 'opcion-blanco' : ''
                        }
                      >
                        {getOptionIcon(op.texto_opcion)} {op.texto_opcion}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Pregunta extra según selección */}
                {preguntaExtra && (
                  <div className="cuestionario-pregunta-extra">
                    {preguntaExtra.texto}
                    {/* Lista de checkboxes para las opciones de la pregunta extra */}
                    {opcionesPreguntaData && opcionesPreguntaData.opcion_pregunta ? (() => {
                      // Función interna para obtener opciones por pregunta ID
                      const opcionesExtra = (opcionesPreguntaData.opcion_pregunta as Array<{ 
                        id: string; 
                        texto_opcion: string; 
                        pregunta_id: string;
                      }>).filter(op => op.pregunta_id === (preguntaExtra as any).id);
                      
                      // Clave única por estudiante y pregunta extra
                      const key = `${estudianteActual.id}_${preguntaExtra?.texto}`;
                      const seleccionados = checkboxesSeleccionados[key] || [];
                      const handleCheckboxChange = (opId: string) => {
                        setCheckboxesSeleccionados(prev => {
                          const actual = prev[key] || [];
                          if (actual.includes(opId)) {
                            return { ...prev, [key]: actual.filter(id => id !== opId) };
                          } else {
                            return { ...prev, [key]: [...actual, opId] };
                          }
                        });
                      };
                      const handleOtroMotivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                        setOtroMotivoText(prev => ({ ...prev, [key]: e.target.value }));
                      };
                      return (
                        <div className="cuestionario-opciones-extra">
                          {opcionesExtra.map((op) => {
                            const esOtroMotivo = /otro motivo/i.test(op.texto_opcion);
                            return (
                              <div key={op.id} className="cuestionario-opcion-item">
                                <label className="cuestionario-opcion-label">
                                  <input
                                    type="checkbox"
                                    className="cuestionario-checkbox"
                                    checked={seleccionados.includes(op.id)}
                                    onChange={() => handleCheckboxChange(op.id)}
                                  />
                                  {op.texto_opcion}
                                </label>
                                {esOtroMotivo && seleccionados.includes(op.id) && (
                                  <input
                                    type="text"
                                    placeholder="Especifica el motivo..."
                                    value={otroMotivoText[key] || ''}
                                    onChange={handleOtroMotivoChange}
                                    className="cuestionario-otro-motivo"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })() : null}
                  </div>
                )}
                {errorSeleccion && (
                  <div className="cuestionario-error">{errorSeleccion}</div>
                )}
                <button
                  className="panel-btn cuestionario-btn"
                  onClick={() => handleSiguiente(estudiantesFiltrados)}
                >
                  {indiceEstudiante >= estudiantesFiltrados.length - 1 ? 'Continuar' : 'Siguiente'}
                </button>
                <div className="cuestionario-contador">
                  {indiceEstudiante + 1} de {estudiantesFiltrados.length}
                </div>
              </div>
            );
          })() : null}
        </div>
      )}
      
      {/* Sección para mostrar las preguntas adicionales */}
      {mostrarPreguntas && !finalizado && faseEvaluacionEstudiantesCompletada && preguntasAdicionales.length > 0 && (
        <div className="panel-container">
          {preguntasData && preguntasData.pregunta && dataEstudiantes && dataEstudiantes.estudiante ? (() => {
            const numeroPreguntaActual = preguntasAdicionales[indicePreguntaActual];
            
            // Buscar la pregunta actual - función interna
            const preguntaActual = (preguntasData.pregunta as Array<{ 
              id: string; 
              texto: string; 
              tipo_pregunta: string; 
              numero_pregunta: number;
            }>).find(p => p.tipo_pregunta === "MULTIPLE_SELECCION" && p.numero_pregunta === numeroPreguntaActual) || null;
            
            if (!preguntaActual) return null;
            
            // Obtener los estudiantes del curso (excluyendo al estudiante que responde)
            const estudiantesDelCurso = (dataEstudiantes.estudiante as Array<{ id: string; nombre: string; cuestionario_id: string }> )
              .filter((e) => e.cuestionario_id === cuestionarioId && e.id !== (data?.estudiante?.[0]?.id));
            
            // Ordenar estudiantes por nombre para mejor visualización
            estudiantesDelCurso.sort((a, b) => a.nombre.localeCompare(b.nombre));
            
            // Clave única para esta pregunta adicional
            const key = `adicional_${preguntaActual.id}`;
            const estudiantesSeleccionadosParaPregunta = estudiantesSeleccionados[key] || [];
            
            const handleEstudianteCheckboxChange = (estudianteId: string) => {
              // Verificar si este estudiante ya fue seleccionado previamente
              const yaSeleccionado = dataRespuestasEstudiante?.respuesta?.some((respuesta: any) => 
                respuesta.estudiante_id === data?.estudiante?.[0]?.id &&
                respuesta.estudiante_evaluado_id === estudianteId &&
                respuesta.pregunta_id === preguntaActual.id &&
                respuesta.cuestionario_id === cuestionarioId
              );
              
              // No permitir cambios si ya fue seleccionado previamente
              if (yaSeleccionado) {
                return;
              }
              
              setEstudiantesSeleccionados(prev => {
                const actual = prev[key] || [];
                if (actual.includes(estudianteId)) {
                  return { ...prev, [key]: actual.filter(id => id !== estudianteId) };
                } else {
                  return { ...prev, [key]: [...actual, estudianteId] };
                }
              });
            };
            
            return (
              <div className="cuestionario-centro">
                <div className="cuestionario-pregunta-titulo">
                  {preguntaActual.texto}
                </div>
                
                {/* Lista de estudiantes como checkboxes */}
                <div className="cuestionario-estudiantes-lista">
                  <p className="cuestionario-instruccion">Selecciona a los compañeros que cumplen con esta característica:</p>
                  
                  <div className="cuestionario-estudiantes-container">
                    {estudiantesDelCurso.length === 0 ? (
                      <p>No hay estudiantes disponibles para seleccionar.</p>
                    ) : (
                      estudiantesDelCurso.map((estudiante) => {
                        // Verificar si este estudiante ya fue seleccionado previamente
                        const yaSeleccionado = dataRespuestasEstudiante?.respuesta?.some((respuesta: any) => 
                          respuesta.estudiante_id === data?.estudiante?.[0]?.id &&
                          respuesta.estudiante_evaluado_id === estudiante.id &&
                          respuesta.pregunta_id === preguntaActual.id &&
                          respuesta.cuestionario_id === cuestionarioId
                        );
                        
                        const estaSeleccionadoAhora = estudiantesSeleccionadosParaPregunta.includes(estudiante.id);
                        const estaChecked = yaSeleccionado || estaSeleccionadoAhora;
                        
                        return (
                          <div key={estudiante.id} className="cuestionario-estudiante-item">
                            <input
                              type="checkbox"
                              id={`estudiante-${estudiante.id}-${key}`}
                              checked={estaChecked}
                              onChange={() => handleEstudianteCheckboxChange(estudiante.id)}
                              disabled={yaSeleccionado}
                              className={`cuestionario-estudiante-checkbox ${yaSeleccionado ? 'disabled' : ''}`}
                            />
                            <label 
                              htmlFor={`estudiante-${estudiante.id}-${key}`} 
                              className={`cuestionario-estudiante-label ${yaSeleccionado ? 'disabled' : ''}`}
                            >
                              {estudiante.nombre}
                              {yaSeleccionado && <span className="ya-seleccionado"> (ya seleccionado previamente)</span>}
                            </label>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
                
                {errorSeleccion && (
                  <div className="cuestionario-error">{errorSeleccion}</div>
                )}
                
                <button
                  className="panel-btn cuestionario-btn"
                  onClick={handleSiguientePreguntaAdicional}
                >
                  {indicePreguntaActual >= preguntasAdicionales.length - 1 ? 'Finalizar' : 'Siguiente'}
                </button>
                
                <div className="cuestionario-contador">
                  Pregunta {indicePreguntaActual + 1} de {preguntasAdicionales.length}
                </div>
              </div>
            );
          })() : null}
        </div>
      )}
      {finalizado && (
        <div className="panel-container cuestionario-finalizado">
          <h2 className="cuestionario-titulo-finalizado">¡Has completado el cuestionario!</h2>
          <p className="cuestionario-mensaje-finalizado">Gracias por tu participación. Tus respuestas nos ayudarán a crear mejores grupos de trabajo.</p>
          <button className="panel-btn cuestionario-boton-finalizado" onClick={handleVolverInicio}>
            Volver al inicio
          </button>
        </div>
      )}
      {!finalizado && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link href="/" className="login-link">
            Regresar al inicio
          </Link>
        </div>
      )}
    </>
  );
});

export default CuestionarioEstudiante;
