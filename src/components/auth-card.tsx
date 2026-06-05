export default function AuthCard({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-soft">
      <h1 className="text-3xl font-bold">
        {title}
      </h1>

      <p className="mt-2 text-sm text-slate-600">
        {subtitle}
      </p>

      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}
