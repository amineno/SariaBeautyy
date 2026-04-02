import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Minimize2, Sparkles } from 'lucide-react';
import api from '../api/axios';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const ChatAssistant = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "", sender: 'ai' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [context, setContext] = useState(null);
  const messagesEndRef = useRef(null);
  const { i18n, t } = useTranslation();
  const [sessionId] = useState(() => 'session_' + Math.random().toString(36).substr(2, 9));
  const [, setEventSource] = useState(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Only initialize messages when component is opened
  useEffect(() => {
    if (isOpen) {
      setMessages([{ text: t('chat.greeting'), sender: 'ai' }]);
      scrollToBottom();
    }
  }, [isOpen, t, scrollToBottom]);

  // Only set up SSE connection when chat is open (optional notifications)
  useEffect(() => {
    if (!isOpen) return;

    let es;
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      es = new EventSource(`${baseUrl}/api/chat/events`);
    } catch {
      return;
    }
    
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.channel === 'assistant' && data.type === 'notification') {
          setMessages(prev => [...prev, { 
            text: data.message, 
            sender: 'ai', 
            type: 'notification',
            timestamp: new Date() 
          }]);
          scrollToBottom();
        }
      } catch (error) {
        console.error('SSE message error:', error);
      }
    };

    es.onerror = () => {
      es.close();
    };

    setEventSource(es);

    return () => {
      es.close();
      setEventSource(null);
    };
  }, [isOpen, scrollToBottom]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.post('/chat', {
        message: input,
        sessionId,
        context,
        lang: i18n.language,
        userId: user?._id
      });

      const aiMessage = { 
        text: response.data.response, 
        sender: 'ai',
        context: response.data.context
      };
      setMessages(prev => [...prev, aiMessage]);
      
      if (response.data.suggestions) {
        setSuggestions(response.data.suggestions);
      }
      
      if (response.data.context) {
        setContext(response.data.context);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        text: t('chat.error'), 
        sender: 'ai' 
      }]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-primary hover:bg-primary/90 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-50 group"
        aria-label="Open chat"
      >
        <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 h-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col z-50 transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary to-purple-600 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-white" />
          <h3 className="font-semibold text-white">{t('chat.title')}</h3>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setIsOpen(false)}
            className="text-white hover:text-gray-200 transition-colors p-1 rounded"
            aria-label="Minimize chat"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white hover:text-gray-200 transition-colors p-1 rounded"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] p-3 rounded-2xl ${
                message.sender === 'user'
                  ? 'bg-primary text-white rounded-br-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-sm'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-3 rounded-2xl rounded-bl-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="p-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded-full transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('chat.placeholder')}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-primary hover:bg-primary/90 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-2 rounded-xl transition-colors"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;
