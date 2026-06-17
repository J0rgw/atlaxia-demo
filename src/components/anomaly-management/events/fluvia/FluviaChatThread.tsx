import { createContext, useContext, useEffect, useRef, type FC, type ReactNode } from 'react';
import { ArrowUp } from 'lucide-react';
import {
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
  type TextMessagePartComponent,
} from '@assistant-ui/react';
import { FluviaMarkdown } from './FluviaMarkdown';
import type { FluviaSuggestion } from './chatMock';

/** Contexto estable para que las message-parts (montadas por la primitiva) lleguen al handler de refs. */
const ChatCtx = createContext<{ onSelectRef?: (id: number) => void }>({});

const AssistantText: TextMessagePartComponent = ({ text, status }) => {
  const { onSelectRef } = useContext(ChatCtx);
  const running = status?.type === 'running';
  return (
    <div className="text-xs leading-relaxed text-[var(--text-secondary)]">
      {text ? <FluviaMarkdown markdown={text} onSelectRef={onSelectRef} /> : null}
      {running && (
        <span
          aria-hidden
          className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-[var(--accent-primary)] animate-pulse motion-reduce:animate-none"
        />
      )}
    </div>
  );
};

const UserText: TextMessagePartComponent = ({ text }) => <>{text}</>;

/** Asistente: prosa limpia, sin burbuja (estética playground). */
const AssistantMessage: FC = () => (
  <MessagePrimitive.Root className="py-2">
    <MessagePrimitive.Parts components={{ Text: AssistantText }} />
  </MessagePrimitive.Root>
);

/** Usuario: burbuja redondeada inset, alineada a la derecha. */
const UserMessage: FC = () => (
  <MessagePrimitive.Root className="flex justify-end py-1.5">
    <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-[var(--bg-inset)] px-3 py-2 text-xs text-[var(--text-primary)]">
      <MessagePrimitive.Parts components={{ Text: UserText }} />
    </div>
  </MessagePrimitive.Root>
);

interface FluviaChatThreadProps {
  /** Contenido contextual fijado arriba del hilo (visión general / evento #N). */
  intro: ReactNode;
  suggestions: FluviaSuggestion[];
  placeholder: string;
  onSelectRef?: (id: number) => void;
  /** Reinicia el scroll al principio cuando cambia (cambio de contexto). */
  contextKey: string;
  hasMessages: boolean;
  messageCount: number;
  streamLen: number;
  reducedMotion: boolean;
}

/**
 * Hilo conversacional FluvIA sobre las primitivas de assistant-ui. El cuerpo
 * (intro + mensajes) es el ÚNICO tramo que scrollea; cabecera del rail y
 * compositor son `flex-none` (invariante de altura). Las sugerencias sólo se
 * muestran con el hilo vacío.
 */
export function FluviaChatThread({
  intro,
  suggestions,
  placeholder,
  onSelectRef,
  contextKey,
  hasMessages,
  messageCount,
  streamLen,
  reducedMotion,
}: FluviaChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Al cambiar de contexto, vuelve arriba (mostrar el resumen/evento desde el inicio).
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [contextKey]);

  // Con mensajes, mantén el hilo pegado al fondo (nuevo turno + streaming).
  useEffect(() => {
    if (messageCount === 0) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [messageCount, streamLen, reducedMotion]);

  return (
    <ChatCtx.Provider value={{ onSelectRef }}>
      <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col">
        {/* CUERPO: único tramo que scrollea */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          <div className="px-4 py-4">
            {intro}
            <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
          </div>
        </div>

        {/* COMPOSITOR: flex-none */}
        <div className="flex-none space-y-2 border-t border-[var(--border-subtle)] p-3">
          {!hasMessages && suggestions.length > 0 && (
            <div className="grid gap-1.5">
              {suggestions.map((s) => (
                <ThreadPrimitive.Suggestion
                  key={s.id}
                  prompt={s.prompt}
                  send
                  className="cursor-pointer rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-left text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)]/50 hover:bg-[var(--bg-inset)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
                >
                  {s.label}
                </ThreadPrimitive.Suggestion>
              ))}
            </div>
          )}

          <ComposerPrimitive.Root className="flex items-end gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-inset)] px-3 py-1.5 transition-colors focus-within:border-[var(--accent-primary)]/60">
            <ComposerPrimitive.Input
              rows={1}
              placeholder={placeholder}
              className="max-h-24 flex-1 resize-none bg-transparent py-1 text-xs leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
            <ComposerPrimitive.Send
              aria-label="Enviar mensaje a FluvIA"
              className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--accent-primary)] text-white transition-[filter,opacity] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </ComposerPrimitive.Send>
          </ComposerPrimitive.Root>
        </div>
      </ThreadPrimitive.Root>
    </ChatCtx.Provider>
  );
}
