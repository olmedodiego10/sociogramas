import React from "react";
import Image from "next/image";

export function HeaderSociogramas() {
  return (
    <div className="header">
      <h1>
        <Image
          src="/icon.png"
          alt="Icono de sistema"
          width={40}
          height={40}
          style={{ verticalAlign: "middle", marginRight: "0.1em", display: "inline-block" }}
        />
        Sistema de Sociogramas
      </h1>
      <p>Herramienta inteligente para la formación de grupos basada en afinidades</p>
    </div>
  );
}
