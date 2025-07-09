export const UPDATE_ESTUDIANTE_CUESTIONARIO_MUTATION = gql`
  mutation UpdateEstudianteCuestionario($id: uuid!, $cuestionario_id: uuid) {
    update_estudiante_by_pk(pk_columns: {id: $id}, _set: {cuestionario_id: $cuestionario_id}) {
      id
      cuestionario_id
    }
  }
`;
export const UPDATE_CUESTIONARIO_ESTADO_MUTATION = gql`
  mutation UpdateCuestionarioEstado($id: uuid!, $estado: estado_cuestionario_enum!) {
    update_cuestionario_by_pk(pk_columns: {id: $id}, _set: {estado: $estado}) {
      id
      estado
    }
  }
`;
import { gql } from '@apollo/client';

// Esto es un ejemplo y no se usa
export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      usuario {
        id
        nombre
        email
      }
    }
  }
`;

export const CREATE_CLASE_MUTATION = gql`
  mutation CreateClase($object: clase_insert_input!) {
    insert_clase_one(object: $object) {
      id
      identificador
      usuario_id
    }
  }
`;

export const CREATE_ESTUDIANTE_MUTATION = gql`
  mutation CreateEstudiante($object: estudiante_insert_input!) {
    insert_estudiante_one(object: $object) {
      id
      nombre
      codigo_estudiante
      created_at
      clase_id
      grupo_id
    }
  }
`;

export const CREATE_CUESTIONARIO_MUTATION = gql`
  mutation CreateCuestionario($object: cuestionario_insert_input!) {
    insert_cuestionario_one(object: $object) {
      id
      clase_id
      estado
    }
  }
`;

export const CREATE_RESPUESTA_MUTATION = gql`
  mutation CreateRespuesta($object: respuesta_insert_input!) {
    insert_respuesta_one(object: $object) {
      id
      cuestionario_id
      estudiante_id
      pregunta_id
      estudiante_evaluado_id
      valor_respuesta
      created_at
      updated_at
    }
  }
`;

export const UPDATE_RESPUESTA_MUTATION = gql`
  mutation UpdateRespuesta(
    $cuestionario_id: uuid!,
    $estudiante_id: uuid!,
    $pregunta_id: uuid!,
    $estudiante_evaluado_id: uuid!,
    $valor_respuesta: String!
  ) {
    update_respuesta(
      where: {
        cuestionario_id: { _eq: $cuestionario_id },
        estudiante_id: { _eq: $estudiante_id },
        pregunta_id: { _eq: $pregunta_id },
        estudiante_evaluado_id: { _eq: $estudiante_evaluado_id }
      },
      _set: { valor_respuesta: $valor_respuesta }
    ) {
      returning {
        id
        cuestionario_id
        estudiante_id
        pregunta_id
        estudiante_evaluado_id
        valor_respuesta
        created_at
        updated_at
      }
    }
  }
`;

export const UPSERT_RESPUESTA_MUTATION = gql`
  mutation UpsertRespuesta(
    $cuestionario_id: uuid!
    $estudiante_id: uuid!
    $pregunta_id: uuid!
    $estudiante_evaluado_id: uuid!
    $valor_respuesta: String!
  ) {
    insert_respuesta(
      objects: {
        cuestionario_id: $cuestionario_id
        estudiante_id: $estudiante_id
        pregunta_id: $pregunta_id
        estudiante_evaluado_id: $estudiante_evaluado_id
        valor_respuesta: $valor_respuesta
      }
      on_conflict: {
        constraint: respuesta_cuestionario_id_pregunta_id_estudiante_id_estudiante_
        update_columns: [valor_respuesta, updated_at]
      }
    ) {
      affected_rows
      returning {
        id
        created_at
        updated_at
      }
    }
  }
`;
