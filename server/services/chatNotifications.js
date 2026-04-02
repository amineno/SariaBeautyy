const { sendChatNotification } = require('../controllers/chatController');

// Service to handle real-time chat notifications
class ChatNotificationService {
  
  // Send welcome notification to new users
  static sendWelcomeNotification(userName) {
    const messages = [
      `Welcome ${userName}! I'm Saria, your beauty assistant. How can I help you today?`,
      `Hi ${userName}! 👋 Need help finding the perfect products for your skin?`,
      `Hello ${userName}! I'm here to help with product recommendations, orders, and more.`
    ];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    sendChatNotification(randomMessage, 'welcome');
  }

  // Send order status updates
  static sendOrderUpdate(orderId, status, userName) {
    const statusMessages = {
      'confirmed': `Great news ${userName}! Your order #${orderId} has been confirmed. 🎉`,
      'shipped': `Your order #${orderId} is on its way! Track it in real-time. 📦`,
      'delivered': `Your order #${orderId} has been delivered! Enjoy your products. ✨`,
      'cancelled': `Your order #${orderId} has been cancelled. Contact support if you need help.`
    };
    
    const message = statusMessages[status] || `Update on your order #${orderId}: ${status}`;
    sendChatNotification(message, 'order_update');
  }

  // Send product recommendations based on time/season
  static sendSeasonalRecommendation() {
    const hour = new Date().getHours();
    let message = '';
    
    if (hour >= 6 && hour < 12) {
      message = "Good morning! ☀️ Start your day with our refreshing skincare collection.";
    } else if (hour >= 12 && hour < 18) {
      message = "Good afternoon! 💄 Check out our beauty essentials for a perfect afternoon look.";
    } else if (hour >= 18 && hour < 22) {
      message = "Good evening! 🌙 Time for your nighttime skincare routine.";
    } else {
      message = "Late night beauty shopping? 🌙 Our night creams are perfect for overnight care.";
    }
    
    sendChatNotification(message, 'seasonal');
  }

  // Send stock notifications
  static sendStockNotification(productName, inStock = true) {
    const message = inStock 
      ? `🎉 Great news! ${productName} is back in stock. Grab it before it's gone!`
      : `😔 ${productName} is currently out of stock. I'll notify you when it's available!`;
    
    sendChatNotification(message, 'stock_update');
  }

  // Send promotional notifications
  static sendPromotionNotification(discount, category = 'all') {
    const messages = [
      `🛍️ Flash Sale! Get ${discount}% off ${category === 'all' ? 'everything' : category}. Limited time only!`,
      `💄 Beauty Alert! ${discount}% discount on ${category === 'all' ? 'all products' : category}. Shop now!`,
      `✨ Special offer! Save ${discount}% on ${category === 'all' ? 'your favorite products' : category}. Don't miss out!`
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    sendChatNotification(randomMessage, 'promotion');
  }

  // Send personalized beauty tips
  static sendBeautyTip(userName, skinType = null) {
    const tips = {
      dry: [
        `Tip for ${userName}: Hydrate your skin with our moisturizing serums for a radiant glow.`,
        `Beauty tip: For dry skin, apply moisturizer on damp skin for better absorption.`
      ],
      oily: [
        `Tip for ${userName}: Control shine with our mattifying primers and oil-free moisturizers.`,
        `Beauty tip: Don't skip moisturizer! Even oily skin needs hydration.`
      ],
      combination: [
        `Tip for ${userName}: Use different products for different areas of your face.`,
        `Beauty tip: Multi-masking is perfect for combination skin types!`
      ],
      normal: [
        `Tip for ${userName}: Maintain your skin's balance with our gentle skincare routine.`,
        `Beauty tip: Prevention is key! Start anti-aging early for best results.`
      ]
    };

    let message;
    if (skinType && tips[skinType]) {
      const tipArray = tips[skinType];
      message = tipArray[Math.floor(Math.random() * tipArray.length)];
    } else {
      const allTips = Object.values(tips).flat();
      message = allTips[Math.floor(Math.random() * allTips.length)];
    }
    
    sendChatNotification(message, 'beauty_tip');
  }

  // Send abandoned cart reminder
  static sendCartReminder(userName, itemCount) {
    const messages = [
      `${userName}, you have ${itemCount} items waiting in your cart. Complete your purchase now!`,
      `Don't forget your beauty essentials, ${userName}! Your cart has ${itemCount} items.`,
      `Hey ${userName}! Your ${itemCount} favorite items are still available. Checkout now!`
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    sendChatNotification(randomMessage, 'cart_reminder');
  }
}

// Export both the class and individual functions to avoid circular dependency issues
module.exports = { 
  ChatNotificationService,
  // Also export individual functions for direct use
  sendWelcomeNotification: ChatNotificationService.sendWelcomeNotification,
  sendOrderUpdate: ChatNotificationService.sendOrderUpdate,
  sendSeasonalRecommendation: ChatNotificationService.sendSeasonalRecommendation,
  sendStockNotification: ChatNotificationService.sendStockNotification,
  sendPromotionNotification: ChatNotificationService.sendPromotionNotification,
  sendBeautyTip: ChatNotificationService.sendBeautyTip,
  sendCartReminder: ChatNotificationService.sendCartReminder
};