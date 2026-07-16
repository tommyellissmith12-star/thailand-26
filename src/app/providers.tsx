"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemberContext, loadMemberId, saveMemberId, useMember } from "@/lib/member";
import { useMembers } from "@/lib/members";
import type { Member } from "@/lib/constants";
import { useBoardChannel } from "@/lib/realtime";

function RealtimeBridge() {
  useBoardChannel();
  return null;
}

// Client-side half of the gate: the PIN is enforced by middleware, but picking
// who you are happens here. No member chosen -> back to /enter.
function MemberGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { member, ready } = useMember();

  useEffect(() => {
    if (ready && !member && pathname !== "/enter") {
      router.replace("/enter");
    }
  }, [ready, member, pathname, router]);

  if (!ready) return null;
  return <>{children}</>;
}

// Stores only the member ID; the display profile (nickname, avatar, photo)
// comes from the members query so in-app edits show up immediately.
function MemberProvider({ children }: { children: React.ReactNode }) {
  const [memberId, setMemberId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const members = useMembers();

  useEffect(() => {
    setMemberId(loadMemberId());
    setReady(true);
  }, []);

  const value = useMemo(
    () => ({
      member: members.find((m) => m.id === memberId) ?? null,
      ready,
      setMember: (m: Member | null) => {
        saveMemberId(m?.id ?? null);
        setMemberId(m?.id ?? null);
      },
    }),
    [members, memberId, ready],
  );

  return (
    <MemberContext.Provider value={value}>
      <RealtimeBridge />
      <MemberGate>{children}</MemberGate>
    </MemberContext.Provider>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 15_000, retry: 1 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <MemberProvider>{children}</MemberProvider>
    </QueryClientProvider>
  );
}
