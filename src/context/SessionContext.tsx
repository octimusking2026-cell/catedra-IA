import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Usuario } from '../types';
import { auth, onAuthStateChanged, logout as firebaseLogout, User } from '../services/firebase';
import { api } from '../services/api';

interface SessionContextType {
  authUser: User | null;
  usuario: Usuario | null;
  authLoading: boolean;
  terminosAceptados: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUsuario: React.Dispatch<React.SetStateAction<Usuario | null>>;
  setTerminosAceptados: React.Dispatch<React.SetStateAction<boolean>>;
}

const SessionContext = createContext<SessionContextType | null>(null);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [terminosAceptados, setTerminosAceptados] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const perfilRes = await api.getPerfil();
      setUsuario(perfilRes.usuario);
      setTerminosAceptados(perfilRes.terminos_aceptados !== false);
    } catch (err) {
      console.error('Error refrescando perfil de usuario:', err);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      if (user) {
        try {
          const perfilRes = await api.getPerfil();
          setUsuario(perfilRes.usuario);
          setTerminosAceptados(perfilRes.terminos_aceptados !== false);
        } catch (err) {
          console.error('Error cargando usuario inicial:', err);
        }
      } else {
        setUsuario(null);
        setTerminosAceptados(true);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = useCallback(async () => {
    try {
      await firebaseLogout();
      setUsuario(null);
      setAuthUser(null);
      setTerminosAceptados(true);
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  }, []);

  return (
    <SessionContext.Provider
      value={{
        authUser,
        usuario,
        authLoading,
        terminosAceptados,
        logout,
        refreshUser,
        setUsuario,
        setTerminosAceptados,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export function useSession(): SessionContextType {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
