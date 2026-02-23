import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ✅ filePath 또는 path 둘 다 허용
    const userPath = (body?.filePath ?? body?.path) as string;
    const content = body?.content as string;

    if (!userPath || typeof userPath !== "string") {
      throw new Error("Invalid path");
    }
    if (typeof content !== "string") {
      throw new Error("Invalid content");
    }

    const root = process.cwd();
    const fullPath = path.join(root, userPath);

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, "utf-8");

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 400 }
    );
  }
}