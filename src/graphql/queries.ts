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