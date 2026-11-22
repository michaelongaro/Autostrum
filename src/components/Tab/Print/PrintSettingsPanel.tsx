import type { ReactNode } from "react";
import { observeVerticalScrollFade } from "~/utils/scrollFade";

export default function PrintSettingsPanel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-0 border-b md:border-b-0 md:border-r">
      <aside
        ref={observeVerticalScrollFade}
        aria-label="Print settings"
        className="h-full overflow-y-auto overscroll-contain [--scroll-fade-size:28px]"
      >
        <div className="p-5 pb-24 md:pb-5">{children}</div>
      </aside>
    </div>
  );
}
