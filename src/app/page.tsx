"use client";
import Link from "next/link";
import { useState } from "react";

export default function Home() {
  const [numero, setNumero] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNumero(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí puedes manejar la lógica de continuar
    alert(`Número ingresado: ${numero}`);
  };

  return (
    <div className="login">
      <form onSubmit={handleSubmit}>
        <h2>Ingrese su código de estudiante</h2>
        <label htmlFor="numero-estudiante">Código de estudiante</label>
        <input
          id="codigo-estudiante"
          type="text"
          placeholder="Tú código..."
          value={numero}
          onChange={handleChange}
          required
        />
        <button type="submit" className="btn btn-primary">
          Continuar
        </button>
      </form>
      <Link href="/login" className="login-link">
        O inicia sesión para gestionar tus sociogramas
      </Link>
    </div>
  );
}
