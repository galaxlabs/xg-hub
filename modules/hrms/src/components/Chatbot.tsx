import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react';
import './Chatbot.css';
import { useAuth } from '../context/useAuth';
import { fetchAttendance, askAI } from '../api';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
}

const Chatbot: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'ai', text: 'Hello! I am your AI HR Assistant. How can I help you today?' }
  ]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      fetchAttendance().then(data => {
        setLogs(data.filter((l: any) => l.empId === user.empId));
      }).catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userMessage: Message = { id: Date.now().toString(), sender: 'user', text: inputText };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText;
    setInputText('');
    setLoading(true);

    try {
      // Build context for AI
      const context = {
        userName: user?.name,
        userRole: user?.role,
        empId: user?.empId,
        logs: user?.role !== 'admin' ? logs : [],
        date: new Date().toLocaleDateString()
      };

      const data = await askAI(currentInput, context);
      
      const aiResponse: Message = { 
        id: (Date.now() + 1).toString(), 
        sender: 'ai', 
        text: data.response 
      };
      setMessages(prev => [...prev, aiResponse]);
    } catch (error: any) {
      console.error("AI Error:", error);
      const errorMessage: Message = { 
        id: (Date.now() + 1).toString(), 
        sender: 'ai', 
        text: "I'm sorry, I'm having trouble connecting to my brain right now. Please try again later." 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatbot-container">
      {!isOpen && (
        <button className="chat-trigger" onClick={() => setIsOpen(true)}>
          <MessageSquare size={24} />
        </button>
      )}

      {isOpen && (
        <div className="chat-window animate-fade-in">
          <div className="chat-header">
            <div className="chat-title">
              <Bot size={20} /> HR AI Assistant
            </div>
            <button className="close-chat" onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`message-bubble ${msg.sender}`}>
                <div className="message-icon">
                  {msg.sender === 'ai' ? <Bot size={14} /> : <User size={14} />}
                </div>
                <div className="message-text">{msg.text}</div>
              </div>
            ))}
            {loading && (
              <div className="message-bubble ai loading">
                <div className="message-icon">
                  <Bot size={14} />
                </div>
                <div className="message-text">
                  <Loader2 size={16} className="animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-area" onSubmit={handleSend}>
            <input 
              type="text" 
              placeholder="Ask about HR policies..." 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button type="submit" className="send-btn" disabled={!inputText.trim()}>
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
