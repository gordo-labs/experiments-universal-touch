import Link from "next/link";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Online escape room</p>
        <h1 className={styles.title}>ScapeRoom</h1>
        <p className={styles.lead}>
          Hand-tracking multiplayer experiments built on MediaPipe + Three.js.
          Fingertip positions drive the game input layer.
        </p>
        <Link href="/play" className={styles.cta}>
          Enter play mode
        </Link>
      </div>

      <section className={styles.stack}>
        <h2>Stack</h2>
        <ul>
          <li>Next.js 16 · App Router · Tailwind 4</li>
          <li>MediaPipe Hand Landmarker (from camera_ar)</li>
          <li>Layered React contexts — camera, tracking, fingers, scene, game</li>
          <li>Three.js scene layer ready for 3D mechanics</li>
        </ul>
      </section>
    </main>
  );
}
