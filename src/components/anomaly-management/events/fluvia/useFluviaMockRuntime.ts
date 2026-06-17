/**
 * Runtime MOCK del copiloto FluvIA sobre assistant-ui: `useExternalStoreRuntime`
 * con estado local (sin red). El historial se guarda como `ThreadMessageLike[]`
 * y se reinicia al cambiar de contexto (visión general ⇄ evento #N) para que la
 * conversación siempre trate del foco activo.
 *
 * Streaming: la respuesta canned se emite token-a-token (palabra a palabra)
 * actualizando el último mensaje del asistente, con `status.type === 'running'`
 * mientras dura (el cursor parpadeante lo lee de ahí). Bajo
 * `prefers-reduced-motion` se entrega de golpe, sin animación.
 *
 * ── Camino de producción (swap ~1:1, sin reescribir la UI) ──────────────────
 * Sustituir este hook por `useChatRuntime` de `@assistant-ui/react-ai-sdk`
 * apuntando al endpoint del BFF (`streamText`, Vercel AI SDK):
 *
 *   const runtime = useChatRuntime({ api: '/api/fluvia/chat', body: { context } });
 *
 * El external-store mapea 1:1 con el runtime del AI SDK (mismos
 * `ThreadMessageLike`, mismo `AssistantRuntimeProvider`, mismas primitivas), así
 * que `FluviaChatThread`, el compositor y las sugerencias no cambian.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useExternalStoreRuntime,
  generateId,
  type AppendMessage,
  type ThreadMessageLike,
} from '@assistant-ui/react';

/** Cadencia del streaming mock (ms entre tokens). */
const TOKEN_MS = 18;
/** Pausa de «pensando» antes del primer token (ms). */
const THINKING_MS = 160;

/** `prefers-reduced-motion: reduce` reactivo (SSR/test-safe). */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function extractText(message: AppendMessage): string {
  return message.content
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join('')
    .trim();
}

interface UseFluviaMockRuntimeOptions {
  /** Cambiar esta clave reinicia el hilo (p. ej. 'overview' | 'event:18'). */
  contextKey: string;
  /** Resuelve la respuesta canned para un prompt en el contexto activo. */
  answer: (prompt: string) => string;
  /** Si true, entrega la respuesta de golpe (sin streaming). */
  reducedMotion: boolean;
}

export function useFluviaMockRuntime({ contextKey, answer, reducedMotion }: UseFluviaMockRuntimeOptions) {
  const [messages, setMessages] = useState<ThreadMessageLike[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // `answer` y `reducedMotion` se leen vía ref para no recrear `onNew`.
  const answerRef = useRef(answer);
  answerRef.current = answer;
  const reducedRef = useRef(reducedMotion);
  reducedRef.current = reducedMotion;

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  // Reinicio del hilo al cambiar de contexto + limpieza al desmontar.
  useEffect(() => {
    clearTimers();
    setMessages([]);
    setIsRunning(false);
  }, [contextKey, clearTimers]);
  useEffect(() => clearTimers, [clearTimers]);

  const onNew = useCallback(
    async (message: AppendMessage) => {
      const text = extractText(message);
      if (!text) return;
      const reply = answerRef.current(text);

      const userMsg: ThreadMessageLike = {
        id: generateId(),
        role: 'user',
        content: [{ type: 'text', text }],
        status: { type: 'complete', reason: 'stop' },
      };
      const assistantId = generateId();
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: 'assistant', content: [{ type: 'text', text: '' }], status: { type: 'running' } },
      ]);
      setIsRunning(true);

      const setAssistant = (text: string, running: boolean) =>
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: [{ type: 'text', text }], status: running ? { type: 'running' } : { type: 'complete', reason: 'stop' } }
              : m
          )
        );

      if (reducedRef.current) {
        await new Promise<void>((resolve) => {
          const t = setTimeout(() => {
            setAssistant(reply, false);
            setIsRunning(false);
            resolve();
          }, THINKING_MS);
          timers.current.push(t);
        });
        return;
      }

      // Streaming palabra a palabra (cada token incluye su espacio final).
      const tokens = reply.match(/\S+\s*/g) ?? [reply];
      await new Promise<void>((resolve) => {
        let i = 0;
        const step = () => {
          i += 1;
          const partial = tokens.slice(0, i).join('');
          if (i < tokens.length) {
            setAssistant(partial, true);
            const t = setTimeout(step, TOKEN_MS);
            timers.current.push(t);
          } else {
            setAssistant(reply, false);
            setIsRunning(false);
            resolve();
          }
        };
        const t0 = setTimeout(step, THINKING_MS);
        timers.current.push(t0);
      });
    },
    [] // estable: lee answer/reducedMotion vía ref
  );

  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages,
    isRunning,
    onNew,
    convertMessage: (m) => m,
  });

  // Señal de scroll: longitud del texto del último mensaje (crece en streaming).
  const last = messages[messages.length - 1];
  const streamLen = last && last.role === 'assistant' && typeof last.content !== 'string'
    ? last.content.reduce((n, p) => n + (p.type === 'text' ? p.text.length : 0), 0)
    : 0;

  return { runtime, hasMessages: messages.length > 0, messageCount: messages.length, streamLen };
}
