"use client";
import React, { useEffect, useState } from "react";
import { toast } from 'react-toastify';
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client";
import { CREATE_CLASE_MUTATION, CREATE_CUESTIONARIO_MUTATION, UPDATE_CUESTIONARIO_ESTADO_MUTATION, UPDATE_ESTUDIANTE_CUESTIONARIO_MUTATION } from "@/graphql/mutations";
import { GET_CLASES_QUERY, GET_CUESTIONARIOS_QUERY } from "@/graphql/queries";
import '../sociogramas.css';
import Link from "next/link";

function Panel() {
  const isMounted = React.useRef(true);
  const router = useRouter();
  const [usuario, setUsuario] = useState<{ id: string; email: string } | null>(null);
  const [showCrearClase, setShowCrearClase] = useState(false);
  const [identificador, setIdentificador] = useState("");
  const [createClase] = useMutation(CREATE_CLASE_MUTATION);
  const [createCuestionario] = useMutation(CREATE_CUESTIONARIO_MUTATION);
  const [updateCuestionarioEstado] = useMutation(UPDATE_CUESTIONARIO_ESTADO_MUTATION);
  const [updateEstudianteCuestionario] = useMutation(UPDATE_ESTUDIANTE_CUESTIONARIO_MUTATION);
  const { data: clasesData, refetch: refetchClases, client } = useQuery(GET_CLASES_QUERY);
  const [cuestionariosPorClase, setCuestionariosPorClase] = useState<any>({});

  // Obtener el último cuestionario ACTIVO de cada clase
  useEffect(() => {
    isMounted.current = true;
    const fetchCuestionariosActivos = async () => {
      if (!clasesData?.clase) return;
      const cuestionarios: Record<string, any> = {};
      for (const cl of clasesData.clase) {
        try {
          const { data } = await client.query({
            query: GET_CUESTIONARIOS_QUERY,
            variables: { claseId: cl.id },
            fetchPolicy: 'network-only',
          });
          // Filtrar solo los cuestionarios con estado ACTIVA y tomar el más reciente
          const activos = (data?.cuestionario || []).filter((q: any) => q.estado === 'ACTIVA');
          cuestionarios[cl.id] = activos.length > 0 ? activos[0] : null;
        } catch (err) {
          cuestionarios[cl.id] = null;
        }
      }
      setCuestionariosPorClase(cuestionarios);
    };
    if (clasesData?.clase?.length > 0) {
      fetchCuestionariosActivos();
    }
    return () => {
      isMounted.current = false;
    };
  }, [clasesData, client]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("usuario");
      if (userStr) {
        try {
          const userObj = JSON.parse(userStr);
          setUsuario(userObj);
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
      if (isMounted.current) toast.success('Clase creada con éxito');
    } catch (err) {
      if (isMounted.current) toast.error("Error al crear la clase");
    }
  };

  // Refrescar cuestionarios de una clase
  const refrescarCuestionariosClase = async (claseId: string) => {
    try {
      const { data } = await client.query({
        query: GET_CUESTIONARIOS_QUERY,
        variables: { claseId },
        fetchPolicy: 'network-only',
      });
      const activos = (data?.cuestionario || []).filter((q: any) => q.estado === 'ACTIVA');
      setCuestionariosPorClase((prev: any) => ({ ...prev, [claseId]: activos.length > 0 ? activos[0] : null }));
      return true;
    } catch (err) {
      if (isMounted.current) toast.error('Error al refrescar cuestionarios');
      return false;
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
          <button type="submit" className="panel-btn">
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
                  className="panel-btn"
                >
                  Gestión estudiantes
                </Link>
                <button
                  type="button"
                  className="panel-btn panel-btn-gray"
                  onClick={async () => {
                    if (!cuestionariosPorClase[cl.id]) {
                      // Iniciar cuestionario
                      try {
                        const { data: cuestionarioData } = await createCuestionario({
                          variables: {
                            object: {
                              clase_id: cl.id,
                              estado: 'ACTIVA',
                            },
                          },
                        });
                        const nuevoCuestionarioId = cuestionarioData?.insert_cuestionario_one?.id;
                        if (nuevoCuestionarioId) {
                          // Obtener estudiantes de la clase
                          const { data: estudiantesData } = await client.query({
                            query: require('@/graphql/queries').GET_ESTUDIANTES_QUERY,
                            variables: { claseId: cl.id },
                            fetchPolicy: 'network-only',
                          });
                          const estudiantes = estudiantesData?.estudiante || [];
                          if (estudiantes.length === 0) {
                            toast.info('No hay estudiantes en la clase');
                          } else {
                            // Actualizar cuestionario_id para cada estudiante
                            await Promise.all(estudiantes.map((est: any) =>
                              updateEstudianteCuestionario({
                                variables: {
                                  id: est.id,
                                  cuestionario_id: nuevoCuestionarioId,
                                },
                              })
                            ));
                          }
                        }
                        toast.success('Cuestionario iniciado');
                        await refrescarCuestionariosClase(cl.id);
                      } catch (err) {
                        toast.error('Error al iniciar el cuestionario');
                      }
                    } else {
                      // Cerrar cuestionario
                      try {
                        await updateCuestionarioEstado({
                          variables: {
                            id: cuestionariosPorClase[cl.id].id,
                            estado: 'CERRADA' as any,
                          },
                        });
                        // Obtener estudiantes de la clase
                        const { data: estudiantesData } = await client.query({
                          query: require('@/graphql/queries').GET_ESTUDIANTES_QUERY,
                          variables: { claseId: cl.id },
                          fetchPolicy: 'network-only',
                        });
                        const estudiantes = estudiantesData?.estudiante || [];
                        if (estudiantes.length > 0) {
                          // Actualizar cuestionario_id a null para cada estudiante
                          await Promise.all(estudiantes.map((est: any) =>
                            updateEstudianteCuestionario({
                              variables: {
                                id: est.id,
                                cuestionario_id: null,
                              },
                            })
                          ));
                        }
                        if (isMounted.current) {
                          toast.warn('Cuestionario cerrado');
                        }
                        await refrescarCuestionariosClase(cl.id);
                      } catch (err) {
                        console.error('Error al cerrar el cuestionario:', err);
                        toast.error('Error al cerrar el cuestionario');
                      }
                    }
                  }}
                >
                  {cuestionariosPorClase[cl.id] ? 'Cerrar cuestionario' : 'Iniciar cuestionario'}
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
    </div>
  );
}
export default Panel;
