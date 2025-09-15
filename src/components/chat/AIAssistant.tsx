import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User, Bot, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlantContext } from "@/contexts/PlantContext";
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export function AIAssistant() {
  const { plants } = usePlantContext();
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('ai-chat-history');
    if (saved) {
      const parsedMessages = JSON.parse(saved);
      return parsedMessages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    }
    return [{
      id: '1',
      text: 'Olá! Sou seu assistente especializado em energia solar no Brasil. Posso ajudá-lo com:\n\n• **Análise de Performance** - `/performance [planta]`\n• **Explicação de Alertas** - `/alerts`\n• **Compliance Regulatório** - `/compliance [planta]`\n\nSelecione uma usina para contexto específico ou faça sua pergunta!',
      sender: 'ai',
      timestamp: new Date(),
    }];
  });
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlantId, setSelectedPlantId] = useState<string>('');

  // Salvar histórico no localStorage
  useEffect(() => {
    localStorage.setItem('ai-chat-history', JSON.stringify(messages));
  }, [messages]);

  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || isLoading) return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const conversationHistory = messages.slice(-6).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant' as const,
        content: msg.text
      }));

      const { data, error } = await supabase.functions.invoke('solar-ai-assistant', {
        body: {
          message: inputValue,
          plantId: selectedPlantId && selectedPlantId !== 'general' ? selectedPlantId : undefined,
          conversationHistory
        }
      });

      if (error) throw error;

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || data.fallbackResponse || 'Desculpe, não consegui processar sua solicitação.',
        sender: 'ai',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Erro ao chamar IA:', error);
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Desculpe, ocorreu um erro técnico. Tente novamente em alguns instantes.',
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }

    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto h-[700px] flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          Assistente Solar IA
        </CardTitle>
        
        {plants && plants.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-muted-foreground">Contexto:</span>
            <Select value={selectedPlantId} onValueChange={setSelectedPlantId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Selecionar usina" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Geral (sem usina específica)</SelectItem>
                {plants.map((plant) => (
                  <SelectItem key={plant.id} value={plant.id}>
                    {plant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-3 ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground ml-auto'
                      : 'bg-muted'
                  }`}
                >
                  <div className="text-sm">
                    {message.sender === 'ai' ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown 
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                            li: ({ children }) => <li className="mb-1">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>
                          }}
                        >
                          {message.text}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p>{message.text}</p>
                    )}
                  </div>
                  <p className="text-xs opacity-70 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                
                {message.sender === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Processando...
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Digite sua pergunta sobre energia solar..."
              className="flex-1"
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
            <Button 
              onClick={handleSendMessage} 
              size="icon"
              disabled={isLoading || !inputValue.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Experimente: /performance, /alerts, /compliance ou faça perguntas específicas
          </p>
        </div>
      </CardContent>
    </Card>
  );
}