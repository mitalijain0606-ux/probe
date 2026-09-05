import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  Bell,
  ChevronDown,
  Gauge,
  Globe,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProbeLogo } from '@/components/probe-logo';
import { Reveal } from '@/components/reveal';
import { AnimatedArrow } from '@/components/animated-arrow';
import { useAuth } from '@/features/auth/auth-context';

function NavBar() {
  const { user } = useAuth();

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-blue-100 bg-white/70 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link
          to="/"
          onClick={handleLogoClick}
          className="flex items-center gap-2 font-semibold tracking-tight text-slate-900 cursor-pointer"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white">
            <ProbeLogo className="h-4 w-4" />
          </div>
          Probe
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-slate-500 md:flex">
          <a href="#features" className="relative py-1 transition-all duration-200 hover:text-blue-600 active:scale-95 group">
            Features
            <span className="absolute inset-x-0 -bottom-0.5 h-px scale-x-0 bg-blue-600 transition-transform duration-200 group-hover:scale-x-100" />
          </a>
          <a
            href="#how-it-works"
            className="relative py-1 transition-all duration-200 hover:text-blue-600 active:scale-95 group"
          >
            How it works
            <span className="absolute inset-x-0 -bottom-0.5 h-px scale-x-0 bg-blue-600 transition-transform duration-200 group-hover:scale-x-100" />
          </a>
          <a
            href="#reliability"
            className="relative py-1 transition-all duration-200 hover:text-blue-600 active:scale-95 group"
          >
            Reliability
            <span className="absolute inset-x-0 -bottom-0.5 h-px scale-x-0 bg-blue-600 transition-transform duration-200 group-hover:scale-x-100" />
          </a>
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <Button asChild size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
              <Link to="/dashboard">
                Go to Dashboard
                <AnimatedArrow />
              </Link>
            </Button>
          ) : (
            <>
              <Link to="/login" className="hidden text-sm font-medium text-slate-500 hover:text-slate-900 sm:block">
                Sign in
              </Link>
              <Button asChild size="sm" className="group bg-blue-600 text-white hover:bg-blue-700">
                <Link to="/register">
                  Start monitoring
                  <AnimatedArrow />
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function StatusPill({ label, value, tone }: { label: string; value: string; tone: 'up' | 'neutral' }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-white/80 px-3 py-2">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs font-semibold ${tone === 'up' ? 'text-emerald-600' : 'text-slate-700'}`}>{value}</span>
    </div>
  );
}

function HeroMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-8 -z-10 rounded-[2.5rem] bg-gradient-to-br from-blue-200/60 via-sky-200/40 to-transparent blur-3xl" />
      <div className="rounded-2xl border border-blue-100 bg-white/80 p-3 shadow-2xl shadow-blue-200/50 backdrop-blur-xl">
        <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          </div>
          <span className="text-[11px] font-medium text-slate-400">probe.app/dashboard</span>
          <div />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-4">
          <div className="col-span-2 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Uptime, last 30 days</p>
              <p className="text-2xl font-semibold text-slate-900">99.94%</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>

          <StatusPill label="api.payments" value="Up · 118ms" tone="up" />
          <StatusPill label="auth.internal" value="Up · 64ms" tone="up" />
          <StatusPill label="cdn.assets" value="Up · 42ms" tone="up" />
          <StatusPill label="webhooks.io" value="Degraded" tone="neutral" />

          <div className="col-span-2 mt-1 flex h-16 items-end gap-[3px] rounded-lg border border-blue-100 bg-white/60 p-2">
            {[40, 55, 48, 62, 58, 70, 65, 80, 74, 90, 82, 96, 88, 60, 92].map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className="flex-1 rounded-sm bg-gradient-to-t from-blue-500 to-sky-400"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: Zap,
    title: 'Concurrent health checks',
    description:
      'A bounded worker pool checks every URL in parallel without hammering your network or drowning latency numbers in queueing delay.',
  },
  {
    icon: Bell,
    title: 'Real-time status',
    description: 'Every completed check streams to your dashboard over WebSockets the moment it finishes — no manual refresh.',
  },
  {
    icon: Gauge,
    title: 'Uptime & latency history',
    description: 'Response-time trends and UP/DOWN history across 1h, 24h, 7d, and 30d ranges, computed with one consistent formula.',
  },
  {
    icon: ShieldCheck,
    title: 'SSRF-hardened checker',
    description: 'DNS-resolves every target and validates the actual IP before connecting — private ranges and metadata endpoints are blocked by default.',
  },
  {
    icon: Globe,
    title: 'Bulk import',
    description: 'Add one URL at a time or drop in a JSON array of hundreds — duplicates and invalid entries are reported, not silently dropped.',
  },
  {
    icon: Activity,
    title: 'Structured observability',
    description: 'Every request, check, and failure is logged as structured JSON with request IDs — ready to ship to any log pipeline.',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Add your URLs',
    description: 'Paste a URL or upload a JSON list. Probe validates each one and starts tracking it immediately.',
  },
  {
    step: '02',
    title: 'Checks run on schedule',
    description: 'Every active URL is checked automatically every 5 minutes, with manual checks available any time.',
  },
  {
    step: '03',
    title: 'Watch status live',
    description: 'Uptime, latency, and failures update on your dashboard in real time as each check completes.',
  },
];

function FooterBar() {
  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-blue-100 py-10">
      <div className="container flex flex-col items-center justify-between gap-4 text-sm text-slate-400 sm:flex-row">
        <Link
          to="/"
          onClick={handleScrollTop}
          className="flex items-center gap-2 font-medium text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
        >
          <ProbeLogo className="h-4 w-4" />
          Probe
        </Link>
        <p>URL health & observability, built to catch failures before your users do.</p>
      </div>
    </footer>
  );
}

export function LandingPage() {
  const { user } = useAuth();

  return (
    <div id="top" className="min-h-screen bg-gradient-to-b from-sky-50 via-blue-50/60 to-white text-slate-900">
      <NavBar />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-15%] h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-blue-200/50 blur-[120px]" />
          <div className="absolute right-[-10%] top-[20%] h-[400px] w-[400px] rounded-full bg-sky-200/40 blur-[100px]" />
        </div>

        <div className="container grid gap-16 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Know the moment
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">
                something breaks.
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-slate-600">
              Probe checks your URLs continuously, in parallel, and shows you uptime, latency, and failures the second
              they happen — not after a user tells you first.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {user ? (
                <Button asChild size="lg" className="group bg-blue-600 text-white transition-transform hover:bg-blue-700 hover:scale-[1.03] active:scale-95">
                  <Link to="/dashboard">
                    Go to Dashboard
                    <AnimatedArrow />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg" className="group bg-blue-600 text-white transition-transform hover:bg-blue-700 hover:scale-[1.03] active:scale-95">
                    <Link to="/register">
                      Start monitoring free
                      <AnimatedArrow />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-blue-200 bg-white/60 text-slate-700 transition-transform hover:bg-white hover:scale-[1.03] active:scale-95"
                  >
                    <Link to="/login">Sign in</Link>
                  </Button>
                </>
              )}
            </div>
            <div className="mt-10 flex items-center gap-6 text-xs text-slate-400">
              <span>No credit card required</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>Checks run every 5 minutes</span>
            </div>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 [animation-delay:150ms] [animation-fill-mode:backwards]">
            <HeroMockup />
          </div>
        </div>

        <div className="hidden justify-center pb-10 sm:flex">
          <a
            href="#features"
            aria-label="Scroll to features"
            className="group relative flex h-10 w-10 items-center justify-center rounded-full border border-blue-200 bg-white/70 text-blue-600 shadow-sm transition-colors duration-200 hover:bg-blue-50"
          >
            <span className="absolute inset-0 -z-10 scale-0 rounded-full bg-blue-400 opacity-0 transition-all duration-300 group-hover:scale-150 group-hover:opacity-10" />
            <ChevronDown className="h-4 w-4 transition-transform duration-200 group-hover:translate-y-1" />
          </a>
        </div>
      </section>

      <section id="features" className="border-t border-blue-100 bg-white/50 py-24">
        <div className="container">
          <Reveal className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Everything you need to trust your uptime
            </h2>
            <p className="mt-4 text-slate-500">
              Built for teams who'd rather see a problem coming than explain one after the fact.
            </p>
          </Reveal>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, index) => (
              <Reveal key={feature.title} delay={index * 120}>
                <div className="h-full rounded-xl border border-blue-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-100">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-medium text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{feature.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-blue-100 py-24">
        <div className="container">
          <Reveal className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Three steps to full visibility
            </h2>
          </Reveal>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {STEPS.map((item, index) => (
              <Reveal key={item.step} delay={index * 150}>
                <div className="relative h-full rounded-xl border border-blue-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-100">
                  <span className="text-sm font-semibold text-blue-600">{item.step}</span>
                  <h3 className="mt-3 font-medium text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="reliability" className="border-t border-blue-100 py-24">
        <div className="container">
          <Reveal className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-10 text-center shadow-sm sm:p-16">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Reliable monitoring, built for production
            </h2>
            <p className="mx-auto mt-4 max-w-md text-slate-500">
              Set up your first monitor in under a minute and get continuous visibility into uptime and performance.
            </p>
            <Button asChild size="lg" className="group mt-8 bg-blue-600 text-white hover:bg-blue-700">
              <Link to="/register">
                Create your account
                <AnimatedArrow />
              </Link>
            </Button>
          </Reveal>
        </div>
      </section>

      <FooterBar />
    </div>
  );
}
