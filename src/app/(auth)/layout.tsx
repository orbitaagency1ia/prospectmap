export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md rounded-[28px] border border-[rgba(42,52,66,0.92)] bg-[rgba(9,11,16,0.86)] p-6 shadow-2xl backdrop-blur-sm sm:p-8">
        {children}
      </div>
    </main>
  );
}
