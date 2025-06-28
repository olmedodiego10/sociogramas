"use client";
import React, { useEffect, useId, useState, useCallback } from 'react';
import { useLazyQuery } from '@apollo/client';
import { GET_USUARIO_QUERY } from '@/graphql/queries';

export default function Login() {
  const [datosLogin, setDatosLogin] = useState({ usuario: '', password: '' });
  const [mensaje, setMensaje] = useState<string | null>(null);
  const idUsuario = useId();
  const idPassword = useId();

  // Apollo Query
  const [getUsuario, { loading, data, error }] = useLazyQuery(GET_USUARIO_QUERY);

  useEffect(() => {
    if (localStorage.getItem('usuario') !== null) {
      setMensaje('Ya has iniciado sesión');
    }
  }, []);

interface DatosLogin {
    usuario: string;
    password: string;
}

interface ManejarCambioEntradaEvent extends React.ChangeEvent<HTMLInputElement> {}

const manejarCambioEntrada = (e: ManejarCambioEntradaEvent): void => {
    setDatosLogin({ ...datosLogin, [e.target.name]: e.target.value });
};

interface ManejarEnvioEvent extends React.FormEvent<HTMLFormElement> {}

const manejarEnvio = async (e: ManejarEnvioEvent): Promise<void> => {
    e.preventDefault();
    setMensaje(null);
    try {
        await getUsuario({ variables: { usuario: datosLogin.usuario } });
    } catch (err) {
        setMensaje('Error al conectar con el servidor.');
    }
};

  useEffect(() => {
    if (data && data.usuario && data.usuario.length > 0) {
      const usuarioDb = data.usuario[0];
      if (usuarioDb.password === datosLogin.password) {
        //localStorage.setItem('usuario', JSON.stringify(usuarioDb));
        setMensaje('Sesión iniciada con éxito. ¡Bienvenido! 😎');
        setDatosLogin({ usuario: '', password: '' });
      } else {
        setMensaje('Contraseña incorrecta.');
      }
    } else if (data && data.usuario && data.usuario.length === 0) {
      setMensaje('Usuario no encontrado.');
    }
    if (error) {
      setMensaje('Error al consultar el usuario.');
    }
  }, [data, error]);

  return (
    <div>
      <form onSubmit={manejarEnvio} className="login">
        <h2>Iniciar sesión</h2>
        <label htmlFor={idUsuario}>Usuario</label>
        <input
          name="usuario"
          type="text"
          id={idUsuario}
          placeholder="Usuario"
          value={datosLogin.usuario}
          onChange={manejarCambioEntrada}
          required
        />
        <label htmlFor={idPassword}>Contraseña</label>
        <input
          name="password"
          type="password"
          id={idPassword}
          placeholder="Contraseña"
          value={datosLogin.password}
          onChange={manejarCambioEntrada}
          required
        />
        <button
          type="submit"
          className={`btn btn-primary${(!datosLogin.usuario || !datosLogin.password || loading) ? " disabled" : ""}`}
          disabled={!datosLogin.usuario || !datosLogin.password || loading}
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
        {mensaje && <p style={{ marginTop: 16, color: mensaje.includes('éxito') || mensaje.includes('Bienvenido') ? 'green' : 'red' }}>{mensaje}</p>}
      </form>
    </div>
  );
}