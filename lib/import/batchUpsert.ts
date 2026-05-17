import type { SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedAccident } from "@/lib/sources/types";
import { inputToInsertRow } from "@/lib/supabase/accident";

export function normalizedAccidentToDbRow(
  n: NormalizedAccident,
  externalSourceId: string
): Record<string, unknown> {
  return inputToInsertRow(
    {
      category: n.category,
      title: n.title,
      description: n.description,
      occurredAt: n.occurredAt,
      location: n.location,
      address: n.address,
      newsUrl: n.newsUrl,
      metadata: {
        ...(n.metadata ?? {}),
        external_id: externalSourceId.slice(0, 2000),
      },
      tags: n.tags,
      mediaUrls: n.mediaUrls,
    },
    {
      sourceType: n.sourceType,
      createdBy: null,
      confidence: n.confidence ?? undefined,
      externalSourceId: externalSourceId.slice(0, 2000),
    }
  ) as Record<string, unknown>;
}

export function externalIdForNormalized(
  n: NormalizedAccident,
  fallback: string
): string {
  const meta = n.metadata?.external_id;
  if (typeof meta === "string" && meta.trim()) return meta.trim();
  return fallback;
}

export async function upsertAccidentBatch(
  admin: SupabaseClient,
  rows: Record<string, unknown>[],
  batchSize = 40
): Promise<{ upserted: number; errors: string[] }> {
  const errors: string[] = [];
  let upserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await admin.from("accidents").upsert(chunk, {
      onConflict: "source_type,external_source_id",
    });
    if (error) {
      errors.push(`offset ${i}: ${error.message}`);
    } else {
      upserted += chunk.length;
    }
  }
  return { upserted, errors };
}
