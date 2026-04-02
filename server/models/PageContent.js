const mongoose = require('mongoose');

const pageContentSchema = new mongoose.Schema({
  page: {
    type: String,
    required: true,
    unique: true // 'about', 'terms', etc.
  },
  title: String,
  subtitle: String,
  content: String,
  sections: [{
    title: String,
    content: String,
    icon: String
  }],
  mission: {
    title: String,
    content: String,
    imageUrl: String
  }
}, {
  timestamps: true
});

const PageContent = mongoose.model('PageContent', pageContentSchema);

module.exports = PageContent;
