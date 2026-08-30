import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import os from "os";
dotenv.config();

// Get the user's Desktop folder path for local fallback storage
const getDesktopPath = () => path.join(os.homedir(), "Desktop", "RishabhGuestHouseImages");

export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Extract key ONLY if the URL belongs to your S3 bucket
const extractS3Key = (url) => {
  if (!url) return null;

  const bucketBase = `${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/`;

  if (!url.includes(bucketBase)) {
    console.warn("URL is not from S3 bucket → Skip deletion:", url);
    return null;
  }

  return url.split(bucketBase)[1]; // return everything after the bucket prefix
};


const deleteLocalFileFromUrl = async (fileUrl) => {
  try {
    let localPath;
    if (fileUrl.startsWith("file:///")) {
      // Convert file URL to local path (handle Windows paths correctly)
      let rawPath = fileUrl.replace("file:///", "");
      if (process.platform === "win32" && rawPath.match(/^\/[a-zA-Z]:\//)) {
        rawPath = rawPath.slice(1);
      }
      localPath = path.resolve(rawPath);
    } else if (fileUrl.startsWith("/images/")) {
      const relKey = fileUrl.replace(/^\/images\//, "");
      localPath = path.join(getDesktopPath(), relKey);
    } else {
      return false;
    }

    // Only proceed if the path is inside our Desktop storage folder
    const desktopBase = getDesktopPath();
    if (!localPath.startsWith(desktopBase)) {
      console.warn("Local file path is outside Desktop storage, skipping deletion:", localPath);
      return false;
    }

    if (fs.existsSync(localPath)) {
      await fs.promises.unlink(localPath);
      console.log(`[LOCAL] Deleted file: ${localPath}`);
      return true;
    } else {
      console.log(`[LOCAL] File not found (already deleted?): ${localPath}`);
      return true;
    }
  } catch (err) {
    console.error("[LOCAL] Error deleting local file:", err);
    return false;
  }
};

export const deleteFromS3 = async (imageUrl) => {
  console.log("🟡 deleteFromS3 CALLED:", imageUrl);
  
  if (!imageUrl) {
    console.log("⛔ No image URL, skipping...");
    return { success: true, skipped: true };
  }

  // Handle local file:// URLs first
  if (imageUrl.startsWith("file:///")) {
    const deleted = await deleteLocalFileFromUrl(imageUrl);
    return { success: deleted, local: true };
  }

  // Try S3 deletion
  const key = extractS3Key(imageUrl);

  if (!key) {
    console.log("❌ Unable to extract S3 key from URL");
    return { success: false, error: "Invalid S3 URL format" };
  }

  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  };

  console.log("📦 S3 Delete Params:", params);

  try {
    await s3.send(new DeleteObjectCommand(params));
    console.log("🟢 S3 Deletion Successful:", key);
    return { success: true, key };
  } catch (err) {
    console.error("🔥 S3 Delete Error:", err);
    // S3 returns 204 even if file doesn't exist, but other errors should be caught
    return { success: false, error: err.message };
  }
};