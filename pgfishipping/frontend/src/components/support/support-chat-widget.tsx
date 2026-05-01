'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, Paperclip, X } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth';
import {
  getActiveSupportConversation,
  listSupportMessages,
  sendSupportMessage,
  uploadSupportAttachment,
  type SupportMessage,
} from '@/lib/dashboard-api';

const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'
).replace(/\/api\/?$/, '');

function SupportChatWidgetInner(): JSX.Element | null {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<unknown>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !user || !accessToken || conversationId) return;
    let cancelled = false;
    (async () => {
      try {
        const conversation = await getActiveSupportConversation();
        if (cancelled) return;
        setConversationId(conversation.id);
        const result = await listSupportMessages(conversation.id);
        if (cancelled) return;
        setMessages(result.items);
      } catch (err) {
        if (!cancelled) {
          setError('Unable to start chat. Please try again later.');
          // eslint-disable-next-line no-console
          console.warn('Support chat init failed', err);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user, accessToken, conversationId]);

  useEffect(() => {
    if (!conversationId || !accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('socket.io-client');
        if (cancelled) return;
        const socket = mod.io(API_ORIGIN, {
          path: '/socket.io',
          auth: { token: accessToken },
          transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;
        socket.emit('support:join', conversationId);
        socket.on('support:message', (msg: SupportMessage) => {
          setMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
          );
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Support socket connect failed (non-fatal)', err);
      }
    })();
    return () => {
      cancelled = true;
      const s = socketRef.current as { disconnect?: () => void } | null;
      if (s?.disconnect) s.disconnect();
      socketRef.current = null;
    };
  }, [conversationId, accessToken]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open]);

  if (!user || !accessToken) return null;

  const handleSend = async (): Promise<void> => {
    if (!conversationId || !text.trim() || busy) return;
    setBusy(true);
    try {
      const sent = await sendSupportMessage(conversationId, text.trim());
      setMessages((prev) =>
        prev.some((m) => m.id === sent.id) ? prev : [...prev, sent],
      );
      setText('');
    } catch (err) {
      setError('Failed to send message.');
      // eslint-disable-next-line no-console
      console.warn(err);
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file || !conversationId) return;
    setBusy(true);
    try {
      const msg = await uploadSupportAttachment(conversationId, file);
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      );
    } catch (err) {
      setError('Failed to upload file.');
      // eslint-disable-next-line no-console
      console.warn(err);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 print:hidden">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full bg-[hsl(var(--brand-navy))] px-4 py-3 text-white shadow-lg hover:opacity-90"
          aria-label="Open support chat"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Support</span>
        </button>
      ) : (
        <div className="flex h-[480px] w-[340px] flex-col rounded-xl border bg-white shadow-2xl sm:w-[360px]">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <strong className="text-sm">Support chat</strong>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-gray-500 hover:bg-gray-100"
              aria-label="Close support chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div
            ref={listRef}
            className="flex-1 space-y-2 overflow-y-auto p-3 text-sm"
          >
            {messages.length === 0 && !error ? (
              <div className="text-xs text-gray-500">Loading…</div>
            ) : null}
            {messages.map((m) => {
              const mine = m.senderType === 'CUSTOMER';
              const sys = m.senderType === 'SYSTEM';
              return (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-md px-2 py-1 text-sm ${
                    sys
                      ? 'mx-auto bg-amber-50 text-amber-900'
                      : mine
                        ? 'ml-auto bg-[hsl(var(--brand-navy))] text-white'
                        : 'mr-auto bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  {m.attachmentUrl ? (
                    <a
                      className="mt-1 block text-xs underline opacity-80"
                      href={m.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {m.attachmentName ?? 'Attachment'}
                    </a>
                  ) : null}
                </div>
              );
            })}
            {error ? <div className="text-xs text-red-600">{error}</div> : null}
          </div>
          <div className="space-y-2 border-t p-2">
            <div className="flex items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Type your message…"
                className="h-9 flex-1 rounded border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-navy))]"
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={busy || !text.trim()}
                className="rounded bg-[hsl(var(--brand-navy))] p-2 text-white disabled:opacity-50"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600 hover:text-gray-900">
              <Paperclip className="h-3 w-3" />
              <span>Attach file (max 10MB)</span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => void handleFile(e)}
                disabled={busy}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SupportChatWidget(): JSX.Element | null {
  try {
    return <SupportChatWidgetInner />;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Support chat widget crashed', err);
    return null;
  }
}
