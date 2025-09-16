import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Send, User, Bot, Loader2, Archive, Plus, History, Trash2, Brain, Cpu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlantContext } from "@/contexts/PlantContext";
import { ChatMarkdown } from "@/components/chat/ChatMarkdown";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface ArchivedConversation {
  id: string;
  title: string;
  timestamp: Date;
  messages: Message[];
  context: {
    plantId?: string;
    topic: string;
  };
}

type ContextTopic = 'geral' | 'performance' | 'alertas' | 'compliance' | 'manutencao' | 'financeiro';

const contextTopics = [
  { value: 'geral', label: 'Geral', description: 'Conversas abertas sobre energia solar' },
  { value: 'performance', label: 'Performance', description: 'Análises de desempenho e eficiência' },
  { value: 'alertas', label: 'Alertas', description: 'Explicação e resolução de alertas' },
  { value: 'compliance', label: 'Compliance', description: 'Regulamentações e conformidade' },
  { value: 'manutencao', label: 'Manutenção', description: 'Procedimentos e dicas de manutenção' },
  { value: 'financeiro', label: 'Financeiro', description: 'ROI, economia e incentivos' }
] as const;

export function AIAssistant() {
  const { plants } = usePlantContext();
  
  const getInitialEVOMessage = (topic: ContextTopic): Message => {
    const contextMessages = {
      geral: 'Olá! Sou **EVO**, sua Inteligência Artificial especializada em energia solar no Brasil! 🌞\n\nEstou aqui para ajudar com qualquer dúvida sobre energia fotovoltaica. Posso analisar dados, explicar conceitos, ou simplesmente conversar sobre o futuro da energia solar no país.\n\n*Como posso ajudar hoje?*',
      performance: '⚡ **Modo Performance ativado!**\n\nSou EVO e estou focado em análises de desempenho. Posso ajudar com:\n• Análise de eficiência energética\n• Comparação com benchmarks\n• Identificação de oportunidades de melhoria\n• Interpretação de métricas de produção\n\n*Selecione uma usina e me conte o que gostaria de analisar!*',
      alertas: '🚨 **Modo Alertas ativo!**\n\nSou EVO, especialista em diagnósticos. Posso ajudar com:\n• Explicação detalhada de alertas\n• Priorização por criticidade\n• Sugestões de ações corretivas\n• Análise de tendências de problemas\n\n*Sobre qual alerta você gostaria de saber mais?*',
      compliance: '📋 **Modo Compliance ativo!**\n\nSou EVO, especialista em regulamentações. Posso ajudar com:\n• Normas ANEEL e regulamentações\n• Requisitos de conexão\n• Documentação necessária\n• Mudanças na legislação\n\n*Qual aspecto regulatório você gostaria de esclarecer?*',
      manutencao: '🔧 **Modo Manutenção ativo!**\n\nSou EVO, especialista em manutenção. Posso ajudar com:\n• Procedimentos preventivos\n• Diagnóstico de falhas\n• Cronogramas de manutenção\n• Boas práticas operacionais\n\n*Em que posso ajudar na manutenção da sua usina?*',
      financeiro: '💰 **Modo Financeiro ativo!**\n\nSou EVO, especialista em viabilidade econômica. Posso ajudar com:\n• Cálculos de ROI e payback\n• Análise de economia gerada\n• Incentivos e benefícios fiscais\n• Projeções financeiras\n\n*Sobre qual aspecto financeiro você gostaria de saber?*'
    };

    return {
      id: '1',
      text: contextMessages[topic],
      sender: 'ai',
      timestamp: new Date(),
    };
  };

  const [selectedTopic, setSelectedTopic] = useState<ContextTopic>('geral');
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('evo-chat-history');
    if (saved) {
      const parsedMessages = JSON.parse(saved);
      return parsedMessages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    }
    return [getInitialEVOMessage('geral')];
  });
  
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlantId, setSelectedPlantId] = useState<string>('');
  const [archivedConversations, setArchivedConversations] = useState<ArchivedConversation[]>(() => {
    const saved = localStorage.getItem('evo-archived-conversations');
    return saved ? JSON.parse(saved).map((conv: any) => ({
      ...conv,
      timestamp: new Date(conv.timestamp),
      messages: conv.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }))
    })) : [];
  });

  // Salvar histórico no localStorage
  useEffect(() => {
    localStorage.setItem('evo-chat-history', JSON.stringify(messages));
  }, [messages]);

  // Salvar conversas arquivadas
  useEffect(() => {
    localStorage.setItem('evo-archived-conversations', JSON.stringify(archivedConversations));
  }, [archivedConversations]);

  const archiveConversation = () => {
    if (messages.length <= 1) return; // Não arquivar se só tem a mensagem inicial
    
    const firstUserMessage = messages.find(m => m.sender === 'user');
    const title = firstUserMessage?.text.substring(0, 50) + (firstUserMessage?.text.length > 50 ? '...' : '') || 'Conversa sem título';
    
    const newArchived: ArchivedConversation = {
      id: Date.now().toString(),
      title,
      timestamp: new Date(),
      messages: [...messages],
      context: {
        plantId: selectedPlantId,
        topic: selectedTopic
      }
    };
    
    setArchivedConversations(prev => [newArchived, ...prev]);
    startNewConversation();
  };

  const startNewConversation = () => {
    setMessages([getInitialEVOMessage(selectedTopic)]);
    setInputValue('');
  };

  const loadArchivedConversation = (conversation: ArchivedConversation) => {
    setMessages(conversation.messages);
    setSelectedPlantId(conversation.context.plantId || '');
    setSelectedTopic(conversation.context.topic as ContextTopic);
  };

  const clearAllHistory = () => {
    setArchivedConversations([]);
    startNewConversation();
  };

  const handleTopicChange = (topic: ContextTopic) => {
    setSelectedTopic(topic);
    setMessages([getInitialEVOMessage(topic)]);
  };

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
          conversationHistory,
          contextTopic: selectedTopic
        }
      });

      if (error) throw error;

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: (data.response || data.fallbackResponse || 'Desculpe, não consegui processar sua solicitação.') + '\n\n*— EVO*',
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
    <TooltipProvider>
      <Card className="w-full max-w-5xl mx-auto h-[700px] flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                EVO
              </span>
              <span className="text-sm text-muted-foreground font-normal">
                Assistente Solar Inteligente
              </span>
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={archiveConversation}
                    disabled={messages.length <= 1}
                  >
                    <Archive className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Arquivar conversa atual</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={startNewConversation}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Nova conversa</TooltipContent>
              </Tooltip>
              
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <History className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Histórico de conversas</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-72">
                  {archivedConversations.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      Nenhuma conversa arquivada
                    </div>
                  ) : (
                    <>
                      {archivedConversations.slice(0, 8).map((conv) => (
                        <DropdownMenuItem
                          key={conv.id}
                          onClick={() => loadArchivedConversation(conv)}
                          className="flex flex-col items-start p-3 hover:bg-muted/50"
                        >
                          <span className="font-medium text-sm truncate w-full">
                            {conv.title}
                          </span>
                          <div className="flex items-center justify-between w-full mt-1">
                            <span className="text-xs text-muted-foreground">
                              {contextTopics.find(t => t.value === conv.context.topic)?.label || 'Geral'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {conv.timestamp.toLocaleDateString()}
                            </span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                      {archivedConversations.length > 0 && (
                        <DropdownMenuItem
                          onClick={clearAllHistory}
                          className="text-destructive hover:bg-destructive/10 border-t"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Limpar histórico
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <div className="flex flex-col gap-3 mt-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tópico:</span>
                <Select value={selectedTopic} onValueChange={(value: ContextTopic) => handleTopicChange(value)}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contextTopics.map((topic) => (
                      <SelectItem key={topic.value} value={topic.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{topic.label}</span>
                          <span className="text-xs text-muted-foreground">{topic.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {plants && plants.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Usina:</span>
                  <Select value={selectedPlantId} onValueChange={setSelectedPlantId}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Selecionar usina" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Nenhuma (contexto geral)</SelectItem>
                      {plants.map((plant) => (
                        <SelectItem key={plant.id} value={plant.id}>
                          {plant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
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
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0 mt-1">
                    <Cpu className="w-4 h-4 text-primary-foreground" />
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
                      <ChatMarkdown content={message.text} />
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
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0">
                  <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    EVO está pensando...
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
              placeholder={`Pergunte qualquer coisa para EVO sobre ${contextTopics.find(t => t.value === selectedTopic)?.label.toLowerCase()}...`}
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
            EVO se adapta ao tópico selecionado. Mude o contexto para respostas especializadas.
          </p>
        </div>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}