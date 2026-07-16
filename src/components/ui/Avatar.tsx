"use client";

import { useMembersMap } from "@/lib/members";
import { publicImageUrl } from "@/lib/supabase";

export default function Avatar({
  memberId,
  size = 28,
}: {
  memberId: string | null | undefined;
  size?: number;
}) {
  const members = useMembersMap();
  const member = memberId ? members.get(memberId) : undefined;
  if (!member) return null;

  return (
    <span
      title={member.name}
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-paper shadow-paper"
      style={{
        width: size,
        height: size,
        background: member.color,
        fontSize: size * 0.55,
      }}
    >
      {member.photoPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={publicImageUrl(member.photoPath)}
          alt={member.name}
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        member.avatar
      )}
    </span>
  );
}
