import Link from "next/link";
import { PUZZLE_PHASES, PUZZLE_PHASE_IDS } from "@/game/phases/types";
import styles from "./page.module.css";

export default function PlayHubPage() {
  return (
    <main className={styles.hub}>
      <h1 className={styles.title}>Play mode</h1>
      <p className={styles.lead}>Dev: each game has its own URL. Progress gates come later.</p>
      <ul className={styles.list}>
        {PUZZLE_PHASE_IDS.map((id) => {
          const meta = PUZZLE_PHASES[id];
          return (
            <li key={id}>
              <Link href={`/play/${meta.index}`} className={styles.link}>
                <span className={styles.gameLabel}>{meta.gameLabel}</span>
                <span className={styles.gameTitle}>{meta.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link href="/" className={styles.back}>
        ← home
      </Link>
    </main>
  );
}
