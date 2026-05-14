import Link from "next/link";
import { Heart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyDates() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 inline-flex size-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
        <Heart className="size-7 text-primary" fill="currentColor" />
      </div>
      <h2 className="font-display text-3xl">Comece sua história</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Registre o primeiro encontro e guarde para sempre os momentos que
        importam.
      </p>
      <Button asChild className="mt-6" size="lg">
        <Link href="/dates/new">
          <Plus className="size-4" />
          <span>Criar primeiro encontro</span>
        </Link>
      </Button>
    </div>
  );
}
