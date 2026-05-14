import { requireUser } from "@/lib/auth/require-user";
import { Navbar } from "@/components/layout/navbar";
import { BottomNav } from "@/components/layout/bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard: middleware já protege, mas defesa em profundidade.
  await requireUser();

  return (
    <div className="min-h-dvh relative">
      <Navbar />
      <main className="container pb-28 pt-6 md:pb-32 md:pt-10 max-w-5xl">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
