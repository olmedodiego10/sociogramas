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
