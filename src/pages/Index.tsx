
import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { MessageCircle, Users, Send, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  type: 'message' | 'system';
}

interface User {
  id: string;
  name: string;
  joinedAt: Date;
}

const Index = () => {
  const [client, setClient] = useState<Client | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize WebSocket connection
  const connectToChat = () => {
    if (!username.trim()) {
      toast({
        title: "Username required",
        description: "Please enter a username to join the chat",
        variant: "destructive",
      });
      return;
    }

    // For demo purposes, we'll simulate a WebSocket connection
    // In a real application, you would connect to your actual backend
    console.log('Connecting to chat service...');
    
    // Simulate connection
    setTimeout(() => {
      setConnected(true);
      setIsJoined(true);
      
      // Add system message
      const joinMessage: Message = {
        id: Date.now().toString(),
        sender: 'System',
        content: `${username} joined the chat`,
        timestamp: new Date(),
        type: 'system'
      };
      setMessages(prev => [...prev, joinMessage]);
      
      // Add user to active users
      const newUser: User = {
        id: Date.now().toString(),
        name: username,
        joinedAt: new Date()
      };
      setActiveUsers(prev => [...prev, newUser]);
      
      toast({
        title: "Connected!",
        description: "You've successfully joined the chat",
      });
    }, 1000);
  };

  const sendMessage = () => {
    if (!currentMessage.trim() || !connected) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: username,
      content: currentMessage,
      timestamp: new Date(),
      type: 'message'
    };

    setMessages(prev => [...prev, newMessage]);
    setCurrentMessage('');
    
    console.log('Sending message via STOMP:', newMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const disconnectFromChat = () => {
    setConnected(false);
    setIsJoined(false);
    setMessages([]);
    setActiveUsers([]);
    setCurrentMessage('');
    
    toast({
      title: "Disconnected",
      description: "You've left the chat",
    });
  };

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <MessageCircle className="h-8 w-8 text-blue-600" />
              Join Chat
            </CardTitle>
            <p className="text-muted-foreground">
              Enter your username to start chatting
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && connectToChat()}
              maxLength={20}
            />
            <Button 
              onClick={connectToChat} 
              className="w-full"
              disabled={!username.trim()}
            >
              Join Chat
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-4 h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800">Chat Service</h1>
            <Badge variant={connected ? "default" : "destructive"} className="flex items-center gap-1">
              {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {connected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          <Button onClick={disconnectFromChat} variant="outline">
            Leave Chat
          </Button>
        </div>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Active Users Sidebar */}
          <Card className="w-72 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Active Users ({activeUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <div className="space-y-2">
                {activeUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium">{user.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Messages</CardTitle>
            </CardHeader>
            <Separator />
            
            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.sender === username ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.type === 'system' 
                        ? 'bg-gray-200 text-gray-600 text-sm text-center w-full'
                        : message.sender === username
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}>
                      {message.type === 'message' && message.sender !== username && (
                        <div className="text-xs font-medium mb-1 opacity-70">
                          {message.sender}
                        </div>
                      )}
                      <div>{message.content}</div>
                      <div className={`text-xs mt-1 opacity-70 ${
                        message.type === 'system' ? 'hidden' : ''
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </CardContent>

            <Separator />
            
            {/* Message Input */}
            <CardContent className="pt-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={!connected}
                  className="flex-1"
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={!connected || !currentMessage.trim()}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
