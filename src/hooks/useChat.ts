
import { useState, useCallback } from 'react';
import { chatService, ChatMessage, ChatUser } from '@/services/chatService';
import { useToast } from '@/hooks/use-toast';

export const useChat = () => {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeUsers, setActiveUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const connect = useCallback(async (username: string) => {
    if (!username.trim()) {
      toast({
        title: "Username required",
        description: "Please enter a username to join the chat",
        variant: "destructive",
      });
      return false;
    }

    setLoading(true);
    console.log('Attempting to connect to WebSocket server...');
    
    try {
      await chatService.connect(username);
      setConnected(true);
      
      // Subscribe to messages
      chatService.subscribeToMessages((message) => {
        console.log('Received message:', message);
        setMessages(prev => [...prev, message]);
      });

      // Subscribe to user updates
      chatService.subscribeToUsers((users) => {
        console.log('Updated users:', users);
        setActiveUsers(users);
      });

      // Add system message for successful connection
      const joinMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: 'System',
        content: `${username} joined the chat`,
        timestamp: new Date(),
        type: 'system'
      };
      setMessages(prev => [...prev, joinMessage]);

      toast({
        title: "Connected!",
        description: "You've successfully joined the chat",
      });

      return true;
    } catch (error) {
      console.error('Failed to connect to chat service:', error);
      setConnected(false);
      
      toast({
        title: "Connection failed",
        description: "Could not connect to the WebSocket server at localhost:8080. Please ensure the server is running.",
        variant: "destructive",
      });
      
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const disconnect = useCallback(() => {
    console.log('Disconnecting from chat service...');
    chatService.disconnect();
    setConnected(false);
    setMessages([]);
    setActiveUsers([]);
    
    toast({
      title: "Disconnected",
      description: "You've left the chat",
    });
  }, [toast]);

  const sendMessage = useCallback((content: string) => {
    if (!content.trim() || !connected) return;

    console.log('Sending message:', content);
    chatService.sendMessage(content);
  }, [connected]);

  return {
    connected,
    messages,
    activeUsers,
    loading,
    connect,
    disconnect,
    sendMessage,
  };
};
