import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blocked Members',
};

export default function BlockedMembersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
