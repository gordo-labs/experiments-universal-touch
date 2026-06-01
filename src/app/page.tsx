import Link from "next/link";

export default function HomePage() {
  return (
    <main className="ts-scene">
      <div className="ts-card ts-cardHero">
        <h1 className="ts-title ts-titleHero">Touching Stars</h1>
        <p className="ts-lead">
          Your hands reach into the space between stars. Four thresholds lie ahead, the void
          leaves for you to answer.
        </p>

        <div className="ts-warning" role="note">
          <p className="ts-warningTitle">Camera required</p>
          <p className="ts-warningBody">
            You must allow camera access when your browser asks. Without it, you won&apos;t be
            able to play.
          </p>
        </div>

        <Link href="/play/1" className="ts-cta">
          Begin
        </Link>
      </div>
    </main>
  );
}
