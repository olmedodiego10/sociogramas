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

export const GET_CUESTIONARIOS_QUERY = gql`
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

// Nuevo query para buscar estudiante por código
export const GET_ESTUDIANTE_BY_CODIGO_QUERY = gql`
  query GetEstudianteByCodigo($codigo: uuid!) {
    estudiante(where: {codigo_estudiante: {_eq: $codigo}}) {
      id
      nombre
      codigo_estudiante
      cuestionario_id
    }
  }
`;