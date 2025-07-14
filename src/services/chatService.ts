
import { Client } from '@stomp/stompjs';

export interface ChatMessage {
  id: string;
  sender: string;
  recipient?: string; // For private messages
  content: string;
  timestamp: Date;
  type: 'message' | 'system' | 'private';
}

export interface ChatUser {
  id: string;
  name: string;
  joinedAt: Date;
}

export class ChatService {
  private client: Client | null = null;
  private connected = false;
  private currentUsername: string = '';

  constructor(private serverUrl: string = 'ws://localhost:8080/ws') {
    console.log('ChatService initialized with URL:', serverUrl);
  }

  connect(username: string): Promise<void> {
    this.currentUsername = username;
    return new Promise((resolve, reject) => {
      try {
        console.log('Creating STOMP client for URL:', this.serverUrl);
        
        // Create STOMP client with direct WebSocket connection
        this.client = new Client({
          brokerURL: this.serverUrl,
          connectHeaders: {
            username: username,
            passcode: 'secret-key-123'
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
          reject(new Error(`STOMP error: ${frame.headers['message'] || 'Unknown error'}`));
        };

        // WebSocket error callback
        this.client.onWebSocketError = (error) => {
          console.error('WebSocket error:', error);
          this.connected = false;
          reject(new Error('WebSocket connection failed. Please check if the server is running on localhost:8080'));
        };

        // WebSocket close callback
        this.client.onWebSocketClose = (event) => {
          console.log('WebSocket connection closed:', event);
          this.connected = false;
        };

        // Set connection timeout
        setTimeout(() => {
          if (!this.connected) {
            reject(new Error('Connection timeout. Server may be unavailable.'));
          }
        }, 10000); // 10 second timeout

        // Activate the client
        console.log('Activating STOMP client...');
        this.client.activate();
      } catch (error) {
        console.error('Failed to create STOMP client:', error);
        reject(error);
      }
    });
  }

  subscribeToMessages(callback: (message: ChatMessage) => void): () => void {
    if (!this.client || !this.connected) {
      console.warn('Cannot subscribe to messages: client not connected');
      return () => {};
    }

    const subscription = this.client.subscribe('/topic/messages', (message) => {
      try {
        const parsedMessage = JSON.parse(message.body);
        console.log('Raw received message:', parsedMessage);
        
        // Create a proper ChatMessage object with required fields
        const chatMessage: ChatMessage = {
          id: parsedMessage.id || `msg-${Date.now()}-${Math.random()}`,
          sender: parsedMessage.sender || 'Unknown',
          content: parsedMessage.content || '',
          timestamp: new Date(parsedMessage.timestamp),
          type: 'message'
        };
        
        console.log('Processed chat message:', chatMessage);
        callback(chatMessage);
      } catch (error) {
        console.error('Failed to parse message:', error, message.body);
      }
    });

    return () => subscription.unsubscribe();
  }

  subscribeToPrivateMessages(callback: (message: ChatMessage) => void): () => void {
    if (!this.client || !this.connected) {
      console.warn('Cannot subscribe to private messages: client not connected');
      return () => {};
    }

    const subscription = this.client.subscribe(`/user/${this.currentUsername}/queue/private`, (message) => {
      try {
        const parsedMessage = JSON.parse(message.body);
        console.log('Raw received private message:', parsedMessage);
        
        // Create a proper ChatMessage object
        const chatMessage: ChatMessage = {
          id: parsedMessage.id || `private-${Date.now()}-${Math.random()}`,
          sender: parsedMessage.sender || 'Unknown',
          recipient: parsedMessage.recipient,
          content: parsedMessage.content || '',
          timestamp: new Date(parsedMessage.timestamp),
          type: 'private'
        };
        
        console.log('Processed private message:', chatMessage);
        callback(chatMessage);
      } catch (error) {
        console.error('Failed to parse private message:', error);
      }
    });

    return () => subscription.unsubscribe();
  }

  subscribeToUsers(callback: (users: ChatUser[]) => void): () => void {
    if (!this.client || !this.connected) {
      console.warn('Cannot subscribe to users: client not connected');
      return () => {};
    }

    console.log('Subscribing to /topic/users');
    const subscription = this.client.subscribe('/topic/users', (message) => {
      try {
        console.log('Raw users message received:', message.body);
        const users = JSON.parse(message.body);
        
        // Ensure users have proper structure
        const processedUsers: ChatUser[] = users.map((user: any) => ({
          id: user.id || user.name || `user-${Math.random()}`,
          name: user.name || user.username || 'Unknown',
          joinedAt: new Date(user.joinedAt || Date.now())
        }));
        
        console.log('Processed users:', processedUsers);
        callback(processedUsers);
      } catch (error) {
        console.error('Failed to parse users:', error, message.body);
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
      sender: this.currentUsername,
      timestamp: new Date().toISOString(),
    };

    console.log('Publishing message to /app/chat.sendMessage:', message);
    this.client.publish({
      destination: '/app/chat.sendMessage',
      body: JSON.stringify(message),
    });
  }

  sendPrivateMessage(content: string, recipient: string): void {
    if (!this.client || !this.connected) {
      console.warn('Cannot send private message: client not connected');
      return;
    }

    const message = {
      content,
      recipient,
      sender: this.currentUsername,
      timestamp: new Date().toISOString(),
    };

    console.log('Publishing private message to /app/chat.sendPrivateMessage:', message);
    this.client.publish({
      destination: '/app/chat.sendPrivateMessage',
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

  getCurrentUsername(): string {
    return this.currentUsername;
  }
}

// Singleton instance
export const chatService = new ChatService();
