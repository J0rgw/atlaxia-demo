import { useState, useRef, useEffect, type FormEvent } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: number;
  text: string;
  sender: 'fluvia' | 'user';
}

const GREETING = '¡Hola! Soy FluvIA, la IA de AtlaXia, ¿qué necesitas?';
const REPLY = 'Buenas, si necesitas información de la página que estás viendo, solo dímelo.';

export function FluviaChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: GREETING, sender: 'fluvia' },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(2);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    },
    []
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg: Message = {
      id: nextId.current++,
      text,
      sender: 'user',
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    replyTimerRef.current = setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: nextId.current++, text: REPLY, sender: 'fluvia' },
      ]);
      setIsTyping(false);
      replyTimerRef.current = null;
    }, 1500);
  }

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div
          className={cn(
            'absolute bottom-16 right-0 w-[380px] h-[500px] flex flex-col',
            'bg-[var(--bg-surface)] rounded-md shadow-2xl',
            'border border-[var(--border-subtle)]',
            'animate-in fade-in slide-in-from-bottom-4 duration-200'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[var(--accent-primary)] rounded-t-md">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">FluvIA</p>
                <p className="text-xs text-white/80">Asistente IA</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'max-w-[80%] px-3 py-2 rounded-lg text-sm',
                  msg.sender === 'fluvia'
                    ? 'bg-[var(--bg-inset)] text-[var(--text-primary)] self-start'
                    : 'bg-[var(--accent-primary)] text-white ml-auto'
                )}
              >
                {msg.text}
              </div>
            ))}
            {isTyping && (
              <div className="max-w-[80%] px-3 py-2 rounded-lg bg-[var(--bg-inset)]">
                <div className="flex gap-1 items-center h-5">
                  <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 px-4 py-3 border-t border-[var(--border-subtle)]"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe un mensaje..."
              className={cn(
                'flex-1 px-3 py-2 text-sm rounded-lg',
                'bg-[var(--bg-inset)]',
                'text-[var(--text-primary)]',
                'placeholder:text-[var(--text-muted)]',
                'focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]'
              )}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className={cn(
                'p-2 rounded-lg transition-colors',
                'bg-[var(--accent-primary)] hover:opacity-90 text-white',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-14 h-14 rounded-full shadow-lg flex items-center justify-center',
          'bg-[var(--accent-primary)] hover:opacity-90 text-white',
          'transition-all duration-200 hover:scale-105',
          'focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2'
        )}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </button>
    </div>
  );
}
