const nodemailer = require('nodemailer');
const config = require('./config');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!config.smtp.host) {
    // No SMTP configured: fall back to logging emails to the console so the
    // tool is still usable (and testable) before mail credentials exist.
    transporter = {
      sendMail: async (opts) => {
        console.log('--- SMTP not configured; email not actually sent ---');
        console.log('To:', opts.to);
        console.log('Subject:', opts.subject);
        console.log('Link(s) embedded in body — see HTML below:');
        console.log(opts.html);
        console.log('----------------------------------------------------');
        return { messageId: 'console-only' };
      },
    };
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
  return transporter;
}

async function sendNoticeEmail({ to, employeeName, notice, topics, link }) {
  const topicList = topics.map((t) => `<li>${escapeHtml(t.title)}</li>`).join('');
  const html = `
    <p>Hi ${escapeHtml(employeeName || '')},</p>
    <p>${escapeHtml(notice.senderName || 'Your manager')} sent you a notice titled
       <strong>${escapeHtml(notice.title)}</strong> that needs your review and sign-off.</p>
    ${notice.description ? `<p>${escapeHtml(notice.description)}</p>` : ''}
    <p>It covers the following topic(s), and each one requires its own separate
       confirmation that you've read it:</p>
    <ul>${topicList}</ul>
    <p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#2563eb;
       color:#fff;text-decoration:none;border-radius:6px;">Open &amp; review notice</a></p>
    <p>If the button doesn't work, copy this link into your browser:<br>${link}</p>
  `;
  const transport = getTransporter();
  return transport.sendMail({
    from: config.mailFrom,
    to,
    subject: `Action needed: please review "${notice.title}"`,
    html,
  });
}

async function sendCompletionNotice({ notice, employee }) {
  if (!config.notifyOnCompleteEmail) return;
  const transport = getTransporter();
  const html = `<p>${escapeHtml(employee.name)} (${escapeHtml(employee.email)}) has
    reviewed and signed off on every topic in "${escapeHtml(notice.title)}".</p>`;
  return transport.sendMail({
    from: config.mailFrom,
    to: config.notifyOnCompleteEmail,
    subject: `${employee.name} completed "${notice.title}"`,
    html,
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { sendNoticeEmail, sendCompletionNotice };
