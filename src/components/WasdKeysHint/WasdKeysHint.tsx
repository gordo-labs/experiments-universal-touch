import styles from "./WasdKeysHint.module.css";

/** Tron-style WASD key layout for maze intro. */
export function WasdKeysHint() {
  return (
    <div className={styles.root} aria-hidden>
      <div className={styles.row}>
        <span className={styles.key}>W</span>
      </div>
      <div className={styles.row}>
        <span className={styles.key}>A</span>
        <span className={styles.key}>S</span>
        <span className={styles.key}>D</span>
      </div>
      <p className={styles.caption}>Move with WASD · mouse to look</p>
    </div>
  );
}
