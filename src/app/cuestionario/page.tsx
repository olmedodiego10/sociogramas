
"use client";

import React, { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useLazyQuery } from "@apollo/client";
import { GET_ESTUDIANTE_BY_CODIGO_QUERY } from "@/graphql/queries";
import { GET_CLASES_QUERY } from "@/graphql/queries";

export default function CuestionarioEstudiante() {
  const [mostrarPreguntas, setMostrarPreguntas] = React.useState(false);
  const [claseId, setClaseId] = React.useState(null);
  const searchParams = useSearchParams();
  const codigoEstudiante = searchParams.get("codigo_estudiante");

  const [getEstudiante, { data, loading, error }] = useLazyQuery(GET_ESTUDIANTE_BY_CODIGO_QUERY);
  const [getClases, { data: dataClases }] = useLazyQuery(GET_CLASES_QUERY);

  useEffect(() => {
    if (codigoEstudiante) {
      getEstudiante({ variables: { codigo: codigoEstudiante } });
    }
  }, [codigoEstudiante, getEstudiante]);

  // Cuando se obtiene el estudiante, buscar la clase
  useEffect(() => {
    if (data && data.estudiante && data.estudiante.length > 0) {
      const claseIdEst = data.estudiante[0].clase_id;
      setClaseId(claseIdEst);
      if (claseIdEst) {
        getClases({ variables: { claseId: claseIdEst } });
      }
    }
  }, [data, getClases]);

  let nombreEstudiante = "";
  if (data && data.estudiante && data.estudiante.length > 0) {
    nombreEstudiante = data.estudiante[0].nombre;
  }

  // Buscar identificador de la clase
  let identificadorClase = "";
  if (dataClases && dataClases.clase && dataClases.clase.length > 0) {
    identificadorClase = dataClases.clase[0].identificador;
  }
  return (
    <>
      {!mostrarPreguntas && (
        <>
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
          <div className="panel-container">
            {loading && <p>Cargando estudiante...</p>}
            {error && <p>Error al cargar el estudiante</p>}
            <h2 className="panel-form-title">Instrucciones</h2>
            <div style={{ marginTop: 12 }}>
              {/* ...existing code... */}
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
      {mostrarPreguntas && (
        <div className="panel-container">
          <h1 style={{ textAlign: "center" }}>aqui las preguntas</h1>
        </div>
      )}
    </>
  );
}
