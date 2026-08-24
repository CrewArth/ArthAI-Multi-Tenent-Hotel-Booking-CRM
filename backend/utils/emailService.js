import { queueEmail } from '../queues/emailQueue.js';

export const sendEmail = async ({ to, subject, html }) => {
  return await queueEmail({ to, subject, html });
};
