import { NextResponse } from "next/server";
import { z } from "zod";

import { geocodeAddress } from "@/lib/nominatim";

const querySchema = z.object({
  q: z.string().trim().min(3).max(220),
  city: z.string().trim().max(120).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);

  const parsed = querySchema.safeParse({
    q: url.searchParams.get("q"),
    city: url.searchParams.get("city") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ result: null }, { status: 400 });
  }

  try {
    const result = await geocodeAddress({
      address: parsed.data.q,
      city: parsed.data.city,
    });

    return NextResponse.json({ result });
  } catch {
    return NextResponse.json({ result: null }, { status: 200 });
  }
}
