import { getPageAuthState } from 'thepopebot/auth';
import { ApathyLogo } from '../components/apathy-logo';
import { SetupForm } from '../components/setup-form';
import { LoginForm } from '../components/login-form';

export default async function LoginPage() {
  const { needsSetup } = await getPageAuthState();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_34%),linear-gradient(180deg,#111315_0%,#0a0b0d_100%)] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center gap-10 p-8 lg:flex-row lg:gap-16">
        <section className="flex max-w-lg flex-col items-center text-center lg:items-start lg:text-left">
          <div className="w-full max-w-[280px]">
            <ApathyLogo framed className="h-[300px] w-full" />
          </div>
          <div className="mt-8 space-y-3">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-white/70">
              The Apathy Coalition
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-white">
              Local intelligence with a recognizable face.
            </h1>
            <p className="text-base leading-7 text-white/70">
              Planning, memory, execution, and repository intelligence live behind one local control plane.
              Sign in to continue into your personal workspace.
            </p>
          </div>
        </section>
        {needsSetup ? <SetupForm /> : <LoginForm />}
      </div>
    </main>
  );
}
