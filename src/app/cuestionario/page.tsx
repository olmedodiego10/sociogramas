"use client";
import React, { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useLazyQuery, useMutation } from "@apollo/client";
import { GET_ESTUDIANTE_BY_CODIGO_QUERY } from "@/graphql/queries";
import { GET_ESTUDIANTES_QUERY } from "@/graphql/queries";
import { GET_RESPUESTAS_BY_ESTUDIANTE_ID_QUERY } from "@/graphql/queries";
import { UPSERT_RESPUESTA_MUTATION } from "@/graphql/mutations";
import { usePreguntasConOpciones } from "@/context/PreguntasConOpcionesContext";

export default function CuestionarioEstudiante() {
  const [indiceEstudiante, setIndiceEstudiante] = React.useState(0);
  const [mostrarPreguntas, setMostrarPreguntas] = React.useState(false);
  const [cuestionarioId, setCuestionarioId] = React.useState(null);
  // Estado para la opción seleccionada por estudiante
  const [opcionesSeleccionadas, setOpcionesSeleccionadas] = React.useState<{ [estudianteId: string]: string }>({});
  // Estado para checkboxes seleccionados por estudiante y pregunta extra
  const [checkboxesSeleccionados, setCheckboxesSeleccionados] = React.useState<{ [key: string]: string[] }>({});
  // Estado para texto de "Otro motivo" por estudiante y pregunta extra
  const [otroMotivoText, setOtroMotivoText] = React.useState<{ [key: string]: string }>({});
  // Estado para controlar etapas del cuestionario
  const [faseEvaluacionEstudiantesCompletada, setFaseEvaluacionEstudiantesCompletada] = React.useState(false);
  const [preguntasAdicionales, setPreguntasAdicionales] = React.useState<number[]>([]);
  const [indicePreguntaActual, setIndicePreguntaActual] = React.useState(0);
  const [finalizado, setFinalizado] = React.useState(false);
  
  // Estados para manejo de respuestas existentes
  const [estudiantesPendientes, setEstudiantesPendientes] = React.useState<any[]>([]);
  const [preguntasAdicionalesPendientes, setPreguntasAdicionalesPendientes] = React.useState<number[]>([]);
  
  const searchParams = useSearchParams();
  const codigoEstudiante = searchParams.get("codigo_estudiante");

  // Usar el context de preguntas con opciones
  const { 
    preguntasData, 
    opcionesPreguntaData, 
    loading: loadingPreguntas, 
    error: errorPreguntas,
    getPreguntaPorTipoYNumero,
    getOpcionesPorPreguntaId,
    getPreguntaAfinidad,
    getPreguntasMultipleSeleccion
  } = usePreguntasConOpciones();

  const [getEstudiante, { data, loading, error }] = useLazyQuery(GET_ESTUDIANTE_BY_CODIGO_QUERY);
  const [getEstudiantes, { data: dataEstudiantes }] = useLazyQuery(GET_ESTUDIANTES_QUERY);
  const [getRespuestasEstudiante, { data: dataRespuestasEstudiante }] = useLazyQuery(GET_RESPUESTAS_BY_ESTUDIANTE_ID_QUERY);

  // Carga estudiante, clase y estudiantes relacionados
  useEffect(() => {
    if (!codigoEstudiante) return;
    // Buscar estudiante por código
    getEstudiante({ variables: { codigo: codigoEstudiante } })
      .then((result) => {
        const estudiante = result?.data?.estudiante?.[0];
        if (estudiante) {
          const claseIdEst = estudiante.clase_id;
          const cuestionarioIdEst = estudiante.cuestionario_id;
          setCuestionarioId(cuestionarioIdEst);
          if (claseIdEst) {
            getEstudiantes({ variables: { claseId: claseIdEst } });
          }
        }
      });
  }, [codigoEstudiante, getEstudiante, getEstudiantes]);

  // useEffect para cargar respuestas existentes del estudiante
  useEffect(() => {
    if (data && data.estudiante && data.estudiante.length > 0) {
      const estudianteId = data.estudiante[0].id;
      getRespuestasEstudiante({ variables: { estudiante_id: estudianteId } });
    }
  }, [data, getRespuestasEstudiante]);

  // useEffect para procesar respuestas existentes y determinar qué preguntas faltan
  useEffect(() => {
    if (dataRespuestasEstudiante && dataEstudiantes && preguntasData && opcionesPreguntaData) {
      const respuestasExistentes = dataRespuestasEstudiante.respuesta || [];
      const estudianteActual = data?.estudiante?.[0];
      
      console.log("🔍 Procesando respuestas existentes:");
      console.log("Respuestas existentes:", respuestasExistentes);
      console.log("Estudiante actual:", estudianteActual);
      
      if (!estudianteActual) return;

      // Obtener todos los estudiantes del curso (excluyendo al estudiante actual)
      const todosLosEstudiantes = (dataEstudiantes.estudiante as Array<{ id: string; nombre: string; cuestionario_id: string }>)
        .filter((e) => e.cuestionario_id === cuestionarioId && e.id !== estudianteActual.id);

      console.log("Todos los estudiantes del curso:", todosLosEstudiantes);

      // Verificar respuestas de afinidad (pregunta principal)
      const preguntaAfinidad = getPreguntaAfinidad();
      const estudiantesConRespuesta = new Set();
      
      console.log("Pregunta de afinidad:", preguntaAfinidad);
      
      if (preguntaAfinidad) {
        respuestasExistentes.forEach((respuesta: any) => {
          if (respuesta.pregunta_id === preguntaAfinidad.id && respuesta.estudiante_evaluado_id) {
            estudiantesConRespuesta.add(respuesta.estudiante_evaluado_id);
            console.log("Estudiante con respuesta de afinidad:", respuesta.estudiante_evaluado_id);
          }
        });
      }

      console.log("Estudiantes con respuesta de afinidad (Set):", estudiantesConRespuesta);

      // Filtrar estudiantes que no tienen respuesta de afinidad
      const estudiantesSinRespuesta = todosLosEstudiantes.filter(est => !estudiantesConRespuesta.has(est.id));

      console.log("Estudiantes sin respuesta de afinidad:", estudiantesSinRespuesta);

      // Verificar preguntas adicionales
      const preguntasAdicionalesArray = getPreguntasMultipleSeleccion(5);
      const preguntasAdicionalesRespondidas = new Set();
      
      // Para preguntas adicionales, no las marcamos como completadas automáticamente
      // Permitiremos que se muestren para agregar nuevos estudiantes
      preguntasAdicionalesArray.forEach((pregunta: any) => {
        // Solo marcar como respondida si NO hay estudiantes nuevos que evaluar
        if (estudiantesSinRespuesta.length === 0) {
          const tieneRespuesta = respuestasExistentes.some((respuesta: any) => 
            respuesta.pregunta_id === pregunta.id
          );
          if (tieneRespuesta) {
            preguntasAdicionalesRespondidas.add(pregunta.numero_pregunta);
          }
        }
      });

      const preguntasAdicionalesFaltantes = preguntasAdicionalesArray
        .filter((p: any) => !preguntasAdicionalesRespondidas.has(p.numero_pregunta))
        .map((p: any) => p.numero_pregunta);

      console.log("Preguntas adicionales faltantes:", preguntasAdicionalesFaltantes);

      // Actualizar estados según lo que falta por responder
      setEstudiantesPendientes(estudiantesSinRespuesta);
      setPreguntasAdicionalesPendientes(preguntasAdicionalesFaltantes);

      // Determinar el estado del cuestionario
      if (estudiantesSinRespuesta.length === 0 && preguntasAdicionalesFaltantes.length === 0) {
        // Todo está completado - verificar si hay nuevos estudiantes para preguntas adicionales
        const hayNuevosEstudiantesParaPreguntas = todosLosEstudiantes.length > 0;
        
        if (hayNuevosEstudiantesParaPreguntas) {
          console.log("📝 Hay nuevos estudiantes para agregar a preguntas adicionales");
          setFaseEvaluacionEstudiantesCompletada(true);
          setPreguntasAdicionales(preguntasAdicionalesArray.map(p => p.numero_pregunta));
          setIndicePreguntaActual(0);
        } else {
          console.log("✅ Todo está completado - finalizando cuestionario");
          setFinalizado(true);
        }
      } else if (estudiantesSinRespuesta.length === 0 && preguntasAdicionalesFaltantes.length > 0) {
        // Solo faltan preguntas adicionales
        console.log("📝 Solo faltan preguntas adicionales");
        setFaseEvaluacionEstudiantesCompletada(true);
        setPreguntasAdicionales(preguntasAdicionalesFaltantes);
        setIndicePreguntaActual(0);
      } else {
        // Faltan estudiantes por evaluar
        console.log("👥 Faltan estudiantes por evaluar");
        setIndiceEstudiante(0);
        setFaseEvaluacionEstudiantesCompletada(false);
      }
    }
  }, [dataRespuestasEstudiante, dataEstudiantes, preguntasData, opcionesPreguntaData, data, cuestionarioId, getPreguntaAfinidad, getPreguntasMultipleSeleccion]);

  // Cargar preguntas y opciones solo cuando se muestran - Ya no es necesario porque el context las carga automáticamente
  // Las preguntas y opciones ya están disponibles a través del context
  
  // useEffect para cargar preguntas adicionales cuando se completa la sección de estudiantes
  useEffect(() => {
    if (faseEvaluacionEstudiantesCompletada && preguntasData && preguntasData.pregunta) {
      // Usar la lista de preguntas adicionales pendientes si está disponible
      if (preguntasAdicionalesPendientes.length > 0) {
        setPreguntasAdicionales(preguntasAdicionalesPendientes);
        setIndicePreguntaActual(0);
      } else {
        // Si no hay pendientes específicas, usar la lógica original
        const preguntasAdicionalesArray = getPreguntasMultipleSeleccion(5);
        
        if (preguntasAdicionalesArray.length > 0) {
          setPreguntasAdicionales(preguntasAdicionalesArray.map(p => p.numero_pregunta));
          setIndicePreguntaActual(0);
        } else {
          setFinalizado(true);
        }
      }
    }
  }, [faseEvaluacionEstudiantesCompletada, preguntasData, getPreguntasMultipleSeleccion, preguntasAdicionalesPendientes]);

  let nombreEstudiante = "";
  if (data && data.estudiante && data.estudiante.length > 0) {
    nombreEstudiante = data.estudiante[0].nombre;
  }

  // Buscar identificador de la clase
  let identificadorClase = "";
  if (data && data.estudiante && data.estudiante.length > 0 && data.estudiante[0].clase) {
    identificadorClase = data.estudiante[0].clase.identificador;
  }
  // Mutaciones para respuestas
  const [upsertRespuesta] = useMutation(UPSERT_RESPUESTA_MUTATION);

  // Handler para siguiente (guarda respuesta antes de avanzar)
  const [errorSeleccion, setErrorSeleccion] = React.useState<string>("");
  const handleSiguiente = async (estudiantesFiltrados: any[]) => {
    // Buscar datos necesarios
    if (!data || !data.estudiante || !preguntasData || !preguntasData.pregunta || !opcionesPreguntaData || !opcionesPreguntaData.opcion_pregunta) {
      // Si falta data, solo avanzar
      if (indiceEstudiante >= estudiantesFiltrados.length - 1) {
        setFaseEvaluacionEstudiantesCompletada(true);
        // Usar preguntas adicionales pendientes si están disponibles
        if (preguntasAdicionalesPendientes.length > 0) {
          setPreguntasAdicionales(preguntasAdicionalesPendientes);
          setIndicePreguntaActual(0);
        } else {
          // Verificar y cargar las preguntas adicionales (inicialmente la 5)
          const preguntasAdicionalesArray = getPreguntasMultipleSeleccion(5);
          
          if (preguntasAdicionalesArray.length > 0) {
            setPreguntasAdicionales(preguntasAdicionalesArray.map(p => p.numero_pregunta));
            setIndicePreguntaActual(0);
          } else {
            // Si no hay preguntas adicionales, finalizar el cuestionario
            setFinalizado(true);
          }
        }
      } else {
        setIndiceEstudiante((prev) => prev + 1);
      }
      return;
    }
    const estudianteQueResponde = data.estudiante[0];
    const estudianteActual = estudiantesFiltrados[indiceEstudiante];
    // Pregunta de afinidad
    const pregunta = getPreguntaAfinidad();
    if (!pregunta) {
      if (indiceEstudiante >= estudiantesFiltrados.length - 1) {
        setFaseEvaluacionEstudiantesCompletada(true);
        // Usar preguntas adicionales pendientes si están disponibles
        if (preguntasAdicionalesPendientes.length > 0) {
          setPreguntasAdicionales(preguntasAdicionalesPendientes);
          setIndicePreguntaActual(0);
        } else {
          // Verificar y cargar las preguntas adicionales
          const preguntasAdicionalesArray = getPreguntasMultipleSeleccion(5);
          
          if (preguntasAdicionalesArray.length > 0) {
            setPreguntasAdicionales(preguntasAdicionalesArray.map(p => p.numero_pregunta));
            setIndicePreguntaActual(0);
          } else {
            // Si no hay preguntas adicionales, finalizar el cuestionario
            setFinalizado(true);
          }
        }
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
      preguntaExtra = getPreguntaPorTipoYNumero("MULTIPLE_SELECCION", 2);
    } else if (/amarillo/i.test(valorRespuesta)) {
      preguntaExtra = getPreguntaPorTipoYNumero("MULTIPLE_SELECCION", 3);
    } else if (/rojo/i.test(valorRespuesta)) {
      preguntaExtra = getPreguntaPorTipoYNumero("MULTIPLE_SELECCION", 4);
    }
    if (preguntaExtra) {
      const key = `${estudianteActual.id}_${preguntaExtra.texto}`;
      const seleccionados = checkboxesSeleccionados[key] || [];
      const opcionesExtra = getOpcionesPorPreguntaId(preguntaExtra.id);
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
        // Ahora debemos encontrar el ID de la opción, no solo el texto
        const opcionesExtraCompletas = getOpcionesPorPreguntaId(preguntaExtra.id);
        
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
      setFaseEvaluacionEstudiantesCompletada(true);
      
      // Usar preguntas adicionales pendientes si están disponibles, sino usar la lógica original
      if (preguntasAdicionalesPendientes.length > 0) {
        setPreguntasAdicionales(preguntasAdicionalesPendientes);
        setIndicePreguntaActual(0);
      } else {
        // Cargar preguntas adicionales (inicialmente la 5)
        const preguntasAdicionalesArray = getPreguntasMultipleSeleccion(5);
        
        if (preguntasAdicionalesArray.length > 0) {
          setPreguntasAdicionales(preguntasAdicionalesArray.map(p => p.numero_pregunta));
          setIndicePreguntaActual(0);
        } else {
          // Si no hay preguntas adicionales, finalizar el cuestionario
          setFinalizado(true);
        }
      }
    } else {
      setIndiceEstudiante((prev) => prev + 1);
    }
  };
  const handleVolverInicio = () => {
    window.location.href = "/";
  };

  // Estado para los estudiantes seleccionados por pregunta adicional
  const [estudiantesSeleccionados, setEstudiantesSeleccionados] = React.useState<{ [key: string]: string[] }>({});

  // Método para manejar las preguntas adicionales
  const handleSiguientePreguntaAdicional = async () => {
    if (!data?.estudiante?.[0] || !preguntasData?.pregunta || !cuestionarioId || !dataEstudiantes?.estudiante) return;
    
    const estudianteQueResponde = data.estudiante[0];
    const numeroPreguntaActual = preguntasAdicionales[indicePreguntaActual];
    
    // Buscar la pregunta actual
    const preguntaActual = getPreguntaPorTipoYNumero("MULTIPLE_SELECCION", numeroPreguntaActual);
    
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
  };
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
                Comenzar
              </button>
            </div>
          </div>
        </>
      )}
      {mostrarPreguntas && !finalizado && !faseEvaluacionEstudiantesCompletada && (
        <div className="panel-container">
          {preguntasData && preguntasData.pregunta ? (() => {
            const pregunta = getPreguntaAfinidad();
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
            // Buscar la pregunta de afinidad
            const pregunta = getPreguntaAfinidad();
            // Opciones para la pregunta
            const opciones = pregunta ? getOpcionesPorPreguntaId(pregunta.id) : [];
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
              preguntaExtra = getPreguntaPorTipoYNumero("MULTIPLE_SELECCION", 2);
            } else if (/amarillo/i.test(textoSeleccionado)) {
              preguntaExtra = getPreguntaPorTipoYNumero("MULTIPLE_SELECCION", 3);
            } else if (/rojo/i.test(textoSeleccionado)) {
              preguntaExtra = getPreguntaPorTipoYNumero("MULTIPLE_SELECCION", 4);
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
                      const opcionesExtra = getOpcionesPorPreguntaId((preguntaExtra as any).id);
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
            
            // Buscar la pregunta actual
            const preguntaActual = getPreguntaPorTipoYNumero("MULTIPLE_SELECCION", numeroPreguntaActual);
            
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
    </>
  );
}
