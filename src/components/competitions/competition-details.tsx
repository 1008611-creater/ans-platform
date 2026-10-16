import type { ReactNode } from "react";

/** Native disclosure stays usable with touch and keyboard, including before hydration. */
export function CompetitionDetails({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return <details id={id} className="group min-w-0 scroll-mt-24 border-b py-2">
    <summary className="min-h-11 cursor-pointer rounded-md px-2 py-3 text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      {title}
    </summary>
    <div className="space-y-5 px-2 pb-5 pt-3 text-sm leading-7 [&_a]:break-words">{children}</div>
  </details>;
}
