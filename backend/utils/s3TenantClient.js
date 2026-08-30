import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import os from "os";
import { decrypt } from "./encryption.js";

dotenv.config();

const getDesktopPath = () => path.join(os.homedir(), "Desktop", "RishabhGuestHouseImages");

/**
 * Instantiates an AWS S3 client using tenant-specific credentials or default env.
 */
export const getTenantS3Client = (s3Config = {}) => {
  const region = decrypt(s3Config.region) || process.env.AWS_REGION;
  const accessKeyId = decrypt(s3Config.key) || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = decrypt(s3Config.secretKey) || process.env.AWS_SECRET_ACCESS_KEY;

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
};

const uploadToLocal = async (key, buffer) => {
  const localPath = path.join(getDesktopPath(), key);
  const dir = path.dirname(localPath);

  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(localPath, buffer);

  return `/images/${key.replace(/\\/g, '/')}`;
};

/**
 * Uploads image buffer to S3 (or local fallback) using tenant S3 bucket configuration.
 */
export const uploadTenantImage = async (key, buffer, contentType = 'image/webp', s3Config = {}) => {
  const bucketName = decrypt(s3Config.bucket_name || s3Config.bucketName) || process.env.AWS_S3_BUCKET;
  const region = decrypt(s3Config.region) || process.env.AWS_REGION;

  try {
    const s3Client = getTenantS3Client(s3Config);
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));

    const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
    console.log(`[S3 Tenant Upload] ${key} -> ${s3Url}`);
    return s3Url;
  } catch (s3Err) {
    console.warn(`[S3 Tenant Upload] S3 upload failed for ${key}, using local fallback:`, s3Err.message);
    const localUrl = await uploadToLocal(key, buffer);
    return localUrl;
  }
};
