import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground shadow-[inset_0_0_0_0.5px_var(--hairline)] focus-visible:shadow-[inset_0_0_0_0.5px_var(--hairline),var(--focus-ring)] aria-invalid:shadow-[inset_0_0_0_1px_var(--destructive)] flex field-sizing-content min-h-16 w-full rounded-md bg-card px-3 py-2 text-base transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
