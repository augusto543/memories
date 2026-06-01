"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Clock, BarChart3, Plus, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const items: NavItem[] = [
  { href: "/home",      label: "Início",   icon: Sparkles },
  { href: "/timeline",  label: "Timeline", icon: Clock },
  { href: "/dates/new", label: "Novo",     icon: Plus },
  { href: "/notes",     label: "Notas",    icon: StickyNote },
  { href: "/dashboard", label: "Resumo",   icon: BarChart3 },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed z-50",
        // Mobile: full-width bottom bar
        "bottom-0 left-0 right-0 pb-safe glass-strong border-t border-border/60",
        // Desktop: floating centered dock (Arc/Spotify style)
        "md:bottom-6 md:left-1/2 md:right-auto md:-translate-x-1/2",
        "md:w-max md:pb-0 md:border-t-0 md:border md:border-border/60",
        "md:rounded-3xl md:shadow-2xl md:shadow-black/20",
      )}
    >
      <ul className="grid grid-cols-5 md:flex md:gap-1 md:px-2 md:py-2">
        {items.map((it) => {
          const active =
            pathname === it.href ||
            (it.href !== "/dates/new" && pathname.startsWith(it.href));
          const Icon = it.icon;
          const isCenter = it.href === "/dates/new";

          return (
            <li key={it.href} className="relative">
              <Link
                href={it.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-2 py-2 text-[10px] tap-scale",
                  "md:px-4 md:rounded-2xl",
                  "transition-colors duration-300",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "relative inline-flex size-9 items-center justify-center rounded-2xl transition-all duration-500 ease-premium",
                    isCenter
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : active
                        ? "bg-primary/10"
                        : "",
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span className="uppercase tracking-wide">{it.label}</span>

                {active && !isCenter && (
                  <motion.span
                    layoutId="bottom-nav-indicator"
                    className="absolute -top-px left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full bg-primary"
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
