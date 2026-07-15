"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemberContext, loadMemberId, saveMemberId, useMember } from "@/lib/member";
import { memberById, type Member } from "@/lib/constants";
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

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 15_000, retry: 1 },
        },
      }),
  );

  const [member, setMemberRaw] = useState<Member | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setMemberRaw(memberById(loadMemberId()) ?? null);
    setReady(true);
  }, []);

  const value = useMemo(
    () => ({
      member,
      ready,
      setMember: (m: Member | null) => {
        saveMemberId(m?.id ?? null);
        setMemberRaw(m);
      },
    }),
    [member, ready],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <MemberContext.Provider value={value}>
        <RealtimeBridge />
        <MemberGate>{children}</MemberGate>
      </MemberContext.Provider>
    </QueryClientProvider>
  );
}
