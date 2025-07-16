import { gql } from '@apollo/client';

export const GET_USUARIO_QUERY = gql`
query getUsuario($usuario: String!) {
  usuario(where: {email: {_eq: $usuario}}) {
    id
    nombre
    email
    password
  }
}
`;

export const GET_CLASES_QUERY = gql`
  query GetClases {
    clase(order_by: {created_at: desc}) {
      id
      identificador
      usuario_id
    }
  }
`;

export const GET_ESTUDIANTES_QUERY = gql`
  query GetEstudiantes($claseId: uuid) {
    estudiante(where: {clase_id: {_eq: $claseId}}, order_by: {created_at: desc}) {
      id
      nombre
      codigo_estudiante
      created_at
      clase_id
      grupo_id
      cuestionario_id
    }
  }
`;

export const GET_CUESTIONARIOS_DE_UNA_CLASE_QUERY = gql`
  query GetCuestionarios($claseId: uuid) {
    cuestionario(where: {clase_id: {_eq: $claseId}}, order_by: {created_at: desc}) {
      id
      clase_id
      estado
      fecha_inicio
      fecha_fin
      created_at
      updated_at
    }
  }
`;

// Buscar estudiante por código
export const GET_ESTUDIANTE_BY_CODIGO_QUERY = gql`
  query GetEstudianteByCodigo($codigo: uuid!) {
    estudiante(where: {codigo_estudiante: {_eq: $codigo}}) {
      id
      nombre
      codigo_estudiante
      cuestionario_id
      clase_id
      clase {
        id
        identificador
      }
    }
  }
`;

// Obtener todas las preguntas
export const GET_PREGUNTAS_QUERY = gql`
  query GetPreguntas {
    pregunta(order_by: {numero_pregunta: asc}) {
      id
      numero_pregunta
      tipo_pregunta
      texto
      es_obligatoria
    }
  }
`;

// Obtener todas las opciones de preguntas
export const GET_OPCIONES_PREGUNTA_QUERY = gql`
  query GetOpcionesPregunta {
    opcion_pregunta(order_by: {created_at: asc}) {
      id
      pregunta_id
      texto_opcion
    }
  }
`;

// Obtener todas las respuestas para un cuestionario específico
export const GET_RESPUESTAS_QUERY = gql`
  query GetRespuestas($cuestionario_id: uuid!) {
    respuesta(
      where: {
        cuestionario_id: {_eq: $cuestionario_id}
      }
    ) {
      id
      estudiante_id
      estudiante_evaluado_id
      opcion_pregunta_id
      otro_texto
      created_at
      updated_at
      cuestionario_id
      pregunta_id
    }
    
    # Traemos todas las opciones de pregunta para hacer el join en el frontend
    opcion_pregunta {
      id
      texto_opcion
    }
    
    # Traemos las preguntas para identificar las de afinidad
    pregunta {
      id
      numero_pregunta
      tipo_pregunta
    }
  }
`;

// Obtener respuestas de un estudiante específico por su ID
export const GET_RESPUESTAS_BY_ESTUDIANTE_ID_QUERY = gql`
  query GetRespuestasByEstudianteId($estudiante_id: uuid!) {
    respuesta(
      where: {
        estudiante_id: {_eq: $estudiante_id}
      }
    ) {
      id
      estudiante_id
      estudiante_evaluado_id
      opcion_pregunta_id
      otro_texto
      created_at
      updated_at
      cuestionario_id
      pregunta_id
    }
  }
`;