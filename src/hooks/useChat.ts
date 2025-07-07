
import { useState, useEffect, useCallback } from 'react';
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
    try {
      await chatService.connect(username);
      setConnected(true);
      
      // Subscribe to messages
      const unsubscribeMessages = chatService.subscribeToMessages((message) => {
        setMessages(prev => [...prev, message]);
      });

      // Subscribe to user updates
      const unsubscribeUsers = chatService.subscribeToUsers((users) => {
        setActiveUsers(users);
      });

      toast({
        title: "Connected!",
        description: "You've successfully joined the chat",
      });

      // Store unsubscribe functions for cleanup
      return () => {
        unsubscribeMessages();
        unsubscribeUsers();
      };
    } catch (error) {
      console.error('Failed to connect to chat:', error);
      toast({
        title: "Connection failed",
        description: "Could not connect to chat service. Using demo mode.",
        variant: "destructive",
      });
      
      // Fallback to demo mode
      setConnected(true);
      return () => {};
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const disconnect = useCallback(() => {
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

    if (chatService.isConnected()) {
      chatService.sendMessage(content);
    } else {
      // Demo mode - add message locally
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: 'You',
        content,
        timestamp: new Date(),
        type: 'message'
      };
      setMessages(prev => [...prev, newMessage]);
    }
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
