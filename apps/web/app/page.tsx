export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-8 px-6 py-20">
        <div className="max-w-3xl space-y-6">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-300">Realtime Collaboration Workspace</p>
          <h1 className="text-5xl font-semibold tracking-tight md:text-7xl">
            A workspace where docs, chat, and coordination stay in sync.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-300">
            A production-ready SaaS foundation with workspace management, realtime document collaboration,
            notifications, and an auditable activity trail.
          </p>
        </div>
      </section>
    </main>
  );
}
