import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";

// S3 Client 設定（目前使用 RustFS，支援任何 S3-compatible 服務）
// RustFS: https://rustfs.com - 2.3x faster than MinIO
export const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
  region: process.env.S3_REGION || "us-east-1",
  forcePathStyle: true, // S3-compatible 服務通常需要 path-style
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "rustfsadmin",
    secretAccessKey: process.env.S3_SECRET_KEY || "rustfsadmin",
  },
});

// Bucket 名稱
export const S3_BUCKET = process.env.S3_BUCKET || "uploads";

// 確保 Bucket 存在
export async function ensureBucketExists() {
  try {
    // 檢查 Bucket 是否存在
    await s3Client.send(
      new HeadBucketCommand({
        Bucket: S3_BUCKET,
      })
    );
  } catch (error: unknown) {
    // 如果 Bucket 不存在，嘗試建立
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
        // 忽略建立錯誤（可能已經被其他請求建立了）
        console.warn(`Failed to create bucket "${S3_BUCKET}":`, createError);
      }
    } else {
      console.error(`Error checking bucket "${S3_BUCKET}":`, error);
    }
  }
}

// 上傳檔案到 S3
export async function uploadToS3(fileName: string, buffer: Buffer, contentType: string): Promise<string> {
  await ensureBucketExists();

  await s3Client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: fileName,
      Body: buffer,
      ContentType: contentType,
    })
  );

  // 回傳 API 路由（透過 Next.js API 提供檔案，確保安全）
  return `/api/media/serve/${fileName}`;
}

// 列出所有檔案
export async function listS3Objects() {
  await ensureBucketExists();

  const command = new ListObjectsV2Command({
    Bucket: S3_BUCKET,
  });

  const response = await s3Client.send(command);
  return response.Contents || [];
}

// 刪除檔案
export async function deleteFromS3(fileName: string) {
  await ensureBucketExists();

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: fileName,
    })
  );
}
