"use client";
import React, { useEffect, useId, useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { GET_USUARIO_QUERY } from '@/graphql/queries';
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [datosLogin, setDatosLogin] = useState({ email: '', password: '' });
  const [mensaje, setMensaje] = useState<string | null>(null);
  const idEmail = useId();
  const idPassword = useId();

  // Apollo Query
  const [getUsuario, { loading, data, error }] = useLazyQuery(GET_USUARIO_QUERY);

  useEffect(() => {
    if (localStorage.getItem('usuario') !== null) {
      setMensaje('Ya has iniciado sesión');
      setTimeout(() => {
        router.push("/panel");
      }, 1000);
    }
  }, [router]);

interface DatosLogin {
    email: string;
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
        await getUsuario({ variables: { usuario: datosLogin.email } });
    } catch (err) {
        setMensaje('Error al conectar con el servidor.');
    }
};

  useEffect(() => {
    if (data && data.usuario && data.usuario.length > 0) {
      const usuarioDb = data.usuario[0];
      console.log('Usuario recibido en login:', usuarioDb);
      if (usuarioDb.password === datosLogin.password) {
        localStorage.setItem('usuario', JSON.stringify(usuarioDb));
        setMensaje('Sesión iniciada con éxito. ¡Bienvenido! 😎');
        setDatosLogin({ email: '', password: '' });
        setTimeout(() => {
          router.push("/panel");
        }, 1000);
      } else {
        setMensaje('Contraseña incorrecta.');
      }
    } else if (data && data.usuario && data.usuario.length === 0) {
      setMensaje('Usuario no encontrado.');
    }
    if (error) {
      setMensaje('Error al consultar el usuario.');
    }
  }, [data, error, router]);

  return (
    <div>
      <form onSubmit={manejarEnvio} className="login">
        <h2>Iniciar sesión</h2>
        <label htmlFor={idEmail}>Email</label>
        <input
          name="email"
          type="text"
          id="email-input"
          placeholder="Email"
          value={datosLogin.email}
          onChange={manejarCambioEntrada}
          required
          autoComplete="email"
        />
        <label htmlFor="password-input">Contraseña</label>
        <input
          name="password"
          type="password"
          id="password-input"
          placeholder="Contraseña"
          value={datosLogin.password}
          onChange={manejarCambioEntrada}
          required
          autoComplete="current-password"
        />
        <button
          type="submit"
          className={`btn btn-primary${(!datosLogin.email || !datosLogin.password || loading) ? " disabled" : ""}`}
          disabled={!datosLogin.email || !datosLogin.password || loading}
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
        <Link href="/" className="login-link" style={{ display: 'block', marginTop: 16 }}>
          Regresar
        </Link>
        {mensaje && <p style={{ marginTop: 16, color: mensaje.includes('éxito') || mensaje.includes('Bienvenido') ? 'green' : 'red' }}>{mensaje}</p>}
      </form>
    </div>
  );
}