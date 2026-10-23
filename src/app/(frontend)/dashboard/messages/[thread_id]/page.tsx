import { Suspense } from 'react';
import ThreadPage from './thread-page';

export default async function DashboardThreadPage({
  params,
}: {
  params: Promise<{ thread_id: string }>;
}) {
  const { thread_id } = await params;

  return (
    <Suspense>
      <ThreadPage threadId={thread_id} />
    </Suspense>
  );
}
