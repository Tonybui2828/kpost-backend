import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  handleConnection(client: any) {
    console.log('--- Một trình duyệt vừa kết nối vào Hộp thư CRM ---');
  }

  // Hàm để các Service khác gọi khi muốn đẩy tin nhắn lên Web
  sendMessageToUI(message: any) {
    this.server.emit('new_message', message);
  }
}