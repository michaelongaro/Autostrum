import Link from "next/link";
import { FaPlay } from "react-icons/fa6";
import { SAMPLE_TAB } from "../../content";
import { cn } from "~/utils/cn";

type TabCardMockProps = {
  className?: string;
  large?: boolean;
  showPlay?: boolean;
};

function TabCardMock({
  className,
  large = false,
  showPlay = false,
}: TabCardMockProps) {
  return (
    <Link
      href={SAMPLE_TAB.href}
      className={cn(
        "hp-panel hp-card-hover group block overflow-hidden rounded-xl border bg-background shadow-md",
        large ? "w-full max-w-[360px]" : "w-full max-w-[280px]",
        className,
      )}
    >
      <div
        className={cn(
          "relative border-b bg-[#1c1917] px-3 py-4",
          large ? "min-h-[160px]" : "min-h-[120px]",
        )}
      >
        <div className="space-y-2 font-mono text-[11px] leading-5 text-[#e8d8cf]/80 sm:text-xs">
          <p>e|----11----11----9-----11----|</p>
          <p>B|----12----12----10----12----|</p>
          <p>G|----11----11----9-----11----|</p>
          <p>D|----------------------------|</p>
        </div>
        {showPlay && (
          <span className="baseFlex absolute bottom-3 right-3 size-10 rounded-full border border-audio bg-audio text-audio-foreground opacity-95 transition group-hover:scale-105 hp-play-pulse">
            <FaPlay className="ml-0.5 size-3.5" />
          </span>
        )}
      </div>
      <div className="baseVertFlex !items-start gap-2 p-3 sm:p-4">
        <div>
          <p className="text-base font-semibold sm:text-lg">{SAMPLE_TAB.title}</p>
          <p className="text-sm text-foreground/70">{SAMPLE_TAB.artist}</p>
        </div>
        <div className="baseFlex gap-2 text-xs">
          <span className="rounded-md bg-red-700/90 px-2 py-0.5 text-white">
            {SAMPLE_TAB.genre}
          </span>
          <span className="baseFlex gap-0.5" aria-label="Difficulty 4 of 5">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-3 w-1.5 rounded-sm",
                  i < SAMPLE_TAB.difficulty
                    ? "bg-primary"
                    : "bg-foreground/15",
                )}
              />
            ))}
          </span>
          <span className="text-foreground/55">{SAMPLE_TAB.date}</span>
        </div>
      </div>
    </Link>
  );
}

export default TabCardMock;
