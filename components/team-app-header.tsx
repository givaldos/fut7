import { BrandMark } from "@/components/brand-mark";
import { LogoutButton } from "@/components/logout-button";
import { TeamPrimaryNavigation } from "@/components/team-primary-navigation";
import { TeamSwitcher } from "@/components/team-switcher";

export function TeamAppHeader({
  currentName,
  currentSlug,
  teams,
}: {
  currentName: string;
  currentSlug: string;
  teams: { name: string; slug: string }[];
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <BrandMark href={`/app/${currentSlug}`} compact />
          <TeamSwitcher currentName={currentName} teams={teams} />
        </div>
        <div className="flex items-center gap-2">
          <TeamPrimaryNavigation teamSlug={currentSlug} />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
