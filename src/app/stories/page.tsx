import type { Metadata } from "next";
import { GridBackground } from "@/components/layout/grid-background";
import { Header } from "@/components/layout/header";
import Footer from "@/components/shared/footer";
import { StoriesConsole } from "@/components/stories/stories-console";
import "@/components/stories/stories.css";
import { pageSeo } from "@/lib/seo";
import { SHOW_TITLE } from "@/data/episodes";

export const metadata: Metadata = pageSeo({
  title: `${SHOW_TITLE} | Stories`,
  description: "Conversations worth keeping. Every episode of FIRST TAKE — BY JAZZHQ.",
  path: "/stories",
});

export default function StoriesPage() {
  return (
    <GridBackground>
      <Header />
      <main className="st-page flex-1">
        <StoriesConsole />
      </main>
      <Footer />
    </GridBackground>
  );
}
