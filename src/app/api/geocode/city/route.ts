import { NextResponse } from "next/server";
import { z } from "zod";

import { searchCities } from "@/lib/nominatim";

const querySchema = z.object({
  q: z.string().trim().min(2).max(120),
  limit: z.coerce.number().int().min(1).max(8).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);

  const parsed = querySchema.safeParse({
    q: url.searchParams.get("q"),
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ suggestions: [] }, { status: 400 });
  }

  try {
    const suggestions = await searchCities(parsed.data.q, parsed.data.limit);
    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}
