# Componentes Reutilizables

## EstadoCuestionario

Componente que muestra el estado de finalización de un cuestionario para un estudiante específico.

### Uso

```tsx
import { EstadoCuestionario } from "@/components";

// En tu componente
<EstadoCuestionario 
    estudianteId={estudiante.id} 
    cuestionarioId={estudiante.cuestionario_id}
/>
```

### Props

| Prop | Tipo | Descripción |
|------|------|-------------|
| `estudianteId` | `string` | ID único del estudiante |
| `cuestionarioId` | `string \| null` | ID del cuestionario asignado al estudiante (puede ser null) |

### Estados que muestra

- **Sin cuestionario asignado**: Cuando `cuestionarioId` es `null`
- **Verificando estado**: Durante la carga de datos
- **Cuestionario completado**: Cuando el estudiante ha respondido la última pregunta
- **Cuestionario pendiente**: Cuando el estudiante aún no ha completado el cuestionario
- **Error al verificar**: Cuando hay problemas obteniendo la información

### Dependencias

Este componente requiere que estén configurados los siguientes providers en tu aplicación:

- `EstudiantesProvider` - Para obtener información de la última pregunta
- `RespuestasProvider` - Para obtener las respuestas del cuestionario

### Estilos CSS requeridos

El componente usa las siguientes clases CSS que deben estar definidas:

```css
.estado-cuestionario { /* Estilos base */ }
.estado-cuestionario-sin-asignar { /* Para cuando no hay cuestionario */ }
.estado-cuestionario-verificando { /* Para estado de carga */ }
.estado-cuestionario-error { /* Para errores */ }
.estado-cuestionario-completado { /* Para cuestionarios completados */ }
.estado-cuestionario-pendiente { /* Para cuestionarios pendientes */ }
```

### Ejemplo completo

```tsx
import { EstadoCuestionario } from "@/components";
import { useEstudiantes } from "@/context/EstudiantesContext";

export default function MiPagina() {
    const { estudiantes } = useEstudiantes();
    
    return (
        <div>
            {estudiantes.map((estudiante) => (
                <div key={estudiante.id}>
                    <h3>{estudiante.nombre}</h3>
                    <EstadoCuestionario 
                        estudianteId={estudiante.id} 
                        cuestionarioId={estudiante.cuestionario_id}
                    />
                </div>
            ))}
        </div>
    );
}
```
