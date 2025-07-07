
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  type: 'message' | 'system';
}

export interface ChatUser {
  id: string;
  name: string;
  joinedAt: Date;
}

export class ChatService {
  private client: Client | null = null;
  private connected = false;

  constructor(private serverUrl: string = 'ws://localhost:8080/ws') {
    console.log('ChatService initialized with URL:', serverUrl);
  }

  connect(username: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create STOMP client with SockJS
        this.client = new Client({
          webSocketFactory: () => new SockJS(this.serverUrl),
          connectHeaders: {
            username: username,
          },
          debug: (str) => {
            console.log('STOMP Debug:', str);
          },
          reconnectDelay: 5000,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
        });

        // Connection success callback
        this.client.onConnect = (frame) => {
          console.log('Connected to STOMP server:', frame);
          this.connected = true;
          resolve();
        };

        // Connection error callback
        this.client.onStompError = (frame) => {
          console.error('STOMP error:', frame);
          this.connected = false;
          reject(new Error(`STOMP error: ${frame.headers['message']}`));
        };

        // WebSocket error callback
        this.client.onWebSocketError = (error) => {
          console.error('WebSocket error:', error);
          this.connected = false;
          reject(error);
        };

        // Activate the client
        this.client.activate();
      } catch (error) {
        console.error('Failed to create STOMP client:', error);
        reject(error);
      }
    });
  }

  subscribeToMessages(callback: (message: ChatMessage) => void): () => void {
    if (!this.client || !this.connected) {
      console.warn('Cannot subscribe: client not connected');
      return () => {};
    }

    const subscription = this.client.subscribe('/topic/messages', (message) => {
      try {
        const parsedMessage: ChatMessage = JSON.parse(message.body);
        callback(parsedMessage);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    });

    return () => subscription.unsubscribe();
  }

  subscribeToUsers(callback: (users: ChatUser[]) => void): () => void {
    if (!this.client || !this.connected) {
      console.warn('Cannot subscribe: client not connected');
      return () => {};
    }

    const subscription = this.client.subscribe('/topic/users', (message) => {
      try {
        const users: ChatUser[] = JSON.parse(message.body);
        callback(users);
      } catch (error) {
        console.error('Failed to parse users:', error);
      }
    });

    return () => subscription.unsubscribe();
  }

  sendMessage(content: string): void {
    if (!this.client || !this.connected) {
      console.warn('Cannot send message: client not connected');
      return;
    }

    const message = {
      content,
      timestamp: new Date().toISOString(),
    };

    this.client.publish({
      destination: '/app/chat.sendMessage',
      body: JSON.stringify(message),
    });
  }

  disconnect(): void {
    if (this.client) {
      this.client.deactivate();
      this.connected = false;
      console.log('Disconnected from STOMP server');
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// Singleton instance
export const chatService = new ChatService();
