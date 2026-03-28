import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface ServerStatus {
  status: 'online' | 'offline';
  clients: number;
  timestamp?: number;
}

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [serverStatus, setServerStatus] = useState<ServerStatus>({ status: 'offline', clients: 0 });
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
      setServerStatus(prev => ({ ...prev, status: 'offline' }));
    });

    newSocket.on('connect_error', () => {
      setIsConnected(false);
      setServerStatus({ status: 'offline', clients: 0 });
    });

    newSocket.on('serverStatus', (data: ServerStatus) => {
      setServerStatus(data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return {
    socket,
    isConnected,
    serverStatus,
  };
}
