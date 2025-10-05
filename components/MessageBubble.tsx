'use client';
import clsx from "clsx";

export function MessageBubble({ speaker, text, ts, confidence }: { speaker: string; text: string; ts: number; confidence?: number }) {
  const isUser = speaker === "user";
  const bubbleCls = clsx(
    "relative max-w-[80%] px-3 py-2 mb-2 shadow",
    isUser
      ? "self-end bg-[#0b93f6] text-white rounded-3xl rounded-br-xl"
      : "self-start bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-50 rounded-3xl rounded-bl-xl"
  );
  const name = isUser ? "You" : speaker;
  const isThinking = text === "…thinking…";
  const time = ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div className="flex flex-col">
      <div className={bubbleCls}>
        {!isUser && (
          <div className="text-[11px] font-medium opacity-70 mb-1 flex items-center gap-2">
            <span>{name}</span>
            {typeof confidence === "number" && (
              <span className="badge">{Math.round(confidence * 100)}%</span>
            )}
          </div>
        )}
        <div className="whitespace-pre-wrap">
          {isThinking ? (
            <span className="inline-flex items-center text-white/80 dark:text-gray-200/80 typing">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </span>
          ) : (
            text
          )}
        </div>
        {time && (
          <div className={clsx("mt-1 text-[10px] opacity-60", isUser ? "text-right" : "text-left")}>{time}</div>
        )}
        {/* Bubble tails */}
        {!isUser && (
          <span className="pointer-events-none absolute -bottom-1 left-2 w-0 h-0 border-t-8 border-t-gray-200 dark:border-t-gray-800 border-l-8 border-l-transparent"></span>
        )}
        {isUser && (
          <span className="pointer-events-none absolute -bottom-1 right-2 w-0 h-0 border-t-8 border-t-[#0b93f6] border-r-8 border-r-transparent"></span>
        )}
      </div>
    </div>
  );
}
