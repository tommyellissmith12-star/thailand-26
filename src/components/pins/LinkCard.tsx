"use client";

import { ExternalLink } from "lucide-react";
import type { PinLink } from "@/lib/types";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function LinkCard({ link }: { link: PinLink }) {
  const host = hostOf(link.url);
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noreferrer noopener"
      className="flex items-stretch gap-3 overflow-hidden rounded-xl border-2 border-ink/10 bg-paper-deep/50 shadow-paper transition-transform active:scale-[0.98]"
    >
      {link.og_image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={link.og_image} alt="" className="h-20 w-24 shrink-0 object-cover" loading="lazy" />
      ) : (
        <span className="flex w-16 shrink-0 items-center justify-center bg-paper-deep">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://www.google.com/s2/favicons?domain=${host}&sz=64`}
            alt=""
            className="h-8 w-8"
            loading="lazy"
          />
        </span>
      )}
      <span className="min-w-0 flex-1 py-2 pr-2">
        <span className="block truncate text-sm font-bold">
          {link.og_title ?? host}
        </span>
        {link.og_description && (
          <span className="mt-0.5 line-clamp-2 block text-xs text-ink-soft">
            {link.og_description}
          </span>
        )}
        <span className="mt-1 flex items-center gap-1 text-[11px] uppercase tracking-wide text-sea-deep">
          <ExternalLink size={11} />
          {link.og_site_name ?? host}
        </span>
      </span>
    </a>
  );
}
