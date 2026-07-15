"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { memberById } from "@/lib/constants";
import { useMember } from "@/lib/member";
import { useAddComment, useComments } from "@/lib/queries";
import Avatar from "@/components/ui/Avatar";

export default function CommentThread({ pinId }: { pinId: string }) {
  const { member } = useMember();
  const { data: comments = [] } = useComments(pinId);
  const addComment = useAddComment();
  const [body, setBody] = useState("");

  function submit() {
    const trimmed = body.trim();
    if (!trimmed || !member) return;
    addComment.mutate({ pinId, memberId: member.id, body: trimmed });
    setBody("");
  }

  return (
    <section>
      <h3 className="font-hand text-xl text-ink-soft">the debate</h3>
      <ul className="mt-2 space-y-3">
        {comments.length === 0 && (
          <li className="font-hand text-lg text-ink-soft/60">
            silence... someone say something spicy 🌶️
          </li>
        )}
        {comments.map((c) => (
          <li key={c.id} className="flex items-start gap-2">
            <Avatar memberId={c.member_id} size={30} />
            <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-paper-deep/70 px-3 py-2">
              <p className="text-xs font-bold" style={{ color: memberById(c.member_id)?.color }}>
                {memberById(c.member_id)?.name ?? "?"}
              </p>
              <p className="whitespace-pre-wrap break-words text-sm">{c.body}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder={member ? `Go on, ${member.name}...` : "..."}
          className="max-h-28 flex-1 resize-none rounded-2xl border-2 border-ink/15 bg-paper px-3 py-2 text-sm outline-none focus:border-sea-deep"
        />
        <button
          onClick={submit}
          disabled={!body.trim()}
          aria-label="Send"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-sea-deep text-paper transition-all active:scale-90 disabled:opacity-40"
        >
          <Send size={18} />
        </button>
      </div>
    </section>
  );
}
