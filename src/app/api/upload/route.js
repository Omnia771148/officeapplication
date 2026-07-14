import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "../../../../lib/s3";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const id = formData.get("id") || formData.get("restId");
    const folder = formData.get("folder") || "restaurants";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!id) {
      return NextResponse.json({ error: "ID (id or restId) is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Extract file extension and build standard filename
    const originalName = file.name || "image.png";
    const fileExtension = originalName.split(".").pop();
    const fileName = `${id}_${Date.now()}.${fileExtension}`;
    const key = `${folder}/${fileName}`;

    // Upload params
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    };

    // Upload to S3
    await s3Client.send(new PutObjectCommand(uploadParams));

    // Construct the public URL (use CDN if defined in environment variables)
    const publicUrl = process.env.NEXT_PUBLIC_CDN_URL
      ? `${process.env.NEXT_PUBLIC_CDN_URL}/${key}`
      : `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
