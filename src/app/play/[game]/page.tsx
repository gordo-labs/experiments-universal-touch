import { PlayGamePage } from "@/components/PlayGamePage";

type PageProps = {
  params: Promise<{ game: string }>;
};

export default async function PlayGameRoute({ params }: PageProps) {
  const { game } = await params;
  const gameNumber = Number.parseInt(game, 10);
  return <PlayGamePage gameNumber={gameNumber} />;
}
