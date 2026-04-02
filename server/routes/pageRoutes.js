const express = require('express');
const router = express.Router();
const PageContent = require('../models/PageContent');
const { registerClient, broadcastEvent } = require('../utils/sse');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    SSE endpoint for real-time page content updates
// @route   GET /api/pages/events
// @access  Public
router.get('/events', (req, res) => {
  registerClient(res);
});

// @desc    Get page content
// @route   GET /api/pages/:pageName
// @access  Public
router.get('/:pageName', async (req, res) => {
  try {
    const content = await PageContent.findOne({ page: req.params.pageName });
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
});

// @desc    Update or Create page content (Admin)
// @route   POST /api/pages/:pageName
// @access  Private/Admin
router.post('/:pageName', protect, admin, async (req, res) => {
  try {
    const { title, subtitle, content, sections, mission } = req.body;
    
    let pageContent = await PageContent.findOne({ page: req.params.pageName });

    if (pageContent) {
      pageContent.title = title || pageContent.title;
      pageContent.subtitle = subtitle || pageContent.subtitle;
      pageContent.content = content || pageContent.content;
      pageContent.sections = sections || pageContent.sections;
      pageContent.mission = mission || pageContent.mission;
      
      await pageContent.save();
    } else {
      pageContent = await PageContent.create({
        page: req.params.pageName,
        title,
        subtitle,
        content,
        sections,
        mission
      });
    }

    // Broadcast the update event
    broadcastEvent({ 
      channel: 'page', 
      type: 'page_content_updated', 
      page: req.params.pageName,
      content: pageContent 
    });

    res.json(pageContent);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
});

module.exports = router;
