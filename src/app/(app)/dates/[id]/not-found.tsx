import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DateNotFound() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="font-display text-3xl">Encontro não encontrado</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Talvez ele tenha sido removido, ou o link está errado.
      </p>
      <Button asChild className="mt-6">
        <Link href="/timeline">Voltar à timeline</Link>
      </Button>
    </div>
  );
}
