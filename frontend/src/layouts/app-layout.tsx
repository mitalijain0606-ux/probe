import { Link, NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/features/auth/auth-context';
import { Button } from '@/components/ui/button';
import { useSocket } from '@/hooks/use-socket';
import { ProbeLogo } from '@/components/probe-logo';

export function AppLayout() {
  const { user, logout } = useAuth();
  useSocket();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <Link
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 font-semibold tracking-tight hover:opacity-90 transition-opacity cursor-pointer"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ProbeLogo className="h-4 w-4" />
            </div>
            Probe
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </NavLink>
            {(user?.role === 'ADMIN' || user?.email === 'admin@urlwatch.dev' || user?.email?.startsWith('admin@')) && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`
                }
              >
                <ShieldCheck className="h-4 w-4" />
                Admin
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{user?.name}</p>
              <p className="text-xs text-muted-foreground leading-tight">{user?.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => void logout()} title="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <Outlet />
      </main>
    </div>
  );
}
