'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';
import {
  LayoutDashboard,
  Users,
  Gift,
  Sparkles,
  Settings,
  BarChart3,
  LogOut,
  Tag,
  CreditCard,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: ReactNode;
}

const ADMIN_NAV = [
  { href: '/admin', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/admin/analytics', label: 'التحليلات', icon: BarChart3 },
  { href: '/admin/users', label: 'المستخدمين', icon: Users },
  { href: '/admin/gifts', label: 'الهدايا', icon: Gift },
  { href: '/admin/categories', label: 'القوالب', icon: Tag },
  { href: '/admin/gift-cards', label: 'بطاقات الهدايا', icon: CreditCard },
  { href: '/admin/ai-generations', label: 'سجل الذكاء', icon: Sparkles },
  { href: '/admin/settings', label: 'الإعدادات', icon: Settings },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-40 flex w-64 flex-col gap-2 overflow-y-auto transition-transform duration-300',
          'border-l border-[var(--border)] bg-[var(--card)]/60 backdrop-blur-xl',
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
        )}
      >
        <div className="mb-6 flex items-center gap-2 px-5 pt-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--hd-pink)] via-[var(--hd-purple)] to-[var(--hd-coral)] text-2xl shadow-[0_10px_26px_-12px_rgba(255,123,176,0.95)]">
            🎁
          </div>
          <span className="font-display text-xl font-bold text-fg">Hadiya Admin</span>
        </div>

        <nav className="space-y-1 px-3">
          {ADMIN_NAV.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
                  'hover:translate-x-1',
                  isActive
                    ? 'bg-gradient-to-r from-[var(--primary)]/18 via-transparent to-transparent text-[var(--hd-pink-soft)]'
                    : 'text-fg-muted hover:bg-[var(--card)]/60 hover:text-fg',
                )}
              >
                {isActive ? (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-l-full bg-gradient-to-b from-[var(--hd-pink)] to-[var(--hd-purple)]" />
                ) : null}
                <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[var(--hd-pink)]' : ''}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[var(--border)] pt-4">
          <button
            onClick={() => {
              fetch('/api/auth/signout', { method: 'POST' }).then(() => {
                window.location.href = '/login';
              });
            }}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium',
              'text-fg-muted transition-all duration-200 hover:translate-x-1 hover:bg-[var(--card)]/60 hover:text-fg',
            )}
          >
            <LogOut className="h-4 w-4" />
            تسجيل خروج
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto lg:mr-64">
        <div className="border-b border-[var(--border)] bg-[var(--card)]/40 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <button
              className="lg:hidden rounded-xl border border-[var(--border-strong)] bg-[var(--card)]/60 p-2 text-fg hover:bg-[var(--card)]/90"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <span className="text-sm text-fg-muted">
              {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>
        <div className="p-6 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
