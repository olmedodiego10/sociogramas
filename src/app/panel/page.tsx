"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import '../sociogramas.css';

export default function Panel() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<{ email: string } | null>(null);

  useEffect(() => {
    // Si no hay usuario en localStorage, redirige a login
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("usuario");
      if (!userStr) {
        router.replace("/login");
      } else {
        try {
          setUsuario(JSON.parse(userStr));
        } catch {
          setUsuario(null);
        }
      }
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("usuario");
    router.replace("/login");
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
      {/* Aquí puedes agregar botones, tablas o componentes según lo que necesites mostrar en el panel */}
    </div>
  );
}
