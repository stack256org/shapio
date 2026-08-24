import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "skeleton animate-pulse rounded-ir-sm bg-ir-muted-surface motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
