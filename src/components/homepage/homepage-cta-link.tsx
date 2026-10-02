"use client";

import Link, { type LinkProps } from "next/link";
import type { ReactNode } from "react";
import { analyticsNav } from "@/lib/analytics";

interface HomepageCtaLinkProps extends Omit<LinkProps, "href"> {
  href: string;
  eventName: string;
  children: ReactNode;
}

export function HomepageCtaLink({ href, eventName, onClick, children, ...props }: HomepageCtaLinkProps) {
  return (
    <Link
      {...props}
      href={href}
      onClick={(event) => {
        analyticsNav.clickNavLink(`homepage:${eventName}`);
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}
