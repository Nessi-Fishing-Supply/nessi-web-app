import { Suspense } from 'react';
import MessagesPage from './messages-page';

export default function DashboardMessagesPage() {
  return (
    <Suspense>
      <MessagesPage />
    </Suspense>
  );
}
