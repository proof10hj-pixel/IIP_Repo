import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

async function readByPath(userPath: string) {
  if (!userPath || typeof userPath !== "string") {
    throw new Error("Invalid path");
  }

  const root = process.cwd();
  const fullPath = path.join(root, userPath);

  try {
    const content = await fs.readFile(fullPath, "utf-8");
    return { ok: true, exists: true, content };
  } catch {
    return { ok: true, exists: false, content: "" };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userPath = body?.path as string;
    const data = await readByPath(userPath);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 400 }
    );
  }
}

// ✅ GET 지원 추가 (query string 기반)
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userPath = url.searchParams.get("path") ?? "";
    const data = await readByPath(userPath);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 400 });
  }
}