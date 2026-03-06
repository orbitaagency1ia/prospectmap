import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchOverpassBusinesses } from "@/lib/overpass";

const querySchema = z.object({
  bbox: z
    .string()
    .regex(/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/)
    .transform((value) => value.split(",").map((item) => Number(item))),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    bbox: url.searchParams.get("bbox"),
  });

  if (!parsed.success) {
    return NextResponse.json({ businesses: [], fetchedAt: new Date().toISOString() }, { status: 400 });
  }

  const [south, west, north, east] = parsed.data.bbox;

  try {
    const businesses = await fetchOverpassBusinesses({
      south,
      west,
      north,
      east,
    });

    return NextResponse.json({
      businesses,
      fetchedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        businesses: [],
        fetchedAt: new Date().toISOString(),
        error: "overpass_unavailable",
      },
      { status: 200 },
    );
  }
}
