import { Logger } from '@nestjs/common';
import { OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'ws';
import * as WebSocket from "ws";

interface MessagePayload {
	event: string;
	text: string;
}

interface InfoPayLoad {
	event: string;
	totalClients: number;
}

@WebSocketGateway({ transports: ['websocket'], secure: false })
export class SocketGateway implements OnGatewayInit {
	private logger: Logger = new Logger('SocketEventsGateway');
	private summaryClient: number = 0;

	@WebSocketServer()
	server: Server;

	public afterInit(server: Server) {
		this.logger.verbose(`WebSocket Server Initialized & total: [${this.summaryClient}]`);
	}

	handleConnection(client: WebSocket, ...args: any[]) {
		this.summaryClient++;
		this.logger.verbose(`=== Client & connected total [${this.summaryClient}]`);

		const infoMsg: InfoPayLoad = {
			event: "info",
			totalClients: this.summaryClient,
		};
		this.emitMessage(infoMsg);

	}

	handleDisconnect(client: WebSocket) {
		this.summaryClient--;
		this.logger.verbose(`Disconnect & total [${this.summaryClient}]`);

		const infoMsg: InfoPayLoad = {
			event: "info",
			totalClients: this.summaryClient,
		};
		// client - disconnect
		this.broadcastMessage(client, infoMsg);
	}

	@SubscribeMessage('message')
	public async handleMessage(client: WebSocket, payload: any): Promise<string> {
		const newmessage: MessagePayload = { event: 'message', text: payload};

		this.logger.verbose(`NEW MESSAGE: ${payload}`);
		this.emitMessage(newmessage);
		return 'Hello world!';
	}
	private broadcastMessage (sender: WebSocket, message: InfoPayLoad | MessagePayload) {
		this.server.clients.forEach((client) => {
			if(client !== sender && client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(message));
			};
		});
 	};

	private emitMessage(message: InfoPayLoad | MessagePayload) {
		this.server.clients.forEach((client) => {
			if(client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(message));
			}
		})
	}
}