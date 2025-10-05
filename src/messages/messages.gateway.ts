import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class MessagesGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  handleConnection(socket: any) {
    // cliente enviará: socket.emit('join', { conversationId })
    socket.on('join', ({ conversationId }) => {
      socket.join(`conv:${conversationId}`);
    });
    socket.on('leave', ({ conversationId }) => {
      socket.leave(`conv:${conversationId}`);
    });
  }

  emitMessage(conversationId: string, payload: any) {
    this.server.to(`conv:${conversationId}`).emit('message:new', payload);
  }

  emitDelete(conversationId: string, messageId: string) {
    this.server.to(`conv:${conversationId}`).emit('message:deleted', { messageId });
  }
}
