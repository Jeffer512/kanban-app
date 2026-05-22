import { useState, useEffect } from 'react';
import type { ReactNode } from 'react'; 
import api from '../api/axios';
import { AuthContext } from './AuthContext';

interface User {
  userId: string;
  username: string;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if the user is logged in when the app first loads
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get('/auth/me');
        setUser(response.data.user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    setUser(response.data.user);
  };

  const register = async (username: string, password: string) => {
    const response = await api.post('/auth/register', { username, password });
    setUser(response.data.user);
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};
