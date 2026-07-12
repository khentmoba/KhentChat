import { Storage } from "@google-cloud/storage";
import { nanoid } from "nanoid";
import { auth } from "@/app/(auth)/auth";

const storage = new Storage();
const bucket = storage.bucket(process.env.GOOGLE_STORAGE_BUCKET ?? "");

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

  const blob = bucket.file(pathname);
  await blob.save(buffer, {
    contentType: file.type || "application/octet-stream",
  });

  const url = `https://storage.googleapis.com/${bucket.name}/${pathname}`;

  return Response.json({
    contentType: file.type,
    pathname: file.name,
    url,
  });
}
