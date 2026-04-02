// Social Media Configuration
// Update these URLs with your actual social media profiles

export const socialMediaConfig = {
  instagram: {
    url: 'https://www.instagram.com/saria_beauty?igsh=M21nczg0cDUyaHE3',
    username: '@saria_beauty',
    displayName: 'Instagram'
  },
  tiktok: {
    url: 'https://www.tiktok.com/@sariabeauty',
    username: '@sariabeauty',
    displayName: 'TikTok'
  },
  whatsapp: {
    url: 'https://wa.me/212600000000', // Moroccan WhatsApp format
    phoneNumber: '+212600000000', // Moroccan phone format
    displayName: 'WhatsApp'
  }
};

// Helper function to get social media URL
export const getSocialMediaUrl = (platform) => {
  return socialMediaConfig[platform]?.url || '#';
};

// Helper function to get social media display name
export const getSocialMediaName = (platform) => {
  return socialMediaConfig[platform]?.displayName || platform;
};

export default socialMediaConfig;