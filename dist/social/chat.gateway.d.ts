import { OnGatewayConnection } from '@nestjs/websockets';
import { Server } from 'socket.io';
export declare class ChatGateway implements OnGatewayConnection {
    server: Server;
    handleConnection(client: any): void;
    sendMessageToUI(message: any): void;
}
