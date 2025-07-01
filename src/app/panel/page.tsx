"use client";
import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client";
import { CREATE_CLASE_MUTATION } from "@/graphql/mutations";
import { GET_CLASES_QUERY } from "@/graphql/queries";
import '../sociogramas.css';
import Link from "next/link";
export default function Panel() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<{ id: string; email: string } | null>(null);
  const [showCrearClase, setShowCrearClase] = useState(false);
  const [identificador, setIdentificador] = useState("");
  const [createClase] = useMutation(CREATE_CLASE_MUTATION);
  const { data: clasesData, refetch: refetchClases } = useQuery(GET_CLASES_QUERY);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("usuario");
      if (userStr) {
        try {
          const userObj = JSON.parse(userStr);
          setUsuario(userObj);
          console.log('Usuario cargado en panel:', userObj);
        } catch {
          setUsuario(null);
        }
      } else {
        setUsuario(null);
      }
    }
  }, [router, showCrearClase]);

  const handleLogout = () => {
    localStorage.removeItem("usuario");
    router.replace("/login");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!usuario?.id) throw new Error('Usuario sin id');
      await createClase({ variables: { object: { identificador, usuario_id: usuario.id } } });
      setIdentificador("");
      setShowCrearClase(false);
      refetchClases();
      toast.success('Clase creada con éxito');
    } catch (err) {
      toast.error("Error al crear la clase");
    }
  };

  return (
      <div className="panel-container">
      <h2 className="panel-form-title">Panel de gestión de sociogramas</h2>
      {usuario && (
        <div className="panel-user-bar">
          <span className="panel-user-email">
            Usuario: {usuario.email}
          </span>
          <button onClick={handleLogout} className="panel-logout-btn">
            Cerrar sesión
          </button>
        </div>
      )}
      <p className="panel-description">
        Descripción pendiente.
      </p>
      <button
        className="panel-btn"
        style={{ margin: '24px auto 0', display: 'block' }}
        onClick={() => setShowCrearClase(v => !v)}
      >
        Crear clase
      </button>
      {showCrearClase && (
        <form onSubmit={handleSubmit} className="panel-form">
          <h2 className="panel-form-title">Crear clase</h2>
          <input
            type="text"
            className="panel-input"
            id="identificador"
            name="identificador"
            placeholder="Nombre de la clase"
            value={identificador}
            onChange={e => setIdentificador(e.target.value)}
            required
            autoComplete="off"
            aria-label="Nombre de la clase"
          />
          <button type="submit" className="panel-btn panel-btn-green">
            Guardar
          </button>
        </form>
      )}
      <hr className="panel-divider" />
      <h2 className="panel-form-title">Clases creadas</h2>
      <ul className="panel-list">
        {clasesData?.clase?.map((cl: any) => (
          <li key={cl.id} className="panel-list-item">
            <div style={{ width: '100%' }}>
              <div style={{ fontWeight: 600, fontSize: '1.15em', marginBottom: 8 }}>{cl.identificador}</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Link
                  href={{ pathname: '/clases', query: { id: cl.id, identificador: cl.identificador } }}
                  className="panel-btn panel-btn-green"
                >
                  Gestión estudiantes
                </Link>
                <button
                  type="button"
                  className="panel-btn panel-btn-gray"
                  // TODO: onClick para iniciar cuestionario
                >
                  Iniciar cuestionario
                </button>
                <button
                  type="button"
                  className="panel-btn panel-btn-orange"
                  // TODO: onClick para grupos
                >
                  Grupos
                </button>
                <button
                  type="button"
                  className="panel-btn-blue"
                  // TODO: onClick para dashboard
                >
                  Dashboard
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <ToastContainer position="bottom-right" autoClose={4000} hideProgressBar={false} newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover />
    </div>
  );
}