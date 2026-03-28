import { useSocket } from '../hooks/useSocket';

export function ConnectionStatus() {
  const { isConnected } = useSocket();

  return (
    <div className="connection-status">
      <span className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
      <span className={`status-text ${isConnected ? 'online' : 'offline'}`}>
        {isConnected ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}
