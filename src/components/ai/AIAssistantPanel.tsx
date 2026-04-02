import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Sparkles, Trash2, Loader2 } from 'lucide-react';
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
      const response = await sendMessage(text, getVaultContext());
      setMessages(getConversationHistory());
    } catch {
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
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl cursor-pointer transition-all duration-300 ${
          isOpen
            ? 'bg-vault-surface border border-vault-border text-vault-text-muted'
            : 'bg-gradient-to-br from-vault-gold to-vault-gold-dim text-vault-bg'
        }`}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={20} />
            </motion.div>
          ) : (
            <motion.div key="bot" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Bot size={22} />
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
            className="fixed bottom-24 right-6 z-50 w-96 h-[520px] bg-vault-surface border border-vault-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-vault-border bg-vault-surface-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-vault-gold/10 border border-vault-gold/20 flex items-center justify-center">
                  <Sparkles size={14} className="text-vault-gold" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-vault-text">AI Copilot</h3>
                  <p className="text-[10px] text-vault-text-muted">Security Assistant</p>
                </div>
              </div>
              <button
                onClick={handleClear}
                className="p-1.5 rounded-lg text-vault-text-muted hover:text-vault-danger hover:bg-vault-danger/10 transition-colors cursor-pointer"
                title="Clear conversation"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-vault-gold/5 border border-vault-gold/10 flex items-center justify-center">
                    <Bot size={28} className="text-vault-gold/60" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-vault-text-secondary">Security Copilot</p>
                    <p className="text-xs text-vault-text-muted mt-1">Ask me about your vault security</p>
                  </div>
                  <div className="w-full space-y-1.5 mt-2">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => handleSend(action.prompt)}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs text-vault-text-secondary bg-vault-surface-2 border border-vault-border hover:border-vault-gold/20 hover:bg-vault-gold/5 transition-all cursor-pointer"
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
                    <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-vault-gold/15 text-vault-text border border-vault-gold/20 rounded-br-md'
                        : 'bg-vault-surface-2 text-vault-text-secondary border border-vault-border rounded-bl-md'
                    }`}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-vault-surface-2 border border-vault-border rounded-2xl rounded-bl-md px-4 py-3">
                    <Loader2 size={14} className="text-vault-gold animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-2.5 border-t border-vault-border bg-vault-surface-2">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about your security..."
                  className="flex-1 bg-vault-surface border border-vault-border rounded-xl px-3 py-2 text-xs text-vault-text placeholder:text-vault-text-muted focus:outline-none focus:border-vault-gold/30 transition-colors"
                  disabled={isLoading}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className="w-8 h-8 rounded-xl bg-vault-gold/10 border border-vault-gold/20 flex items-center justify-center text-vault-gold hover:bg-vault-gold/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <Send size={14} />
                </button>
              </div>
              <p className="text-[9px] text-vault-text-muted text-center mt-1.5">
                AI never sees your passwords — only metadata
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
