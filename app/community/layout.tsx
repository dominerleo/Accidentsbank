import CommunityChrome from "@/components/community/CommunityChrome";

export default function CommunityLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-slate-50 text-slate-900 antialiased">
      <CommunityChrome />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-y-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
