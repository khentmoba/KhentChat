import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import { auth } from "@/app/(auth)/auth";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = file.name.split(".").pop() ?? "";
  const pathname = `${nanoid()}.${ext}`;

  const blob = await put(pathname, buffer, {
    access: "public",
    contentType: file.type || "application/octet-stream",
  });

  return Response.json({
    contentType: file.type,
    pathname: file.name,
    url: blob.url,
  });
}
