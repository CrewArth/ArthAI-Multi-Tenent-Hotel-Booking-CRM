import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';

dotenv.config();

const getDesktopFallbackPath = () => path.join(os.homedir(), 'Desktop', 'RishabhGuestHouseImages');

/**
 * Instantiate S3 Client using custom config or process.env defaults
 */
export const getS3Client = (s3Config = {}) => {
  const region = s3Config.region || process.env.AWS_REGION || 'us-east-1';
  const accessKeyId = s3Config.key || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = s3Config.secretKey || process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
};

/**
 * Save file locally when S3 is unavailable or unconfigured
 */
const uploadToLocalFallback = async (key, buffer) => {
  const localPath = path.join(getDesktopFallbackPath(), key);
  const dir = path.dirname(localPath);

  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(localPath, buffer);

  const formattedUrl = `file:///${localPath.replace(/\\/g, '/')}`;
  console.log(`[Local Storage Fallback] Saved ${key} -> ${formattedUrl}`);
  return formattedUrl;
};

/**
 * Parse Base64 String (data:image/png;base64,...) into Buffer and MIME info
 */
export const parseBase64Data = (base64Str) => {
  if (!base64Str || typeof base64Str !== 'string') return null;

  const matches = base64Str.match(/^data:(.+);base64,(.+)$/);
  if (!matches) {
    // Check if it's already a URL or path
    if (base64Str.startsWith('http://') || base64Str.startsWith('https://') || base64Str.startsWith('file:///')) {
      return { isUrl: true, url: base64Str };
    }
    return null;
  }

  const mimeType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  let ext = 'bin';
  if (mimeType.includes('png')) ext = 'png';
  else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
  else if (mimeType.includes('webp')) ext = 'webp';
  else if (mimeType.includes('pdf')) ext = 'pdf';
  else if (mimeType.includes('svg')) ext = 'svg';

  return { mimeType, buffer, ext };
};

/**
 * Optimize image buffer using Sharp (resizes to 1280px max width, WebP 70% quality)
 * Leaves PDF and non-image files untouched.
 */
export const optimizeBuffer = async (buffer, mimeType) => {
  if (!mimeType || !mimeType.startsWith('image/')) {
    return { buffer, contentType: mimeType || 'application/octet-stream', ext: 'pdf' };
  }

  try {
    const optimized = await sharp(buffer)
      .resize(1280, 720, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();

    return { buffer: optimized, contentType: 'image/webp', ext: 'webp' };
  } catch (err) {
    console.warn('[Sharp Warning] Image optimization failed, using original buffer:', err.message);
    return { buffer, contentType: mimeType, ext: mimeType.split('/')[1] || 'img' };
  }
};

/**
 * Upload buffer to S3 or fallback to local storage
 */
export const uploadBufferToS3 = async (key, buffer, contentType, s3Config = {}) => {
  const bucketName = s3Config.bucketName || process.env.AWS_S3_BUCKET;
  const region = s3Config.region || process.env.AWS_REGION || 'us-east-1';
  const s3Client = getS3Client(s3Config);

  if (s3Client && bucketName) {
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        })
      );
      const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
      console.log(`[S3 Upload Success] ${key} -> ${s3Url}`);
      return s3Url;
    } catch (err) {
      console.warn(`[S3 Upload Warning] Failed uploading ${key} to S3 (${err.message}). Falling back to local storage.`);
    }
  }

  return await uploadToLocalFallback(key, buffer);
};

/**
 * High-level helper: Accepts Base64 document, optimizes if image, and uploads to S3
 */
export const uploadBase64Document = async ({ base64Data, tenantId, category, fileLabel, s3Config }) => {
  if (!base64Data) return '';

  const parsed = parseBase64Data(base64Data);
  if (!parsed) return '';
  if (parsed.isUrl) return parsed.url;

  const { buffer, contentType, ext } = await optimizeBuffer(parsed.buffer, parsed.mimeType);
  const key = `tenants/${tenantId}/${category}/${fileLabel}_${Date.now()}.${ext}`;

  return await uploadBufferToS3(key, buffer, contentType, s3Config);
};
