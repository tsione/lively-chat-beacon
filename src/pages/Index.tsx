
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Users, Send, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useChat } from '@/hooks/useChat';
import AuthForm from '@/components/AuthForm';

const Index = () => {
  const [currentMessage, setCurrentMessage] = useState('');
  const [username, setUsername] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const {
    connected,
    messages,
    activeUsers,
    loading,
    connect,
    disconnect,
    sendMessage,
  } = useChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleAuthSuccess = async (authenticatedUsername: string) => {
    setUsername(authenticatedUsername);
    setIsAuthenticated(true);
    
    try {
      await connect(authenticatedUsername);
    } catch (error) {
      console.error('Failed to connect to chat service:', error);
      toast({
        title: "Connection failed",
        description: "Unable to connect to chat service. Please check if the server is running.",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = () => {
    if (!currentMessage.trim() || !connected) return;
    
    sendMessage(currentMessage);
    setCurrentMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setIsAuthenticated(false);
    setUsername('');
  };

  if (!isAuthenticated) {
    return <AuthForm onAuthSuccess={handleAuthSuccess} />;
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
              {loading ? 'Connecting...' : connected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          <Button onClick={handleDisconnect} variant="outline">
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
                  placeholder={connected ? "Type your message..." : "Connecting..."}
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={!connected || loading}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!connected || !currentMessage.trim() || loading}
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
