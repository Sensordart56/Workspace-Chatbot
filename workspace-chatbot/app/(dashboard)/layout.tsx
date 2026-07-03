'use client';

import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';
import { WorkspaceProvider } from '@/components/providers/WorkspaceProvider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <WorkspaceProvider>
      <div className="flex min-h-screen flex-col bg-gray-950">
        {/* Top navigation bar */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-800 bg-gray-950/80 px-6 py-3 backdrop-blur">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-white">
              Doc Assistant
            </h1>
          </div>

          <button
            onClick={handleSignOut}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </header>

        {/* Main content */}
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </WorkspaceProvider>
  );
}
