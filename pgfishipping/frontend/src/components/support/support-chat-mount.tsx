'use client';

import dynamic from 'next/dynamic';

const SupportChatWidget = dynamic(() => import('./support-chat-widget'), {
  ssr: false,
  loading: () => null,
});

export function SupportChatMount(): JSX.Element {
  return <SupportChatWidget />;
}
