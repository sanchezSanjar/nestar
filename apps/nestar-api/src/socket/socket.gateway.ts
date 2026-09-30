import { Logger } from '@nestjs/common';
import {
	OnGatewayInit,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'ws';
import * as WebSocket from "ws";
import * as url from "url";
import { AuthService } from '../components/auth/auth.service';
import {Member} from '../libs/dto/member/member';

interface MessagePayload {
	event: string;
	text: string;
	memberData: Member | null;
}

interface InfoPayLoad {
	event: string;
	totalClients: number;
	memberData: Member | null;
   	action: string;
}

@WebSocketGateway({ transports: ['websocket'] })
export class SocketGateway implements OnGatewayInit {
	private logger: Logger = new Logger('SocketEventsGateway');
	private clientsAuthMap = new Map<WebSocket, Member | null>();
  	private messageList: MessagePayload[] = [];

	constructor(private authService: AuthService) {}

	@WebSocketServer()
	server: Server;

	public afterInit(server: Server) {
		this.logger.verbose(`WebSocket Server Initialized & total: [${this.clientsAuthMap.size}]`);
	}

	private async retrieveAuth(req:any): Promise<Member | null> {
		try {
			const parseUrl = url.parse(req.url, true),
			{ token } = parseUrl.query;
			console.log('token:', token);
			return await this.authService.verifyToken(token as string);
		} catch (err) {
			return null;
		}
	}

	public async handleConnection(client: WebSocket, req: any) {
		const authMember = await this.retrieveAuth(req);
		console.log('authMember:', authMember);
		// client may have disconnected while the token was being verified
		if (client.readyState !== WebSocket.OPEN) return;
		// client => authMember

		this.clientsAuthMap.set(client, authMember);

		const clientNick: string = authMember?.memberNick ?? "Guest";
    	this.logger.verbose(`Connection [${clientNick}] & total [${this.clientsAuthMap.size}]`);

		const infoMsg: InfoPayLoad = {
			event: "info",
			totalClients: this.clientsAuthMap.size,
			memberData: authMember,
			action: "joined"
		};
		this.emitMessage(infoMsg);
		 // CLIENT MESSAGES
   		 client.send(JSON.stringify({event: "getMessages", list: this.messageList}))
	}

	public handleDisconnect(client: WebSocket) {
		// ignore clients that closed before handleConnection registered them
		if (!this.clientsAuthMap.has(client)) return;
		const authMember = this.clientsAuthMap.get(client) ?? null;
		this.clientsAuthMap.delete(client);

    	const clientNick: string = authMember?.memberNick ?? "Guest";
    	this.logger.verbose(`Disconnection [${clientNick}] & total [${this.clientsAuthMap.size}]`);


		const infoMsg: InfoPayLoad = {
			event: "info",
			totalClients: this.clientsAuthMap.size,
			memberData: authMember,
      		action: "left"
		};
		this.broadcastMessage(client, infoMsg);
	}

	@SubscribeMessage('message')
	public async handleMessage(client: WebSocket, payload: any): Promise<void> {
		const authMember = this.clientsAuthMap.get(client) ?? null;
    	const newMessage: MessagePayload = {event: "message", text: payload, memberData: authMember};

		const clientNick: string = authMember?.memberNick ?? "Guest";
		this.logger.verbose(`NEW MESSAGE [${clientNick}]: ${payload}`);

		this.messageList.push(newMessage);
		if(this.messageList.length > 5) this.messageList.splice(0, this.messageList.length - 5 )


		this.emitMessage(newMessage);
	}

	private broadcastMessage (sender: WebSocket, message: InfoPayLoad | MessagePayload) {
		this.clientsAuthMap.forEach((_member, client) => {
			if(client !== sender && client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(message));
			};
		});
 	};

	private emitMessage(message: InfoPayLoad | MessagePayload) {
		this.clientsAuthMap.forEach((_member, client) => {
			if(client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(message));
			}
		})
	}
}



/** 
 MESSAGE TARGET:
  1. Client (only sender)
  2. Broadcast (except sender)
  3. Emit (all clients)
**/