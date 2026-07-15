import { memberById } from "@/lib/constants";

export default function Avatar({
  memberId,
  size = 28,
}: {
  memberId: string | null | undefined;
  size?: number;
}) {
  const member = memberById(memberId);
  if (!member) return null;
  return (
    <span
      title={member.name}
      className="inline-flex shrink-0 items-center justify-center rounded-full border-2 border-paper shadow-paper"
      style={{
        width: size,
        height: size,
        background: member.color,
        fontSize: size * 0.55,
      }}
    >
      {member.avatar}
    </span>
  );
}
