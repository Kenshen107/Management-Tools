const express = require('express');
const db = require('../db');
const mailer = require('../mailer');

const router = express.Router();

function loadContext(token) {
  const assignment = db.getAssignmentByToken(token);
  if (!assignment) return null;
  const notice = db.getNotice(assignment.noticeId);
  const employee = db.getEmployee(assignment.employeeId);
  const topics = db.listTopics(assignment.noticeId);
  const confirmations = db.listConfirmationsForAssignment(assignment.id);
  const byTopicId = Object.fromEntries(confirmations.map((c) => [c.topicId, c]));
  return { assignment, notice, employee, topics, byTopicId };
}

router.get('/:token', (req, res) => {
  const ctx = loadContext(req.params.token);
  if (!ctx || !ctx.notice) return res.status(404).render('confirm/invalid');

  db.markOpened(ctx.assignment.id);
  for (const topic of ctx.topics) {
    db.markTopicViewed(ctx.assignment.id, topic.id);
  }
  // Re-fetch so viewedAt timestamps set just above are reflected.
  const confirmations = db.listConfirmationsForAssignment(ctx.assignment.id);
  const byTopicId = Object.fromEntries(confirmations.map((c) => [c.topicId, c]));

  const allDone = ctx.topics.length > 0 && ctx.topics.every((t) => byTopicId[t.id]?.confirmedAt);

  res.render('confirm/notice', {
    notice: ctx.notice,
    employee: ctx.employee,
    topics: ctx.topics,
    byTopicId,
    token: req.params.token,
    allDone,
  });
});

router.post('/:token/topics/:topicId/scrolled', (req, res) => {
  const assignment = db.getAssignmentByToken(req.params.token);
  if (!assignment) return res.status(404).json({ ok: false });
  db.markTopicScrolled(assignment.id, req.params.topicId);
  res.json({ ok: true });
});

router.post('/:token/topics/:topicId/confirm', async (req, res) => {
  const assignment = db.getAssignmentByToken(req.params.token);
  if (!assignment) return res.status(404).send('Not found');

  const topic = db.getTopic(req.params.topicId);
  const confirmation = db.getConfirmation(assignment.id, req.params.topicId);
  if (!topic || !confirmation) return res.status(404).send('Not found');

  const signature = (req.body.signature || '').trim();
  const scrolled = Boolean(confirmation.scrolledAt) || req.body.scrolled === 'true';
  const requiredPhrase = topic.signOffPrompt.trim().toLowerCase();
  const typedPhrase = signature.toLowerCase();

  const errors = [];
  if (!scrolled) errors.push('Please read the full topic (scroll to the bottom) before signing off.');
  if (!signature) errors.push('Please type your confirmation to sign off.');
  else if (typedPhrase !== requiredPhrase) {
    errors.push(`Please type the confirmation exactly as shown: "${topic.signOffPrompt}"`);
  }

  if (errors.length) {
    return res.status(400).json({ ok: false, errors });
  }

  if (!confirmation.scrolledAt) db.markTopicScrolled(assignment.id, req.params.topicId);
  db.confirmTopic(assignment.id, req.params.topicId, signature);

  const refreshed = db.getAssignment(assignment.id);
  if (refreshed.completedAt) {
    const notice = db.getNotice(assignment.noticeId);
    const employee = db.getEmployee(assignment.employeeId);
    mailer.sendCompletionNotice({ notice, employee }).catch(() => {});
  }

  res.json({ ok: true, completedAll: Boolean(refreshed.completedAt) });
});

module.exports = router;
