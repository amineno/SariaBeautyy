const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { registerClient, broadcastEvent } = require('../utils/sse');
const { protect, admin, protectOptional } = require('../middleware/authMiddleware');
const { sendEmail } = require('../utils/sendEmail');

// @desc    SSE endpoint for real-time contact notifications
// @route   GET /api/contact/events
// @access  Public
router.get('/events', (req, res) => {
  registerClient(res);
});

// @desc    Get logged in user messages
// @route   GET /api/contact/my-messages
// @access  Private
router.get('/my-messages', protect, async (req, res) => {
  try {
    const messages = await Message.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
});

// @desc    Get unread reply count
// @route   GET /api/contact/unread-count
// @access  Private
router.get('/unread-count', protect, async (req, res) => {
  try {
    const count = await Message.countDocuments({ userId: req.user._id, unreadReply: true });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
});

// @desc    Mark all user messages as read
// @route   PUT /api/contact/mark-read
// @access  Private
router.put('/mark-read', protect, async (req, res) => {
  try {
    await Message.updateMany(
      { userId: req.user._id, unreadReply: true },
      { unreadReply: false }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
});

// Reply to a contact message (Admin)
router.put('/:id/reply', protect, admin, async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply || !reply.trim()) {
      return res.status(400).json({ message: 'Reply is required' });
    }
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    msg.adminReply = reply;
    msg.status = 'replied';
    msg.isReplied = true;
    msg.unreadReply = true;
    msg.repliedAt = new Date();
    await msg.save();

    try {
      const subject = msg.subject ? `Re: ${msg.subject}` : 'Support reply';
      const html = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 640px; margin: 0 auto; border: 1px solid #eee; padding: 24px; border-radius: 12px;">
          <h2 style="margin: 0 0 12px; color: #d4a373;">Saria Beauty Support</h2>
          <p style="margin: 0 0 16px;">Hello ${msg.name || ''},</p>
          <p style="margin: 0 0 16px;">We received your message:</p>
          <div style="background: #fafafa; border: 1px solid #eee; padding: 12px; border-radius: 10px; margin: 0 0 16px;">
            <p style="margin: 0 0 8px;"><strong>Subject:</strong> ${msg.subject || ''}</p>
            <p style="margin: 0; white-space: pre-wrap;">${msg.message || ''}</p>
          </div>
          <p style="margin: 0 0 10px;"><strong>Our reply:</strong></p>
          <div style="background: #fff; border: 1px solid #eee; padding: 12px; border-radius: 10px; margin: 0 0 20px;">
            <p style="margin: 0; white-space: pre-wrap;">${reply}</p>
          </div>
          <p style="margin: 0; font-size: 12px; color: #777;">If you have any other questions, just reply to this email.</p>
        </div>
      `;

      await sendEmail({
        email: msg.email,
        subject,
        message: reply,
        html,
      });
    } catch (e) {
      console.error('Failed to send support reply email:', e.message || e);
    }

    broadcastEvent({
      channel: 'contact',
      type: 'message_replied',
      message: msg
    });
    res.json(msg);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
});

// @desc    Send a contact message
// @route   POST /api/contact
// @access  Public
router.post('/', protectOptional, async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'Please fill all fields' });
    }

    const newMessage = await Message.create({
      name,
      email,
      subject,
      message,
      userId: req.user ? req.user._id : undefined
    });

    // Broadcast the new message event
    broadcastEvent({ 
      channel: 'contact', 
      type: 'new_message', 
      message: newMessage 
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: newMessage
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
});

// @desc    Get all messages (for admin)
// @route   GET /api/contact
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const messages = await Message.find({}).sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
});

module.exports = router;
