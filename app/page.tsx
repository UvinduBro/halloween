import { Landing } from "@/components/ui/Landing";
import { detectHeroAsset, posterArt } from "@/lib/assets";

export default function Home() {
  const assets = { uvi: detectHeroAsset("uvi"), ruvi: detectHeroAsset("ruvi") };
  const posters = { uvi: posterArt("uvi"), ruvi: posterArt("ruvi") };
  return <Landing assets={assets} posters={posters} />;
}
