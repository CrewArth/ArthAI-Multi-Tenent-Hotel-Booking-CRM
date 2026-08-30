import bcrypt from "bcryptjs";
import crypto from "crypto";
import { generateToken } from "../utils/jwt.js";
import { sendEmail } from "../utils/emailService.js";
import { welcomeEmail } from "../utils/emailTemplates/welcomeEmail.js";
import { passwordResetEmail } from "../utils/emailTemplates/passwordReset.js";
import { logAction } from "../utils/auditLogger.js";
import { getTenantDb, connectMasterDb } from "../config/dbManager.js";
import { getClientIp } from "../utils/ipHelper.js";
import tenantSchema from "../models/centralModels/Tenant.js";
import { invalidateUserSession } from "../middlewares/auth.js";

const getCentralTenantModel = async () => {
  const master = await connectMasterDb();
  return master.models.Tenant || master.model('Tenant', tenantSchema);
};

const resolveTargetDbName = async (req, email) => {
  if (req.body?.dbName) {
    console.log(`[Auth Log] Tenant DB explicitly provided in body: ${req.body.dbName}`);
    return req.body.dbName.trim();
  }
  if (req.body?.tenantSlug) {
    console.log(`[Auth Log] Tenant Slug explicitly provided in body: ${req.body.tenantSlug}`);
    return req.body.tenantSlug.trim();
  }
  if (req.headers['x-tenant-id']) {
    console.log(`[Auth Log] Tenant ID header present: ${req.headers['x-tenant-id']}`);
    return String(req.headers['x-tenant-id']).trim();
  }
  if (req.headers['x-tenant-slug']) {
    console.log(`[Auth Log] Tenant Slug header present: ${req.headers['x-tenant-slug']}`);
    return String(req.headers['x-tenant-slug']).trim();
  }

  if (email) {
    const cleanEmail = email.toLowerCase().trim();
    console.log(`[Auth Log] Attempting central auto-resolution for email: ${cleanEmail}`);
    try {
      const Tenant = await getCentralTenantModel();
      const tenant = await Tenant.findOne({
        $or: [
          { 'credentials.superAdminEmail': cleanEmail },
          { 'credentials.adminEmail': cleanEmail },
          { 'owner.email': cleanEmail },
        ]
      }).lean();

      if (tenant?.dbName) {
        console.log(`[Auth Log] ✅ Auto-resolved tenant '${tenant.tenantId}' -> DB '${tenant.dbName}' via Central Registry`);
        return tenant.dbName;
      }

      console.log(`[Auth Log] Email not found directly in Central Registry credentials. Scanning active tenant databases...`);
      const allTenants = await Tenant.find({ isActive: true }).lean();
      for (const t of allTenants) {
        try {
          const tDb = await getTenantDb(t.dbName);
          const User = tDb.models.User || tDb.model('User');
          const tUser = await User.findOne({ email: cleanEmail }).lean();
          if (tUser) {
            console.log(`[Auth Log] ✅ Discovered user record in active tenant DB '${t.dbName}'`);
            return t.dbName;
          }
        } catch (scanErr) {
          // ignore scan errors
        }
      }
    } catch (err) {
      console.warn('[Auth Log Warning] Central lookup error:', err.message);
    }
  }

  const fallbackDb = process.env.DEFAULT_TENANT_DB || 'guesthouses';
  console.log(`[Auth Log] ⚠️ Falling back to default tenant DB: ${fallbackDb}`);
  return fallbackDb;
};

// Controller for Registering Users
export const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, address, password } = req.body;
    console.log(`[Auth Log] Processing User Registration for email: ${email}`);

    const dbName = await resolveTargetDbName(req, email);
    const tenantDb = await getTenantDb(dbName);
    const User = tenantDb.models.User || tenantDb.model('User');

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        message: "User with this Email Already Exists.",
      });
    }

    const secretKey = crypto.randomBytes(40).toString("hex");

    const newUser = new User({
      firstName,
      lastName,
      email: email.toLowerCase().trim(),
      phone,
      address,
      password,
      login_secret_key: secretKey,
      last_login: new Date(),
    });
    await newUser.save();

    const clientIp = getClientIp(req);
    const token = generateToken(newUser, {
      tenantId: req.body?.tenantSlug || dbName,
      dbName,
      secret_key: secretKey,
      ip_address: clientIp,
    });

    sendEmail({
      to: newUser.email,
      subject: "Welcome to Rishabh Guest House",
      html: welcomeEmail(newUser),
    }).catch((err) => console.error("Email send error:", err));

    logAction({
      action: "USER_REGISTERED",
      entityType: "User",
      entityId: newUser._id,
      performedBy: newUser.email,
      details: {
        name: `${newUser.firstName} ${newUser.lastName}`.trim(),
        email: newUser.email,
        phone: newUser.phone,
      },
    }, tenantDb).catch((err) => console.error("Audit log error:", err));

    return res.status(201).json({
      user: newUser,
      token,
    });
  } catch (error) {
    console.error("[Auth Log Error] Register error:", error);
    return res.status(500).json({
      message: error.message,
    });
  }
};

// Controller for Login User
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    console.log(`\n========================================`);
    console.log(`[Auth Log] Login attempt initiated for email: ${email}`);

    const dbName = await resolveTargetDbName(req, email);
    console.log(`[Auth Log] Connecting to target tenant database: '${dbName}'`);

    const tenantDb = await getTenantDb(dbName);
    const User = tenantDb.models.User || tenantDb.model('User');

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      console.log(`[Auth Log ❌] User '${cleanEmail}' NOT FOUND in database '${dbName}'`);
      console.log(`========================================\n`);
      return res.status(404).json({ message: "User Not Found!" });
    }

    let resolvedTenantDoc = null;
    // Check central Tenant subscription expiry date & active status
    try {
      const Tenant = await getCentralTenantModel();
      const tenantDoc = await Tenant.findOne({ dbName }).lean();
      if (tenantDoc) {
        resolvedTenantDoc = tenantDoc;
        if (tenantDoc.isActive === false) {
          console.log(`[Auth Log ❌] Organization '${tenantDoc.tenantId}' is DEACTIVATED`);
          return res.status(403).json({ message: "Hotel organization is currently deactivated. Please contact support." });
        }
        if (tenantDoc.expiryDate && new Date() > new Date(tenantDoc.expiryDate)) {
          const formattedDate = new Date(tenantDoc.expiryDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
          console.log(`[Auth Log ❌] Organization '${tenantDoc.tenantId}' subscription EXPIRED on ${formattedDate}`);
          return res.status(403).json({ message: `Subscription expired on ${formattedDate}. Please contact administrator to renew your account.` });
        }
      }
    } catch (tenantErr) {
      console.warn('[Auth Log Warning] Central Tenant expiry check failed:', tenantErr.message);
    }

    if (!user.isActive) {
      console.log(`[Auth Log ❌] User '${cleanEmail}' found in '${dbName}' but account isActive is FALSE`);
      console.log(`========================================\n`);
      return res.status(403).json({ message: "User is not Active" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`[Auth Log ❌] Password mismatch for user '${cleanEmail}' in '${dbName}'`);
      console.log(`========================================\n`);
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    const secretKey = crypto.randomBytes(40).toString("hex");
    user.login_secret_key = secretKey;
    user.last_login = new Date();
    await user.save({ validateBeforeSave: false });

    await invalidateUserSession(dbName, user._id);

    const clientIp = getClientIp(req);
    const token = generateToken(user, {
      tenantId: req.body?.tenantSlug || dbName,
      dbName,
      secret_key: secretKey,
      ip_address: clientIp,
    });

    console.log(`[Auth Log ✅] SUCCESS! User '${cleanEmail}' logged into database '${dbName}' (Role: ${user.role})`);
    console.log(`========================================\n`);

    const siteSettings = {
      siteName: resolvedTenantDoc?.config?.siteName || resolvedTenantDoc?.name || 'Arth.AI',
      logoUrl: resolvedTenantDoc?.config?.logoUrl || resolvedTenantDoc?.hotelDetails?.hotelLogo || null,
    };

    return res.status(200).json({ user, token, siteSettings });
  } catch (error) {
    console.error("[Auth Log Error] Login exception:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Controller for Forgot Password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const dbName = await resolveTargetDbName(req, email);
    const tenantDb = await getTenantDb(dbName);
    const User = tenantDb.models.User || tenantDb.model('User');

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(200).json({
        message: "If an account exists, password reset instructions were sent",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 15 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    res.status(200).json({
      message: "If an account exists, password reset instructions were sent",
    });

    sendEmail({
      to: email,
      subject: "Password Reset Instructions",
      html: passwordResetEmail(user, resetLink),
    }).catch(async (emailErr) => {
      console.error("Error sending reset email:", emailErr);
      try {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
      } catch (saveErr) {
        console.error("Error cleaning up reset token:", saveErr);
      }
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ message: "Server error while processing request" });
  }
};

// Controller for Reset Password
export const resetPassword = async (req, res) => {
  try {
    const { token, email, password } = req.body;

    if (!token || !email || !password) {
      return res.status(400).json({ message: "Token, email and password are required" });
    }

    const dbName = await resolveTargetDbName(req, email);
    const tenantDb = await getTenantDb(dbName);
    const User = tenantDb.models.User || tenantDb.model('User');

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ message: "Server error while resetting password" });
  }
};
