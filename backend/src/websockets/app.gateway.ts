import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'],
    credentials: true,
  },
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: any) {
    console.log(`Client connected: ${client.id}`);
    this.server.emit('serverStatus', { status: 'online', clients: this.getConnectedClients() });
  }

  handleDisconnect(client: any) {
    console.log(`Client disconnected: ${client.id}`);
    this.server.emit('serverStatus', { status: 'online', clients: this.getConnectedClients() });
  }

  private getConnectedClients(): number {
    return this.server?.sockets?.sockets?.size || 0;
  }

  emitServerStatus() {
    this.server.emit('serverStatus', { 
      status: 'online', 
      clients: this.getConnectedClients(),
      timestamp: Date.now() 
    });
  }
}
