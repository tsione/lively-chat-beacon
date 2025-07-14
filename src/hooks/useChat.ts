
import { useState, useCallback, useEffect } from 'react';
import { chatService, ChatMessage, ChatUser } from '@/services/chatService';
import { useToast } from '@/hooks/use-toast';

export const useChat = () => {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [privateMessages, setPrivateMessages] = useState<ChatMessage[]>([]);
  const [activeUsers, setActiveUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
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
      
      // Subscribe to public messages
      chatService.subscribeToMessages((message) => {
        console.log('Received public message in hook:', message);
        setMessages(prev => [...prev, message]);
      });

      // Subscribe to private messages
      chatService.subscribeToPrivateMessages((message) => {
        console.log('Received private message in hook:', message);
        setPrivateMessages(prev => [...prev, message]);
        
        // Show toast notification for private messages
        toast({
          title: `Private message from ${message.sender}`,
          description: message.content,
        });
      });

      // Subscribe to user updates with better error handling
      chatService.subscribeToUsers((users) => {
        console.log('Updated users in hook:', users);
        console.log('Number of users received:', users.length);
        
        // Ensure current user is included in the list
        const currentUser = chatService.getCurrentUsername();
        const hasCurrentUser = users.some(user => user.name === currentUser);
        
        let finalUsers = [...users];
        if (!hasCurrentUser && currentUser) {
          console.log('Adding current user to the list:', currentUser);
          finalUsers.push({
            id: currentUser,
            name: currentUser,
            joinedAt: new Date()
          });
        }
        
        console.log('Final users list:', finalUsers);
        setActiveUsers(finalUsers);
      });

      // Add system message for successful connection
      const joinMessage: ChatMessage = {
        id: `system-${Date.now()}`,
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

      // Request current user list after connection
      setTimeout(() => {
        console.log('Requesting user list update...');
        // This might help trigger the server to send the current user list
      }, 1000);

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
    setPrivateMessages([]);
    setActiveUsers([]);
    setSelectedUser(null);
    
    toast({
      title: "Disconnected",
      description: "You've left the chat",
    });
  }, [toast]);

  const sendMessage = useCallback((content: string) => {
    if (!content.trim() || !connected) return;

    console.log('Sending public message:', content);
    chatService.sendMessage(content);
  }, [connected]);

  const sendPrivateMessage = useCallback((content: string, recipient: string) => {
    if (!content.trim() || !connected || !recipient) return;

    console.log('Sending private message to:', recipient, content);
    chatService.sendPrivateMessage(content, recipient);
    
    // Add the message to local state for display
    const privateMessage: ChatMessage = {
      id: `private-${Date.now()}-${Math.random()}`,
      sender: chatService.getCurrentUsername(),
      recipient,
      content,
      timestamp: new Date(),
      type: 'private'
    };
    setPrivateMessages(prev => [...prev, privateMessage]);
  }, [connected]);

  const getPrivateMessagesForUser = useCallback((username: string) => {
    const currentUser = chatService.getCurrentUsername();
    return privateMessages.filter(msg => 
      (msg.sender === currentUser && msg.recipient === username) ||
      (msg.sender === username && msg.recipient === currentUser)
    );
  }, [privateMessages]);

  // Debug effect to monitor activeUsers changes
  useEffect(() => {
    console.log('ActiveUsers state changed:', activeUsers);
    console.log('Number of active users:', activeUsers.length);
  }, [activeUsers]);

  return {
    connected,
    messages,
    privateMessages,
    activeUsers,
    loading,
    selectedUser,
    connect,
    disconnect,
    sendMessage,
    sendPrivateMessage,
    setSelectedUser,
    getPrivateMessagesForUser,
  };
};
