import { useEffect } from 'react';
import type { ReactNode } from 'react'; 
import socket from '../api/socket';
import { useAuth } from './AuthContext';
import { SocketContext } from './SocketContext';


export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (user) {
      socket.connect();
    } else {
      socket.disconnect();
    }

    return () => {
      socket.disconnect();
    }
  }, [user, loading]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};