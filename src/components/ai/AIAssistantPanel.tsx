import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Sparkles, Trash2, Loader2, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  sendMessage,
  getConversationHistory,
  clearConversation,
  QUICK_ACTIONS,
  type ChatMessage,
} from '../../features/ai/assistant';
import { useVault } from '../../context/VaultContext';
import type { PasswordItem } from '../../types/vault';

export function AIAssistantPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { items } = useVault();

  useEffect(() => {
    setMessages(getConversationHistory());
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const getVaultContext = () => {
    const passwords = items.filter(i => i.type === 'password') as PasswordItem[];
    const weak = passwords.filter(p => p.strength === 'weak' || p.strength === 'fair').length;
    const sixMonths = new Date(); sixMonths.setMonth(sixMonths.getMonth() - 6);
    const old = passwords.filter(p => new Date(p.updatedAt) < sixMonths).length;

    // Detect reuse (simplified)
    const pwSet = new Set<string>();
    let reused = 0;
    passwords.forEach(p => { if (pwSet.has(p.password)) reused++; pwSet.add(p.password); });

    const healthScore = passwords.length > 0
      ? Math.round(((passwords.length - weak) / passwords.length) * 100) : 100;

    return { totalItems: items.length, weakPasswords: weak, healthScore, oldPasswords: old, reusedCount: reused };
  };

  const handleSend = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    setInput('');
    setIsLoading(true);

    // Optimistically show user message
    const userMsg: ChatMessage = { id: `msg-${Date.now()}`, role: 'user', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    try {
      await sendMessage(text, getVaultContext());
      setMessages(getConversationHistory());
    } catch (err) {
      toast.error('AI Service is currently unavailable');
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`, role: 'assistant', content: 'Something went wrong. Please try again.', timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    clearConversation();
    setMessages([]);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-md flex items-center justify-center cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
          isOpen
            ? 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
            : 'bg-teal-600 text-white hover:bg-teal-500'
        }`}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={24} />
            </motion.div>
          ) : (
            <motion.div key="bot" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Bot size={24} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 z-50 w-96 h-[520px] bg-white rounded-2xl shadow-xl border border-gray-200 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 leading-tight">AI Copilot</h3>
                  <p className="text-xs text-gray-500 font-medium">Security Assistant</p>
                </div>
              </div>
              <button
                onClick={handleClear}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer focus:outline-none"
                title="Clear conversation"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center mt-4">
                  <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mb-1">
                    <Bot size={28} className="text-teal-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">Security Copilot</h4>
                    <p className="text-xs text-gray-500 max-w-[220px] mb-6 leading-relaxed">Ask me about your vault security and recommended actions</p>
                  </div>
                  <div className="w-full space-y-2 px-2">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => handleSend(action.prompt)}
                        className="w-full text-left px-4 py-3 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:border-teal-500 hover:text-teal-700 hover:bg-teal-50/50 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-teal-600 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm border border-gray-200/50'
                    }`}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-2xl bg-gray-100 text-gray-800 rounded-bl-sm border border-gray-200/50 shadow-sm flex items-center">
                    <Loader2 size={16} className="text-teal-600 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-100 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
              <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-xl focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100 transition-all px-2 py-2 shadow-sm">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about your security..."
                  className="flex-1 px-3 py-2 text-[13px] bg-transparent text-gray-900 placeholder:text-gray-500 focus:outline-none font-medium"
                  disabled={isLoading}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 bg-teal-600 rounded-lg shadow-sm flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal-500 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 shrink-0"
                >
                  <Send size={16} className="-ml-0.5" />
                </button>
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-3 font-medium flex items-center justify-center gap-1.5">
                <Shield size={12} className="text-gray-300" /> AI never sees your passwords, only metadata.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
