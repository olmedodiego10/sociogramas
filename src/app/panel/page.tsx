"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client";
import { CREATE_CLASE_MUTATION } from "@/graphql/mutations";
import { GET_CLASES_QUERY } from "@/graphql/queries";
import '../sociogramas.css';
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
    } catch (err) {
      alert("Error al crear la clase");
    }
  };

  return (
      <div className="panel-container">
      <h2 className="panel-title">Panel de gestión de sociogramas</h2>
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
        Aquí podrás gestionar los grupos, ver resultados y administrar usuarios.
      </p>
      <button
        className="panel-logout-btn"
        style={{ background: '#1976d2', margin: '24px auto 0', display: 'block' }}
        onClick={() => setShowCrearClase(v => !v)}
      >
        Crear clase
      </button>
      {showCrearClase && (
        <form onSubmit={handleSubmit} style={{ textAlign: 'center', marginTop: 24 }}>
          <input
            type="text"
            placeholder="Nombre de la clase"
            value={identificador}
            onChange={e => setIdentificador(e.target.value)}
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", marginRight: 12 }}
          />
          <button type="submit" className="panel-logout-btn" style={{ background: '#388e3c' }}>
            Guardar
          </button>
        </form>
      )}
      <hr style={{ margin: '32px 0' }} />
      <h3 style={{ textAlign: 'center', marginBottom: 12 }}>Clases creadas</h3>
      <ul style={{ maxWidth: 400, margin: '0 auto', padding: 0, listStyle: 'none' }}>
        {clasesData?.clase?.map((cl: any) => (
          <li key={cl.id} style={{ padding: 8, borderBottom: '1px solid #eee' }}>
            <strong>{cl.identificador}</strong>
          </li>
        ))}
      </ul>
      {/* Aquí puedes agregar botones, tablas o componentes según lo que necesites mostrar en el panel */}
    </div>
  );
}