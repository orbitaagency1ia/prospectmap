export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="pm-shell w-full max-w-md p-6 sm:p-8">
        {children}
      </div>
    </main>
  );
}
