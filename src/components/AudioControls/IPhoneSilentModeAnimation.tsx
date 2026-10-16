import { useId } from "react";
import styles from "./IPhoneSilentModeAnimation.module.css";

export default function IPhoneSilentModeAnimation() {
  const maskId = `${useId()}-bell-slash`;

  return (
    <div aria-hidden="true" className={styles.animation}>
      <div className={styles.bell} data-silent-mode-icon>
        <svg viewBox="0 0 64 64" fill="currentColor" focusable="false">
          <defs>
            <mask
              id={maskId}
              x="0"
              y="0"
              width="64"
              height="64"
              maskUnits="userSpaceOnUse"
            >
              <rect width="64" height="64" fill="white" />
              <path
                className={styles.slash}
                d="m10 9 45 45"
                pathLength="1"
                fill="none"
                stroke="black"
                strokeWidth="10"
                strokeLinecap="round"
              />
            </mask>
          </defs>
          <g mask={`url(#${maskId})`}>
            <path d="M32 5a3 3 0 0 0-3 3v2.3C20.1 11.7 14 18.8 14 28v9.4c0 4-1.8 7.1-4.8 10.2C7.7 49.2 8.8 52 11 52h42c2.2 0 3.3-2.8 1.8-4.4C51.8 44.5 50 41.4 50 37.4V28c0-9.2-6.1-16.3-15-17.7V8a3 3 0 0 0-3-3ZM25 56a7 7 0 0 0 14 0H25Z" />
          </g>
          <path
            className={styles.slash}
            data-silent-mode-slash
            d="m10 9 45 45"
            pathLength="1"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}
