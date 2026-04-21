import nodemailer from 'nodemailer';

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Send invite email to a new customer
 */
export const sendInviteEmail = async ({ to, name, trainerName, gymName, inviteToken }) => {
  const transporter = createTransporter();
  const inviteUrl = `${process.env.CLIENT_URL}/accept-invite?token=${inviteToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Inter, sans-serif; background: #0a0a0f; color: #f8fafc; padding: 40px;">
      <div style="max-width: 600px; margin: 0 auto; background: #111118; border-radius: 16px; padding: 40px; border: 1px solid rgba(139,92,246,0.3);">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="background: linear-gradient(135deg, #7c3aed, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 28px; margin: 0;">GymSaaS</h1>
        </div>
        <h2 style="color: #f8fafc; margin-bottom: 8px;">You've been invited! 💪</h2>
        <p style="color: #94a3b8; line-height: 1.6;">Hi <strong style="color: #f8fafc;">${name}</strong>,</p>
        <p style="color: #94a3b8; line-height: 1.6;">
          <strong style="color: #f8fafc;">${trainerName}</strong> from <strong style="color: #f8fafc;">${gymName}</strong> 
          has invited you to join their fitness program.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${inviteUrl}" 
             style="background: linear-gradient(135deg, #7c3aed, #3b82f6); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
            Accept Invitation
          </a>
        </div>
        <p style="color: #64748b; font-size: 12px; text-align: center;">This link expires in 48 hours. If you didn't expect this, ignore this email.</p>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"GymSaaS" <noreply@gymsaas.com>',
    to,
    subject: `You've been invited to ${gymName} fitness program`,
    html,
  });
};

/**
 * Send meal reminder email
 */
export const sendMealReminderEmail = async ({ to, name, mealType, mealTime }) => {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"GymSaaS" <noreply@gymsaas.com>',
    to,
    subject: `⏰ Meal Reminder: ${mealType} at ${mealTime}`,
    html: `
      <div style="font-family: Inter, sans-serif; background: #0a0a0f; color: #f8fafc; padding: 40px;">
        <div style="max-width: 600px; margin: 0 auto; background: #111118; border-radius: 16px; padding: 32px; border: 1px solid rgba(139,92,246,0.3);">
          <h2>Hi ${name}! 🥗</h2>
          <p style="color: #94a3b8;">It's time for your <strong style="color: #f8fafc;">${mealType}</strong> at <strong style="color: #7c3aed;">${mealTime}</strong>.</p>
          <p style="color: #94a3b8;">Don't forget to log your meal in the app and stay on track with your fitness goals!</p>
        </div>
      </div>
    `,
  });
};
