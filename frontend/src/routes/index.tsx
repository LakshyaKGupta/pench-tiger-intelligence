import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/tigertrack/Navbar";
import { Hero } from "@/components/tigertrack/Hero";
import { IntelligencePipeline } from "@/components/tigertrack/IntelligencePipeline";
import { HowItWorks } from "@/components/tigertrack/HowItWorks";
import { IntelligenceDashboard } from "@/components/tigertrack/IntelligenceDashboard";
import { WildlifeMap } from "@/components/tigertrack/WildlifeMap";
import { FinalCTA } from "@/components/tigertrack/FinalCTA";
import { Footer } from "@/components/tigertrack/Footer";

const title = "TIGERTRACK AI — Tiger Movement Intelligence, Pench Reserve";
const description =
  "AI camera-trap triage and individual tiger identification for Pench Tiger Reserve: filter blank frames, match stripe patterns, map territories and detect movement deviations.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main>
      <Navbar />
      <Hero />
      <IntelligencePipeline />
      <HowItWorks />
      <IntelligenceDashboard />
      <WildlifeMap />
      <FinalCTA />
      <Footer />
    </main>
  );
}
