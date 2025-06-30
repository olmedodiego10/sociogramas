import { gql } from '@apollo/client';

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
