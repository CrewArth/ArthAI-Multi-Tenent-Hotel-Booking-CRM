import multer from "multer";
import sharp from "sharp";
import { uploadTenantImage } from "../utils/s3TenantClient.js";

const slugify = (str) =>
  String(str || 'unknown')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .substring(0, 60) || 'unknown';

const todayUtc = () => new Date().toISOString().split('T')[0];

const resolveGuestHouseName = async (req, guestHouseIdOrObj) => {
  if (!guestHouseIdOrObj) return 'unknown';
  if (typeof guestHouseIdOrObj === 'object' && guestHouseIdOrObj.guestHouseName) {
    return guestHouseIdOrObj.guestHouseName;
  }
  try {
    const GuestHouse = req.tenantModels?.GuestHouse;
    if (GuestHouse) {
      const gh = await GuestHouse.findOne({ guestHouseId: String(guestHouseIdOrObj) }).lean();
      if (gh?.guestHouseName) return gh.guestHouseName;
    }
    return String(guestHouseIdOrObj);
  } catch {
    return String(guestHouseIdOrObj);
  }
};

const multerOptions = {
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  },
};

export const upload = multer(multerOptions).single('image');

export const uploadVerificationImage = multer(multerOptions).fields([
  { name: 'verificationImage', maxCount: 1 },
  { name: 'familyMemberImages', maxCount: 10 },
]);

export const uploadESignature = multer(multerOptions).single('eSignature');

export const uploadSingleDocument = multer(multerOptions).single('document');

export const processAndUploadGuestDocument = async (req, res, next) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ message: 'No document image file provided' });
  }

  try {
    const bookingId = req.booking?._id || req.params.id || req.params.bookingId || 'temp';
    const guestId   = req.params.guestId || 'primary';
    const key       = `bookings/${bookingId}/guests/${guestId}/document-${Date.now()}.webp`;

    const compressed = await sharp(file.buffer)
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const s3Config = req.userInfo?.config?.s3 || req.captureSession?.config?.s3 || {};
    req.uploadedDocumentUrl = await uploadTenantImage(key, compressed, 'image/webp', s3Config);
    return next();
  } catch (err) {
    console.error('[IMAGE] processAndUploadGuestDocument failed:', err);
    return res.status(500).json({ message: 'Failed to process and upload guest document' });
  }
};

export const processAndUploadImage = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const rawName =
      req.body.guestHouseName ||
      (await resolveGuestHouseName(req, req.body.guestHouseId || req.params.guestHouseId));

    const ghSlug    = slugify(rawName);
    const baseName  = slugify(req.file.originalname.replace(/\.[^.]+$/, ''));
    const key       = `super-admin/${ghSlug}/${Date.now()}_${baseName}.webp`;

    const compressed = await sharp(req.file.buffer)
      .resize(1280, 720, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();

    const s3Config = req.userInfo?.config?.s3 || {};
    req.optimizedImageUrl = await uploadTenantImage(key, compressed, 'image/webp', s3Config);
    return next();
  } catch (err) {
    console.error('[IMAGE] processAndUploadImage failed:', err);
    return res.status(500).json({ message: 'Image upload failed' });
  }
};

export const processAndUploadVerificationImage = async (req, res, next) => {
  try {
    const date        = todayUtc();
    const ghName      = await resolveGuestHouseName(req, req.body.guestHouseId);
    const ghSlug      = slugify(ghName);
    const headSlug    = slugify(req.body.fullName || 'GUEST');
    const folderBase  = `admin/${ghSlug}/${date}/${headSlug}`;
    const s3Config    = req.userInfo?.config?.s3 || {};

    const verificationFile = req.files?.verificationImage?.[0];
    req.verificationImageUrl = null;

    if (verificationFile) {
      const compressed = await sharp(verificationFile.buffer)
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      const key = `${folderBase}/${headSlug}_${slugify(req.body.identityType || 'document')}.webp`;
      try {
        req.verificationImageUrl = await uploadTenantImage(key, compressed, 'image/webp', s3Config);
      } catch (err) {
        console.error('[IMAGE] Verification image upload failed:', err);
        return res.status(500).json({ message: 'Verification image upload failed' });
      }
    }

    const familyMemberFiles = req.files?.familyMemberImages || [];
    req.familyMemberImageUrls = {};

    let familyMembersData = [];
    try {
      familyMembersData = req.body.familyMembers
        ? JSON.parse(req.body.familyMembers)
        : [];
    } catch { familyMembersData = []; }

    for (const file of familyMemberFiles) {
      const idxMatch  = file.originalname.match(/^idx_(\d+)_/);
      const fileIndex = idxMatch ? parseInt(idxMatch[1], 10) : familyMemberFiles.indexOf(file);
      const memberName = slugify(familyMembersData[fileIndex]?.name || `member${fileIndex}`);

      const compressed = await sharp(file.buffer)
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      const key = `${folderBase}/members/${memberName}/img.webp`;
      try {
        req.familyMemberImageUrls[fileIndex] = await uploadTenantImage(key, compressed, 'image/webp', s3Config);
      } catch (err) {
        console.error(`[IMAGE] Family member image upload failed (index ${fileIndex}):`, err);
        req.familyMemberImageUrls[fileIndex] = null;
      }
    }

    return next();
  } catch (err) {
    console.error('[S3] processAndUploadVerificationImage failed:', err);
    return res.status(500).json({ message: 'Verification image upload failed' });
  }
};

export const processAndUploadESignature = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const actorEmail = slugify(req.user?.email || req.body.email || 'admin');
    const key = `super-admin/esignatures/${actorEmail}/${Date.now()}_esignature.webp`;

    const compressed = await sharp(req.file.buffer)
      .resize(640, 220, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const s3Config = req.userInfo?.config?.s3 || {};
    req.eSignatureUrl = await uploadTenantImage(key, compressed, 'image/webp', s3Config);
    return next();
  } catch (err) {
    console.error('[IMAGE] processAndUploadESignature failed:', err);
    return res.status(500).json({ message: 'ESignature upload failed' });
  }
};
