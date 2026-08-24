import { Queue, Worker } from 'bullmq';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import redisClient, { isRedisReady } from '../config/redis.js';

dotenv.config();

const QUEUE_NAME = 'email-dispatch-queue';

let emailQueue = null;
let emailWorker = null;

const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendDirectEmail = async ({ to, subject, html }) => {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"Rishabh Guest House" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
  console.log(`📧 [Nodemailer] Email sent to ${to}`);
};

try {
  const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
  };

  emailQueue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  });

  emailWorker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { to, subject, html } = job.data;
      await sendDirectEmail({ to, subject, html });
    },
    { connection }
  );

  emailQueue.on('error', (err) => {
    // Suppress unhandled connection error events when Redis is starting or offline
  });

  emailWorker.on('error', (err) => {
    // Suppress unhandled connection error events when Redis is starting or offline
  });

  emailWorker.on('completed', (job) => {
    console.log(`✅ [BullMQ] Email job #${job.id} sent successfully.`);
  });

  emailWorker.on('failed', (job, err) => {
    console.error(`❌ [BullMQ] Email job #${job?.id} failed:`, err.message);
  });
} catch (err) {
  console.error('[BullMQ Setup Failed]:', err.message);
}

export const queueEmail = async ({ to, subject, html }) => {
  if (isRedisReady() && emailQueue) {
    try {
      await emailQueue.add('send-email', { to, subject, html });
      return true;
    } catch {
      // Fallback on error
    }
  }

  // Direct send fallback
  sendDirectEmail({ to, subject, html }).catch((err) =>
    console.error('❌ Direct email fallback failed:', err)
  );
  return false;
};

export default queueEmail;
