export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mx-auto max-w-6xl">{children}</div>
    </main>
  );
}
