import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/Section";
import { SourcesList } from "@/components/ui/SourcesList";
import { uviSources } from "@/data/uvi";
import { ruviSources } from "@/data/ruvi";
import { site } from "@/data/site";

export const metadata: Metadata = { title: "Sources", description: "Tutorials and build logs this guide draws on." };

export default function SourcesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <SectionHeading kicker="Those who came before" title="Sources" />
      <p className="mb-8 max-w-2xl text-fog">
        These tutorials and build logs informed the measurements and methods here. Go and read them; they did the hard work first.
      </p>
      <h2 className="mb-3 font-heading text-2xl text-bandage">Uvi · pyramid helmet</h2>
      <SourcesList sources={uviSources} />
      <h2 className="mb-3 mt-10 font-heading text-2xl text-bandage">Ruvi · nurse</h2>
      <SourcesList sources={ruviSources} />
      <p className="mt-10 text-sm text-fog-dim">{site.disclaimer}</p>
    </div>
  );
}
