import { createContext, useContext } from 'react';
import socket from '../api/socket';

export const SocketContext = createContext(socket);

export const useSocket = () => useContext(SocketContext);