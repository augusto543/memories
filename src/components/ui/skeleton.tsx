import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md shimmer", // shimmer utility de globals.css — gradient sweep premium
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
