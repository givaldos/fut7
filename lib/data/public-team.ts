import "server-only";

import type { Database } from "@/lib/database.types";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { createClient } from "@/lib/supabase/server";
import { cache } from "react";

type PublicUpcomingEvent = {
  event_id: string;
  team_timezone: string;
  title: string;
  kind: Database["public"]["Enums"]["event_kind"];
  sport_format: Database["public"]["Enums"]["sport_format"];
  starts_at: string;
  ends_at: string;
  attendance_deadline: string | null;
  opponent_name: string | null;
};

export const getPublicTeam = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_team_directory")
    .select(
      "slug, name, logo_path, cover_path, default_sport_format, about, instagram_url, facebook_url, youtube_url, tiktok_url, website_url",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error("Não foi possível carregar a página pública do time.");
  }

  if (!data) return null;
  const signedUrlByPath = await createSignedUrlMap(
    "team_media",
    [data.logo_path, data.cover_path].filter((path): path is string => Boolean(path)),
  );
  return {
    ...data,
    logo_url: data.logo_path ? signedUrlByPath.get(data.logo_path) ?? null : null,
    cover_url: data.cover_path ? signedUrlByPath.get(data.cover_path) ?? null : null,
  };
});

export async function getPublicAthletes(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_athlete_directory")
    .select(
      "registration_number, display_name, shirt_number, photo_path, positions, player_handle",
    )
    .eq("team_slug", slug)
    .order("display_name");

  if (error) {
    throw new Error("Não foi possível carregar o elenco público.");
  }

  const signedUrlByPath = await createSignedUrlMap(
    "athlete_avatars",
    (data ?? []).flatMap((athlete) =>
      athlete.photo_path ? [athlete.photo_path] : [],
    ),
  );
  return (data ?? []).map((athlete) => ({
    ...athlete,
    photo_url: athlete.photo_path
      ? signedUrlByPath.get(athlete.photo_path) ?? null
      : null,
  }));
}

export async function getPublicTeamMedia(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_team_media")
    .select("id, storage_path, alt_text, sort_order, is_featured, created_at")
    .eq("team_slug", slug)
    .order("is_featured", { ascending: false })
    .order("sort_order")
    .order("created_at")
    .limit(13);

  if (error) throw new Error("Não foi possível carregar as fotos do time.");
  const signedUrlByPath = await createSignedUrlMap(
    "team_media",
    (data ?? []).flatMap((item) =>
      item.storage_path ? [item.storage_path] : [],
    ),
  );
  return (data ?? []).flatMap((item) => {
    if (!item.id || !item.storage_path) return [];
    const url = signedUrlByPath.get(item.storage_path);
    return url
      ? [{
          id: item.id,
          url,
          altText: item.alt_text ?? "Foto do time",
          isFeatured: item.is_featured ?? false,
        }]
      : [];
  });
}

export async function getPublicUpcomingEvents(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_team_upcoming_events")
    .select("event_id, team_timezone, title, kind, sport_format, starts_at, ends_at, attendance_deadline, opponent_name")
    .eq("team_slug", slug)
    .order("starts_at")
    .limit(8);

  if (error) {
    throw new Error("Não foi possível carregar a agenda pública do time.");
  }

  return (data ?? []).flatMap((event): PublicUpcomingEvent[] => {
    if (
      !event.event_id ||
      !event.team_timezone ||
      !event.title ||
      !event.kind ||
      !event.sport_format ||
      !event.starts_at ||
      !event.ends_at
    ) {
      return [];
    }

    return [{
      event_id: event.event_id,
      team_timezone: event.team_timezone,
      title: event.title,
      kind: event.kind,
      sport_format: event.sport_format,
      starts_at: event.starts_at,
      ends_at: event.ends_at,
      attendance_deadline: event.attendance_deadline,
      opponent_name: event.opponent_name,
    }];
  });
}

export async function getPublicPositions(
  sportFormat: "field" | "society" | "futsal",
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("positions")
    .select("code, label")
    .eq("sport_format", sportFormat)
    .order("sort_order");

  if (error) {
    throw new Error("Não foi possível carregar as posições.");
  }

  return data ?? [];
}

async function createSignedUrlMap(bucket: string, paths: string[]) {
  const uniquePaths = [...new Set(paths)];
  if (!uniquePaths.length) return new Map<string, string>();
  const privileged = createPrivilegedClient();
  const { data, error } = await privileged.storage
    .from(bucket)
    .createSignedUrls(uniquePaths, 3600);
  if (error) return new Map<string, string>();
  return new Map(
    (data ?? []).flatMap((item) =>
      item.path && item.signedUrl ? [[item.path, item.signedUrl] as const] : [],
    ),
  );
}
