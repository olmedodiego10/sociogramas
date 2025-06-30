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