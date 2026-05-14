import Link from "next/link";
import { Heart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 glass-strong border-b border-border/40 pt-safe-0">
      <div className="container flex h-14 items-center justify-between gap-3 max-w-5xl">
        <Link href="/home" className="flex items-center gap-2 group">
          <span className="relative inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20 transition-all duration-500 group-hover:bg-primary/20 group-hover:shadow-glow">
            <Heart className="size-3.5 text-primary" fill="currentColor" />
          </span>
          <span className="font-display italic text-xl tracking-tight">
            Memories
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <Button asChild size="sm" className="hidden sm:inline-flex shadow-soft hover:shadow-glow transition-shadow">
            <Link href="/dates/new">
              <Plus className="size-4" />
              <span>Novo encontro</span>
            </Link>
          </Button>
          <Button
            asChild
            size="icon"
            className="sm:hidden shadow-soft"
            aria-label="Novo encontro"
          >
            <Link href="/dates/new">
              <Plus className="size-4" />
            </Link>
          </Button>
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
