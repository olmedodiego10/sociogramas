"use client";
import React, { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useLazyQuery, useMutation } from "@apollo/client";
import { GET_ESTUDIANTE_BY_CODIGO_QUERY } from "@/graphql/queries";
import { GET_CLASES_QUERY } from "@/graphql/queries";
import { GET_ESTUDIANTES_QUERY } from "@/graphql/queries";
import { GET_PREGUNTAS_QUERY, GET_OPCIONES_PREGUNTA_QUERY } from "@/graphql/queries";
import { UPSERT_RESPUESTA_MUTATION, CREATE_RESPUESTA_MUTATION } from "@/graphql/mutations";

export default function CuestionarioEstudiante() {
  const [indiceEstudiante, setIndiceEstudiante] = React.useState(0);
  const [mostrarPreguntas, setMostrarPreguntas] = React.useState(false);
  const [claseId, setClaseId] = React.useState(null);
  const [cuestionarioId, setCuestionarioId] = React.useState(null);
  // Estado para la opción seleccionada por estudiante
  const [opcionesSeleccionadas, setOpcionesSeleccionadas] = React.useState<{ [estudianteId: string]: string }>({});
  // Estado para checkboxes seleccionados por estudiante y pregunta extra
  const [checkboxesSeleccionados, setCheckboxesSeleccionados] = React.useState<{ [key: string]: string[] }>({});
  // Estado para texto de "Otro motivo" por estudiante y pregunta extra
  const [otroMotivoText, setOtroMotivoText] = React.useState<{ [key: string]: string }>({});
  // Estado para controlar etapas del cuestionario
  const [estudiantesFinalizados, setEstudiantesFinalizados] = React.useState(false);
  const [preguntasAdicionales, setPreguntasAdicionales] = React.useState<number[]>([]);
  const [indicePreguntaActual, setIndicePreguntaActual] = React.useState(0);
  const [finalizado, setFinalizado] = React.useState(false);
  
  const searchParams = useSearchParams();
  const codigoEstudiante = searchParams.get("codigo_estudiante");

  const [getEstudiante, { data, loading, error }] = useLazyQuery(GET_ESTUDIANTE_BY_CODIGO_QUERY);
  const [getClases, { data: dataClases }] = useLazyQuery(GET_CLASES_QUERY);
  const [getEstudiantes, { data: dataEstudiantes }] = useLazyQuery(GET_ESTUDIANTES_QUERY);
  const [getPreguntas, { data: dataPreguntas }] = useLazyQuery(GET_PREGUNTAS_QUERY);
  const [getOpcionesPregunta, { data: dataOpcionesPregunta }] = useLazyQuery(GET_OPCIONES_PREGUNTA_QUERY);

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
          setClaseId(claseIdEst);
          setCuestionarioId(cuestionarioIdEst);
          if (claseIdEst) {
            getClases({ variables: { claseId: claseIdEst } });
            getEstudiantes({ variables: { claseId: claseIdEst } });
          }
        }
      });
  }, [codigoEstudiante, getEstudiante, getClases, getEstudiantes]);

  // Cargar preguntas y opciones solo cuando se muestran
  useEffect(() => {
    if (mostrarPreguntas) {
      if (!dataPreguntas) getPreguntas();
      if (!dataOpcionesPregunta) getOpcionesPregunta();
    }
  }, [mostrarPreguntas, dataPreguntas, dataOpcionesPregunta]);
  
  // Effect para cargar preguntas adicionales cuando se completa la sección de estudiantes
  useEffect(() => {
    if (estudiantesFinalizados && dataPreguntas && dataPreguntas.pregunta) {
      const preguntasAdicionales = (dataPreguntas.pregunta as Array<{ id: string; tipo_pregunta: string; numero_pregunta: number }>)
        .filter(p => p.tipo_pregunta === "MULTIPLE_SELECCION" && p.numero_pregunta >= 5)
        .sort((a, b) => a.numero_pregunta - b.numero_pregunta);
      
      if (preguntasAdicionales.length > 0) {
        setPreguntasAdicionales(preguntasAdicionales.map(p => p.numero_pregunta));
        setIndicePreguntaActual(0);
      } else {
        setFinalizado(true);
      }
    }
  }, [estudiantesFinalizados, dataPreguntas]);

  let nombreEstudiante = "";
  if (data && data.estudiante && data.estudiante.length > 0) {
    nombreEstudiante = data.estudiante[0].nombre;
  }

  // Buscar identificador de la clase
  let identificadorClase = "";
  if (dataClases && dataClases.clase && dataClases.clase.length > 0) {
    identificadorClase = dataClases.clase[0].identificador;
  }
  // Mutaciones para respuestas
  const [upsertRespuesta] = useMutation(UPSERT_RESPUESTA_MUTATION);
  const [crearRespuesta] = useMutation(CREATE_RESPUESTA_MUTATION);

  // Handler para siguiente (guarda respuesta antes de avanzar)
  const [errorSeleccion, setErrorSeleccion] = React.useState<string>("");
  const handleSiguiente = async (estudiantesFiltrados: any[]) => {
    // Buscar datos necesarios
    if (!data || !data.estudiante || !dataPreguntas || !dataPreguntas.pregunta || !dataOpcionesPregunta || !dataOpcionesPregunta.opcion_pregunta) {
      // Si falta data, solo avanzar
      if (indiceEstudiante >= estudiantesFiltrados.length - 1) {
        setEstudiantesFinalizados(true);
        // Verificar y cargar las preguntas adicionales (inicialmente la 5)
        const preguntasAdicionales = (dataPreguntas?.pregunta as Array<{ id: string; tipo_pregunta: string; numero_pregunta: number }> || [])
          .filter(p => p.tipo_pregunta === "MULTIPLE_SELECCION" && p.numero_pregunta >= 5)
          .sort((a, b) => a.numero_pregunta - b.numero_pregunta);
        
        if (preguntasAdicionales.length > 0) {
          setPreguntasAdicionales(preguntasAdicionales.map(p => p.numero_pregunta));
          setIndicePreguntaActual(0);
        } else {
          // Si no hay preguntas adicionales, finalizar el cuestionario
          setFinalizado(true);
        }
      } else {
        setIndiceEstudiante((prev) => prev + 1);
      }
      return;
    }
    const estudianteQueResponde = data.estudiante[0];
    const estudianteActual = estudiantesFiltrados[indiceEstudiante];
    // Pregunta de afinidad
    const pregunta = (dataPreguntas.pregunta as Array<{ id: string; texto: string; tipo_pregunta: string; numero_pregunta: number }> ).find(
      (p) => p.tipo_pregunta === "AFINIDAD_ESTUDIANTE" && p.numero_pregunta === 1
    );
    if (!pregunta) {
      if (indiceEstudiante >= estudiantesFiltrados.length - 1) {
        setEstudiantesFinalizados(true);
        // Verificar y cargar las preguntas adicionales
        const preguntasAdicionales = (dataPreguntas?.pregunta as Array<{ id: string; tipo_pregunta: string; numero_pregunta: number }> || [])
          .filter(p => p.tipo_pregunta === "MULTIPLE_SELECCION" && p.numero_pregunta >= 5)
          .sort((a, b) => a.numero_pregunta - b.numero_pregunta);
        
        if (preguntasAdicionales.length > 0) {
          setPreguntasAdicionales(preguntasAdicionales.map(p => p.numero_pregunta));
          setIndicePreguntaActual(0);
        } else {
          // Si no hay preguntas adicionales, finalizar el cuestionario
          setFinalizado(true);
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
    const opcionSeleccionada = (dataOpcionesPregunta.opcion_pregunta as Array<{ id: string; texto_opcion: string }> ).find(
      (op) => op.id === opcionSeleccionadaId
    );
    const valorRespuesta = opcionSeleccionada ? opcionSeleccionada.texto_opcion : "";
    // Ejecutar mutación para la opción principal
    if (opcionSeleccionadaId && valorRespuesta) {
      try {
        await upsertRespuesta({
          variables: {
            cuestionario_id: cuestionarioId,
            estudiante_id: estudianteQueResponde.id,
            pregunta_id: pregunta.id,
            estudiante_evaluado_id: estudianteActual.id,
            valor_respuesta: valorRespuesta,
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
      preguntaExtra = (dataPreguntas.pregunta as Array<{ id: string; tipo_pregunta: string; numero_pregunta: number }>).find(
        (p) => p.tipo_pregunta === "MULTIPLE_SELECCION" && p.numero_pregunta === 2
      );
    } else if (/amarillo/i.test(valorRespuesta)) {
      preguntaExtra = (dataPreguntas.pregunta as Array<{ id: string; tipo_pregunta: string; numero_pregunta: number }>).find(
        (p) => p.tipo_pregunta === "MULTIPLE_SELECCION" && p.numero_pregunta === 3
      );
    } else if (/rojo/i.test(valorRespuesta)) {
      preguntaExtra = (dataPreguntas.pregunta as Array<{ id: string; tipo_pregunta: string; numero_pregunta: number }>).find(
        (p) => p.tipo_pregunta === "MULTIPLE_SELECCION" && p.numero_pregunta === 4
      );
    }
    if (preguntaExtra) {
      const key = `${estudianteActual.id}_${preguntaExtra.texto}`;
      const seleccionados = checkboxesSeleccionados[key] || [];
      const opcionesExtra = (dataOpcionesPregunta.opcion_pregunta as Array<{ id: string; pregunta_id: string; texto_opcion: string }> ).filter(
        (op) => op.pregunta_id === preguntaExtra.id
      );
      // Validar que si "Otro motivo" está seleccionado, el campo no esté vacío
      let errorOtroMotivo = false;
      const respuestasCheckbox: string[] = [];
      for (const opId of seleccionados) {
        const opcion = opcionesExtra.find((o) => o.id === opId);
        if (!opcion) continue;
        let valor = opcion.texto_opcion;
        if (/otro motivo/i.test(opcion.texto_opcion)) {
          valor = otroMotivoText[key] || "";
          if (!valor.trim()) {
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
        const respuestasCheckboxUnicas = Array.from(new Set(respuestasCheckbox));
        for (const valor of respuestasCheckboxUnicas) {
          await upsertRespuesta({
            variables: {
              cuestionario_id: cuestionarioId,
              estudiante_id: estudianteQueResponde.id,
              pregunta_id: preguntaExtra.id,
              estudiante_evaluado_id: estudianteActual.id,
              valor_respuesta: valor,
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
      setEstudiantesFinalizados(true);
      
      // Cargar preguntas adicionales (inicialmente la 5)
      const preguntasAdicionales = (dataPreguntas?.pregunta as Array<{ id: string; tipo_pregunta: string; numero_pregunta: number }> || [])
        .filter(p => p.tipo_pregunta === "MULTIPLE_SELECCION" && p.numero_pregunta >= 5)
        .sort((a, b) => a.numero_pregunta - b.numero_pregunta);
      
      if (preguntasAdicionales.length > 0) {
        setPreguntasAdicionales(preguntasAdicionales.map(p => p.numero_pregunta));
        setIndicePreguntaActual(0);
      } else {
        // Si no hay preguntas adicionales, finalizar el cuestionario
        setFinalizado(true);
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
    if (!data?.estudiante?.[0] || !dataPreguntas?.pregunta || !cuestionarioId || !dataEstudiantes?.estudiante) return;
    
    const estudianteQueResponde = data.estudiante[0];
    const numeroPreguntaActual = preguntasAdicionales[indicePreguntaActual];
    
    // Buscar la pregunta actual
    const preguntaActual = (dataPreguntas.pregunta as Array<{ id: string; texto: string; tipo_pregunta: string; numero_pregunta: number }>).find(
      (p) => p.tipo_pregunta === "MULTIPLE_SELECCION" && p.numero_pregunta === numeroPreguntaActual
    );
    
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
      // Guardar una respuesta por cada estudiante seleccionado
      for (const estudianteId of estudiantesSeleccionadosParaPregunta) {
        // Encontrar el estudiante seleccionado
        const estudianteSeleccionado = estudiantesDelCurso.find(e => e.id === estudianteId);
        if (!estudianteSeleccionado) continue;
        
        // Guardar respuesta con el estudiante evaluado
        await upsertRespuesta({
          variables: {
            cuestionario_id: cuestionarioId,
            estudiante_id: estudianteQueResponde.id,
            pregunta_id: preguntaActual.id,
            estudiante_evaluado_id: estudianteId,
            valor_respuesta: null, // Valor nulo según los nuevos requisitos del backend
          },
        });
      }
      
      // Avanzar a la siguiente pregunta o finalizar
      if (indicePreguntaActual < preguntasAdicionales.length - 1) {
        setIndicePreguntaActual(prev => prev + 1);
      } else {
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
        <div className="panel-estudiante-title" style={{ paddingBottom: 0 }}>
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
            <hr style={{ margin: '24px 0' }} />
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button className="panel-btn" onClick={() => setMostrarPreguntas(true)}>
                Comenzar
              </button>
            </div>
          </div>
        </>
      )}
      {mostrarPreguntas && !finalizado && !estudiantesFinalizados && (
        <div className="panel-container">
          {dataPreguntas && dataPreguntas.pregunta ? (() => {
            const pregunta = (dataPreguntas.pregunta as Array<{ id: string; texto: string; tipo_pregunta: string; numero_pregunta: number }>).find(
              (p) => p.tipo_pregunta === "AFINIDAD_ESTUDIANTE" && p.numero_pregunta === 1
            );
            return pregunta ? (
              <p style={{ textAlign: "center", fontWeight: 600, fontSize: "1.2em", margin: 0 }}>{pregunta.texto}</p>
            ) : null;
          })() : null}
          {/* Mostrar un estudiante a la vez con botón siguiente */}
          {dataEstudiantes && dataEstudiantes.estudiante && dataPreguntas && dataPreguntas.pregunta && dataOpcionesPregunta && dataOpcionesPregunta.opcion_pregunta ? (() => {
            const estudiantesFiltrados = (dataEstudiantes.estudiante as Array<{ id: string; nombre: string; cuestionario_id: string }> )
              .filter((e) => e.cuestionario_id === cuestionarioId && e.id !== (data?.estudiante?.[0]?.id));
            if (estudiantesFiltrados.length === 0) {
              return <p style={{ textAlign: 'center', marginTop: 24 }}>No hay estudiantes para este cuestionario.</p>;
            }
            // Si ya se finalizó, no mostrar nada aquí
            if (indiceEstudiante >= estudiantesFiltrados.length) return null;
            const estudianteActual = estudiantesFiltrados[indiceEstudiante];
            // Buscar la pregunta de afinidad
            const pregunta = (dataPreguntas.pregunta as Array<{ id: string; texto: string; tipo_pregunta: string; numero_pregunta: number }> ).find(
              (p) => p.tipo_pregunta === "AFINIDAD_ESTUDIANTE" && p.numero_pregunta === 1
            );
            // Opciones para la pregunta
            const opciones = pregunta ? (dataOpcionesPregunta.opcion_pregunta as Array<{ id: string; pregunta_id: string; texto_opcion: string }> ).filter(
              (op) => op.pregunta_id === pregunta.id
            ) : [];
            // Función para estilos de color y obtener icono
            const getOptionStyle = (texto: string) => {
              if (/verde/i.test(texto)) return { color: 'green', fontWeight: 600 };
              if (/amarillo/i.test(texto)) return { color: '#e6c200', fontWeight: 600 };
              if (/rojo/i.test(texto)) return { color: 'red', fontWeight: 600 };
              if (/blanco/i.test(texto)) return { color: 'black', fontWeight: 700 };
              return {};
            };
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
            let preguntaExtra: { texto: string } | null = null;
            if (/verde/i.test(textoSeleccionado)) {
              preguntaExtra = (dataPreguntas.pregunta as Array<{ texto: string; tipo_pregunta: string; numero_pregunta: number }>).find(
                (p) => p.tipo_pregunta === "MULTIPLE_SELECCION" && p.numero_pregunta === 2
              ) || null;
            } else if (/amarillo/i.test(textoSeleccionado)) {
              preguntaExtra = (dataPreguntas.pregunta as Array<{ texto: string; tipo_pregunta: string; numero_pregunta: number }>).find(
                (p) => p.tipo_pregunta === "MULTIPLE_SELECCION" && p.numero_pregunta === 3
              ) || null;
            } else if (/rojo/i.test(textoSeleccionado)) {
              preguntaExtra = (dataPreguntas.pregunta as Array<{ texto: string; tipo_pregunta: string; numero_pregunta: number }>).find(
                (p) => p.tipo_pregunta === "MULTIPLE_SELECCION" && p.numero_pregunta === 4
              ) || null;
            }

            return (
              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <div style={{ fontSize: '1.5em', marginBottom: 16 }}>
                  {estudianteActual.nombre}
                </div>
                {/* Selector de opciones debajo del nombre */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                  <select
                    style={{ fontSize: '1.1em', padding: '8px 16px', borderRadius: 8, border: '1px solid #ccc', minWidth: 220, textAlign: 'left', fontWeight: 600 }}
                    value={opcionSeleccionada}
                    onChange={e => setOpcionesSeleccionadas(prev => ({ ...prev, [estudianteActual.id]: e.target.value }))}
                  >
                    <option value="">Selecciona una opción</option>
                    {opciones.map((op) => (
                      <option key={op.id} value={op.id} style={getOptionStyle(op.texto_opcion)}>
                        {getOptionIcon(op.texto_opcion)} {op.texto_opcion}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Pregunta extra según selección */}
                {preguntaExtra && (
                  <div style={{ margin: '16px 0', textAlign: 'center', fontWeight: 600, fontSize: '1.1em', maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
                    {preguntaExtra.texto}
                    {/* Lista de checkboxes para las opciones de la pregunta extra */}
                    {dataOpcionesPregunta && dataOpcionesPregunta.opcion_pregunta ? (() => {
                      const opcionesExtra = (dataOpcionesPregunta.opcion_pregunta as Array<{ id: string; pregunta_id: string; texto_opcion: string }> ).filter(
                        (op) => op.pregunta_id === (preguntaExtra as any).id
                      );
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
                        <div style={{ marginTop: 16, textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
                          {opcionesExtra.map((op) => {
                            const esOtroMotivo = /otro motivo/i.test(op.texto_opcion);
                            return (
                              <div key={op.id} style={{ marginBottom: 8 }}>
                                <label style={{ cursor: 'pointer', fontWeight: 400 }}>
                                  <input
                                    type="checkbox"
                                    style={{ marginRight: 8 }}
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
                                    style={{ marginLeft: 12, marginTop: 6, padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc', minWidth: 220 }}
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
                  <div style={{ color: 'red', marginBottom: 8, fontWeight: 500 }}>{errorSeleccion}</div>
                )}
                <button
                  className="panel-btn"
                  onClick={() => handleSiguiente(estudiantesFiltrados)}
                  style={{ marginTop: 16 }}
                >
                  {indiceEstudiante >= estudiantesFiltrados.length - 1 ? 'Finalizar' : 'Siguiente'}
                </button>
                <div style={{ marginTop: 16, color: '#888', fontSize: '0.95em' }}>
                  {indiceEstudiante + 1} de {estudiantesFiltrados.length}
                </div>
              </div>
            );
          })() : null}
        </div>
      )}
      
      {/* Sección para mostrar las preguntas adicionales */}
      {mostrarPreguntas && !finalizado && estudiantesFinalizados && preguntasAdicionales.length > 0 && (
        <div className="panel-container">
          {dataPreguntas && dataPreguntas.pregunta && dataEstudiantes && dataEstudiantes.estudiante ? (() => {
            const numeroPreguntaActual = preguntasAdicionales[indicePreguntaActual];
            
            // Buscar la pregunta actual
            const preguntaActual = (dataPreguntas.pregunta as Array<{ id: string; texto: string; tipo_pregunta: string; numero_pregunta: number }>).find(
              (p) => p.tipo_pregunta === "MULTIPLE_SELECCION" && p.numero_pregunta === numeroPreguntaActual
            );
            
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
              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <div style={{ fontSize: '1.3em', marginBottom: 24, fontWeight: 600 }}>
                  {preguntaActual.texto}
                </div>
                
                {/* Lista de estudiantes como checkboxes */}
                <div style={{ marginTop: 24, textAlign: 'left', maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
                  <p style={{ marginBottom: 16, fontWeight: 500 }}>Selecciona a los compañeros que cumplen con esta característica:</p>
                  
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    border: '1px solid #eee',
                    padding: '16px',
                    borderRadius: '8px'
                  }}>
                    {estudiantesDelCurso.length === 0 ? (
                      <p>No hay estudiantes disponibles para seleccionar.</p>
                    ) : (
                      estudiantesDelCurso.map((estudiante) => (
                        <div key={estudiante.id} style={{ marginBottom: 10, display: 'flex', alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            id={`estudiante-${estudiante.id}-${key}`}
                            checked={estudiantesSeleccionadosParaPregunta.includes(estudiante.id)}
                            onChange={() => handleEstudianteCheckboxChange(estudiante.id)}
                            style={{ marginRight: 10, width: 18, height: 18 }}
                          />
                          <label 
                            htmlFor={`estudiante-${estudiante.id}-${key}`} 
                            style={{ cursor: 'pointer', fontWeight: 400, fontSize: '1.1em' }}
                          >
                            {estudiante.nombre}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                
                {errorSeleccion && (
                  <div style={{ color: 'red', marginTop: 16, fontWeight: 500 }}>{errorSeleccion}</div>
                )}
                
                <button
                  className="panel-btn"
                  onClick={handleSiguientePreguntaAdicional}
                  style={{ marginTop: 24 }}
                >
                  {indicePreguntaActual >= preguntasAdicionales.length - 1 ? 'Finalizar' : 'Siguiente'}
                </button>
                
                <div style={{ marginTop: 16, color: '#888', fontSize: '0.95em' }}>
                  Pregunta {indicePreguntaActual + 1} de {preguntasAdicionales.length}
                </div>
              </div>
            );
          })() : null}
        </div>
      )}
      {finalizado && (
        <div className="panel-container" style={{ textAlign: 'center', marginTop: 64 }}>
          <h2 style={{ fontWeight: 700, fontSize: '2em', marginBottom: 24 }}>¡Has completado el cuestionario!</h2>
          <p style={{ marginBottom: 24 }}>Gracias por tu participación. Tus respuestas nos ayudarán a crear mejores grupos de trabajo.</p>
          <button className="panel-btn" style={{ fontSize: '1.1em', padding: '12px 32px', borderRadius: 8 }} onClick={handleVolverInicio}>
            Volver al inicio
          </button>
        </div>
      )}
    </>
  );
}
