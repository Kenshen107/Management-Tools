const express = require('express');
const db = require('../db');
const mailer = require('../mailer');
const config = require('../config');
const { checkPassword, requireAdmin } = require('../auth');
const { secondsBetween, isSuspiciouslyFast } = require('../utils/reading');

const router = express.Router();

router.get('/login', (req, res) => {
  res.render('admin/login', { error: null });
});

router.post('/login', (req, res) => {
  if (checkPassword(req.body.password)) {
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }
  res.render('admin/login', { error: 'Incorrect password.' });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

router.use(requireAdmin);

router.get('/', (req, res) => {
  const notices = db.listNotices().map((notice) => {
    const topics = db.listTopics(notice.id);
    const assignments = db.listAssignmentsForNotice(notice.id);
    const completed = assignments.filter((a) => a.completedAt).length;
    return { notice, topicCount: topics.length, recipientCount: assignments.length, completed };
  });
  res.render('admin/dashboard', { notices });
});

router.get('/notices/new', (req, res) => {
  res.render('admin/notice-new', { error: null });
});

router.post('/notices/new', (req, res) => {
  const { title, description, senderName, senderEmail } = req.body;
  if (!title || !title.trim()) {
    return res.render('admin/notice-new', { error: 'Title is required.' });
  }
  const notice = db.createNotice({ title: title.trim(), description, senderName, senderEmail });
  res.redirect(`/admin/notices/${notice.id}`);
});

function loadNoticeDetail(noticeId) {
  const notice = db.getNotice(noticeId);
  if (!notice) return null;
  const topics = db.listTopics(noticeId);
  const assignments = db.listAssignmentsForNotice(noticeId).map((assignment) => {
    const employee = db.getEmployee(assignment.employeeId);
    const confirmations = db.listConfirmationsForAssignment(assignment.id).map((c) => {
      const topic = db.getTopic(c.topicId);
      const secondsTaken = secondsBetween(c.viewedAt, c.confirmedAt);
      return {
        ...c,
        topicTitle: topic ? topic.title : '(removed topic)',
        secondsTaken,
        suspiciouslyFast: topic ? isSuspiciouslyFast(topic.body, secondsTaken) : false,
      };
    });
    return { assignment, employee, confirmations };
  });
  return { notice, topics, assignments };
}

router.get('/notices/:id', (req, res) => {
  const detail = loadNoticeDetail(req.params.id);
  if (!detail) return res.status(404).send('Notice not found');
  res.render('admin/notice-detail', { ...detail, baseUrl: config.baseUrl, sent: req.query.sent });
});

router.post('/notices/:id/topics', (req, res) => {
  const { title, body, signOffPrompt } = req.body;
  if (title && title.trim() && body && body.trim()) {
    db.addTopic(req.params.id, { title: title.trim(), body: body.trim(), signOffPrompt });
  }
  res.redirect(`/admin/notices/${req.params.id}`);
});

router.post('/notices/:id/topics/:topicId/delete', (req, res) => {
  db.removeTopic(req.params.id, req.params.topicId);
  res.redirect(`/admin/notices/${req.params.id}`);
});

router.post('/notices/:id/recipients', (req, res) => {
  const { recipients } = req.body;
  const noticeId = req.params.id;
  const lines = (recipients || '')
    .split(/\r?\n|,/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    // Accept "Name <email@x.com>", "Name, email@x.com" or a bare email.
    const angleMatch = line.match(/^(.*)<(.+@.+)>$/);
    let name;
    let email;
    if (angleMatch) {
      name = angleMatch[1].trim().replace(/,$/, '');
      email = angleMatch[2].trim();
    } else if (line.includes(',')) {
      const [n, e] = line.split(',').map((s) => s.trim());
      name = n;
      email = e;
    } else {
      email = line;
      name = line.split('@')[0];
    }
    if (!email || !email.includes('@')) continue;
    const employee = db.upsertEmployee({ name: name || email, email });
    db.assignNotice(noticeId, employee.id);
  }
  res.redirect(`/admin/notices/${noticeId}`);
});

router.post('/notices/:id/send', async (req, res) => {
  const noticeId = req.params.id;
  const notice = db.getNotice(noticeId);
  const topics = db.listTopics(noticeId);
  if (!notice || topics.length === 0) {
    return res.redirect(`/admin/notices/${noticeId}`);
  }

  const assignments = db.listAssignmentsForNotice(noticeId);
  const onlyId = req.body.assignmentId; // optional: resend to a single person

  for (const assignment of assignments) {
    if (onlyId && assignment.id !== onlyId) continue;
    if (!onlyId && assignment.sentAt) continue; // don't re-spam everyone on a generic "send"

    const employee = db.getEmployee(assignment.employeeId);
    if (!employee) continue;
    const link = `${config.baseUrl}/confirm/${assignment.token}`;
    try {
      // eslint-disable-next-line no-await-in-loop
      await mailer.sendNoticeEmail({
        to: employee.email,
        employeeName: employee.name,
        notice,
        topics,
        link,
      });
      db.markSent(assignment.id);
    } catch (err) {
      console.error(`Failed to send notice email to ${employee.email}:`, err.message);
    }
  }

  res.redirect(`/admin/notices/${noticeId}?sent=1`);
});

module.exports = router;
