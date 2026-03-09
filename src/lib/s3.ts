import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  GetObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";

// S3 client config (RustFS or any S3-compatible service)
// RustFS: https://rustfs.com - 2.3x faster than MinIO
export const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
  region: process.env.S3_REGION || "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "rustfsadmin",
    secretAccessKey: process.env.S3_SECRET_KEY || "rustfsadmin",
  },
});

// Bucket name
export const S3_BUCKET = process.env.S3_BUCKET || "uploads";

// Ensure bucket exists
export async function ensureBucketExists() {
  try {
    // Check if bucket exists
    await s3Client.send(
      new HeadBucketCommand({
        Bucket: S3_BUCKET,
      })
    );
  } catch (error: unknown) {
    // Create if missing
    const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      try {
        await s3Client.send(
          new CreateBucketCommand({
            Bucket: S3_BUCKET,
          })
        );
        console.log(`Bucket "${S3_BUCKET}" created successfully`);
      } catch (createError) {
        // Ignore create errors (may already exist)
        console.warn(`Failed to create bucket "${S3_BUCKET}":`, createError);
      }
    } else {
      console.error(`Error checking bucket "${S3_BUCKET}":`, error);
    }
  }
}

const MULTIPART_THRESHOLD_BYTES = 5 * 1024 * 1024; // 5 MB; use multipart for larger files
const MULTIPART_PART_SIZE = 5 * 1024 * 1024; // 5 MB minimum part size for S3

/** Multipart upload for large files (e.g. > 5MB). More reliable for big uploads. */
async function uploadToS3Multipart(fileName: string, buffer: Buffer, contentType: string): Promise<void> {
  const { UploadId } = await s3Client.send(
    new CreateMultipartUploadCommand({
      Bucket: S3_BUCKET,
      Key: fileName,
      ContentType: contentType,
    })
  );
  if (!UploadId) throw new Error("CreateMultipartUpload did not return UploadId");
  try {
    const parts: { PartNumber: number; ETag: string }[] = [];
    let partNumber = 1;
    for (let offset = 0; offset < buffer.length; offset += MULTIPART_PART_SIZE) {
      const chunk = buffer.subarray(offset, Math.min(offset + MULTIPART_PART_SIZE, buffer.length));
      const { ETag } = await s3Client.send(
        new UploadPartCommand({
          Bucket: S3_BUCKET,
          Key: fileName,
          UploadId,
          PartNumber: partNumber,
          Body: chunk,
        })
      );
      if (ETag) parts.push({ PartNumber: partNumber, ETag });
      partNumber++;
    }
    await s3Client.send(
      new CompleteMultipartUploadCommand({
        Bucket: S3_BUCKET,
        Key: fileName,
        UploadId,
        MultipartUpload: { Parts: parts },
      })
    );
  } catch (err) {
    await s3Client.send(
      new AbortMultipartUploadCommand({ Bucket: S3_BUCKET, Key: fileName, UploadId })
    ).catch(() => {});
    throw err;
  }
}

// Upload file to S3 (single PUT for small files, multipart for large)
export async function uploadToS3(fileName: string, buffer: Buffer, contentType: string): Promise<string> {
  await ensureBucketExists();

  if (buffer.length >= MULTIPART_THRESHOLD_BYTES) {
    await uploadToS3Multipart(fileName, buffer, contentType);
  } else {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: fileName,
        Body: buffer,
        ContentType: contentType,
      })
    );
  }

  return `/api/media/serve/${fileName}`;
}

// List all objects
export async function listS3Objects() {
  await ensureBucketExists();

  const command = new ListObjectsV2Command({
    Bucket: S3_BUCKET,
  });

  const response = await s3Client.send(command);
  return response.Contents || [];
}

// Delete object
export async function deleteFromS3(fileName: string) {
  await ensureBucketExists();

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: fileName,
    })
  );
}

// Read object bytes and content type
export async function getFromS3(fileName: string): Promise<{ buffer: Buffer; contentType: string | null }> {
  await ensureBucketExists();
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: fileName,
    })
  );

  const body = response.Body;
  if (!body) return { buffer: Buffer.alloc(0), contentType: response.ContentType ?? null };

  if (typeof (body as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray === "function") {
    const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
    return { buffer: Buffer.from(bytes), contentType: response.ContentType ?? null };
  }

  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array | Buffer | string>) {
    if (typeof chunk === "string") chunks.push(Buffer.from(chunk));
    else chunks.push(Buffer.from(chunk));
  }
  return { buffer: Buffer.concat(chunks), contentType: response.ContentType ?? null };
}
