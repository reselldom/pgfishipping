'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth';
import {
  closeSupportChat,
  listStaff,
  listSupportChatMessages,
  listSupportChats,
  sendSupportChatMessage,
  transferSupportChat,
  type StaffMember,
  type SupportConversation,
  type SupportMessage,
} from '@/lib/admin-api';
import { clientApiBaseUrl } from '@/lib/client-api-base-url';

const API_ORIGIN = clientApiBaseUrl().replace(/\/api\/?$/, '');

function SupportChatWidgetInner(): JSX.Element | null {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [active, setActive] = useState<SupportConversation | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<unknown>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Mirror state into refs so socket handlers (registered once) see latest values.
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  useEffect(() => {
    activeIdRef.current = active?.id ?? null;
  }, [active]);

  // Clear unread badges for the conversation a staff member is actively viewing.
  useEffect(() => {
    if (!open || !active) return;
    setUnread((u) => (u[active.id] ? { ...u, [active.id]: 0 } : u));
  }, [open, active]);

  useEffect(() => {
    if (!open || !user || !accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const [chatList, team] = await Promise.all([
          listSupportChats({ pageSize: 50 }),
          listStaff().catch(() => []),
        ]);
        if (cancelled) return;
        setConversations(chatList.items);
        setStaff(team);
      } catch (err) {
        if (!cancelled) {
          setError('Unable to load chats.');
          // eslint-disable-next-line no-console
          console.warn(err);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user, accessToken]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await listSupportChatMessages(active.id);
        if (!cancelled) setMessages(res.items);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  // Persistent socket — connect once on mount so the unread badge keeps
  // updating even while the widget is closed or the staff member is browsing
  // other admin pages. Per-conversation joins are issued lazily below.
  useEffect(() => {
    if (!user || !accessToken) return;
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
        socket.on('support:message', (msg: SupportMessage) => {
          if (msg.conversationId === activeIdRef.current) {
            setMessages((prev) =>
              prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
            );
          }
        });
        socket.on(
          'support:notify',
          (payload: { conversationId: string; message?: SupportMessage }) => {
            const cid = payload?.conversationId;
            if (!cid) return;
            // Don't badge a conversation we're already looking at while open.
            const isViewing = openRef.current && cid === activeIdRef.current;
            if (!isViewing) {
              setUnread((u) => ({ ...u, [cid]: (u[cid] ?? 0) + 1 }));
            }
          },
        );
        socket.on('support:transfer', (updated: SupportConversation) => {
          setConversations((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c)),
          );
          if (activeIdRef.current === updated.id) setActive(updated);
        });
        socket.on('support:closed', (updated: SupportConversation) => {
          setConversations((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c)),
          );
          if (activeIdRef.current === updated.id) setActive(updated);
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Admin support socket connect failed (non-fatal)', err);
      }
    })();
    return () => {
      cancelled = true;
      const s = socketRef.current as { disconnect?: () => void } | null;
      if (s?.disconnect) s.disconnect();
      socketRef.current = null;
    };
  }, [user, accessToken]);

  // Join the room of whichever conversation is currently being viewed so we
  // get inline `support:message` events for it.
  useEffect(() => {
    if (!active) return;
    const s = socketRef.current as
      | { emit?: (e: string, ...args: unknown[]) => void }
      | null;
    s?.emit?.('support:join', active.id);
  }, [active]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  if (!user || !accessToken) return null;

  const handleSend = async (): Promise<void> => {
    if (!active || !text.trim() || busy) return;
    setBusy(true);
    try {
      const sent = await sendSupportChatMessage(active.id, text.trim());
      setMessages((prev) =>
        prev.some((m) => m.id === sent.id) ? prev : [...prev, sent],
      );
      setText('');
    } catch (err) {
      setError('Failed to send.');
      // eslint-disable-next-line no-console
      console.warn(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 print:hidden">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg hover:opacity-90"
          aria-label={
            totalUnread > 0
              ? `Open live support (${totalUnread} new message${totalUnread === 1 ? '' : 's'})`
              : 'Open live support'
          }
        >
          <MessageCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Live support</span>
          {totalUnread > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white shadow ring-2 ring-white">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          ) : null}
        </button>
      ) : (
        <div className="flex h-[520px] w-[760px] max-w-[95vw] rounded-xl border bg-white shadow-2xl">
          <div className="w-56 border-r p-2">
            <div className="mb-2 flex items-center justify-between">
              <strong className="text-sm">Conversations</strong>
            </div>
            <div className="space-y-1 overflow-y-auto" style={{ maxHeight: 460 }}>
              {conversations.length === 0 ? (
                <div className="text-xs text-gray-500">No active chats.</div>
              ) : null}
              {conversations.map((c) => {
                const name = c.customer
                  ? `${c.customer.firstName} ${c.customer.lastName}`.trim() ||
                    c.customer.email
                  : c.id.slice(0, 10);
                const code = c.customer?.customerCode ?? '';
                const cUnread = unread[c.id] ?? 0;
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => {
                      setActive(c);
                      setUnread((u) =>
                        u[c.id] ? { ...u, [c.id]: 0 } : u,
                      );
                    }}
                    className={`block w-full rounded border px-2 py-1 text-left text-xs ${
                      active?.id === c.id ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="truncate font-medium">{name}</div>
                      {cUnread > 0 ? (
                        <span className="ml-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                          {cUnread > 9 ? '9+' : cUnread}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between gap-1 text-[10px] uppercase text-gray-500">
                      {code ? (
                        <span className="font-mono">{code}</span>
                      ) : (
                        <span>&nbsp;</span>
                      )}
                      <span>{c.status}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-1 flex-col">
            <div className="flex items-center justify-between border-b p-2">
              <div className="min-w-0 text-sm">
                {active ? (
                  <div className="min-w-0">
                    <div className="truncate font-semibold">
                      {active.customer
                        ? `${active.customer.firstName} ${active.customer.lastName}`.trim() ||
                          active.customer.email
                        : `Chat ${active.id.slice(0, 8)}`}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-500">
                      {active.customer?.customerCode ? (
                        <span className="font-mono">
                          {active.customer.customerCode}
                        </span>
                      ) : null}
                      {active.customer?.email ? (
                        <span className="truncate">{active.customer.email}</span>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <span className="font-semibold">Select a chat</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ml-2 shrink-0 rounded p-1 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div
              ref={listRef}
              className="flex-1 space-y-2 overflow-y-auto p-3 text-sm"
            >
              {messages.map((m) => {
                const sys = m.senderType === 'SYSTEM';
                const staffMsg = m.senderType === 'STAFF';
                return (
                  <div
                    key={m.id}
                    className={`max-w-[85%] rounded-md px-2 py-1 text-sm ${
                      sys
                        ? 'mx-auto bg-amber-50 text-amber-900'
                        : staffMsg
                          ? 'ml-auto bg-primary text-primary-foreground'
                          : 'mr-auto bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {m.body}
                    </div>
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
              {error ? (
                <div className="text-xs text-red-600">{error}</div>
              ) : null}
            </div>
            {active ? (
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
                    className="h-9 flex-1 rounded border px-2 text-sm"
                    placeholder="Reply to customer…"
                    disabled={busy || active.status === 'CLOSED'}
                  />
                  <button
                    type="button"
                    className="rounded bg-primary p-2 text-primary-foreground disabled:opacity-50"
                    onClick={() => void handleSend()}
                    disabled={busy || !text.trim() || active.status === 'CLOSED'}
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="h-8 rounded border px-2 text-xs"
                    onChange={async (e) => {
                      const value = e.target.value;
                      if (!value || !active) return;
                      try {
                        const updated = await transferSupportChat(active.id, value);
                        setActive(updated);
                        setConversations((prev) =>
                          prev.map((c) => (c.id === updated.id ? updated : c)),
                        );
                      } catch (err) {
                        setError('Transfer failed.');
                        // eslint-disable-next-line no-console
                        console.warn(err);
                      } finally {
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Transfer to…
                    </option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="h-8 rounded border px-3 text-xs"
                    onClick={async () => {
                      if (!active) return;
                      try {
                        const updated = await closeSupportChat(active.id);
                        setActive(updated);
                        setConversations((prev) =>
                          prev.map((c) => (c.id === updated.id ? updated : c)),
                        );
                      } catch (err) {
                        setError('Close failed.');
                        // eslint-disable-next-line no-console
                        console.warn(err);
                      }
                    }}
                    disabled={active.status === 'CLOSED'}
                  >
                    Close chat
                  </button>
                </div>
              </div>
            ) : null}
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
    console.warn('Admin support chat widget crashed', err);
    return null;
  }
}
