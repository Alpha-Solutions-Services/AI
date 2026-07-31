"use client";

import dynamic from "next/dynamic";

const GalaxyView = dynamic(
  () =>
    import("@/components/universe/GalaxyView").then((m) => m.GalaxyView),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
        Initializing Alpha Universe…
      </div>
    ),
  }
);

/**
 * Galaxy home — Stage 2 main screen.
 * Command bar lives inside GalaxyView (showGalaxyChrome via nested layout flag
 * is approximated: GalaxyView includes CommandBar; shell also skips duplicate
 * when pathname is exact /universe — handled in GalaxyChromeBridge).
 */
export default function UniverseHomePage() {
  return <GalaxyHome />;
}

function GalaxyHome() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col" data-galaxy-home>
      <GalaxyView />
    </div>
  );
}
