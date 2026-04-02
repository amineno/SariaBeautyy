const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const { broadcastEvent } = require('../utils/sse');
const OpenAI = require('openai');

const conversationContext = new Map();

const openai =
  process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

const t = (lang, key, vars = {}) => {
  const dict = {
    en: {
      greet: "Hello! Welcome to SariaBeautyy. How can I enhance your glow today?",
      greet_user: "Hello {{name}}! Welcome to SariaBeautyy. How can I enhance your glow today?",
      welcome_back: "Welcome back {{name}}! How can I enhance your glow today?",
      default: "I'm Saria's AI assistant. I can help with product info, recommendations, shipping, or general questions.",
      products: "Explore our luxury skincare and beauty products. Picks: {{list}}",
      products_found: "Here are some products matching '{{query}}': {{list}}",
      products_not_found: "I couldn't find any specific products matching '{{query}}', but here are our top picks: {{list}}",
      shipping: "We offer worldwide shipping. Free over $100. Standard delivery 3–5 business days.",
      returns: "Returns accepted within 30 days for unused items in original packaging.",
      contact: "Contact our customer success team at support@sariabeautyy.com.",
      thanks: "You're welcome! Anything else I can help with?",
      skin_dry: "For dry skin, consider hydrating skincare: {{list}}",
      skin_oily: "For oily skin, consider mattifying skincare: {{list}}",
      navigate: "You can browse Shop, view Cart, or login to track orders.",
      orders_list: "Here are your recent orders:\n{{list}}\n\nWould you like details about any specific order?",
      orders_empty: "I don't see any orders in your account. Would you like to browse our products?",
      login_to_track: "To track your orders, please log in to your account. You can browse products in the meantime.",
      follow_up_products: "Would you like to see more products or get recommendations for a specific skin type?",
      follow_up_orders: "Is there anything specific about your orders you'd like to know?",
      follow_up_skincare: "I can help you find products for dry, oily, or combination skin. What type do you have?",
      payment: "We accept Visa, Mastercard, and Stripe. All transactions are secure.",
      promotions: "Check our homepage for the latest deals! Currently, we offer free shipping on orders over $100.",
      about: "SariaBeautyy is dedicated to premium skincare and beauty products that enhance your natural glow.",
      ingredients: "Our products use high-quality, ethically sourced ingredients. Check specific product pages for full lists.",
      yes: "Great! How can I proceed?",
      no: "Understood. Is there anything else I can help you with?",
    },
    fr: {
      greet: "Bonjour ! Bienvenue chez SariaBeautyy. Comment puis‑je sublimer votre éclat aujourd’hui ?",
      greet_user: "Bonjour {{name}} ! Bienvenue chez SariaBeautyy. Comment puis‑je sublimer votre éclat aujourd’hui ?",
      welcome_back: "Bon retour {{name}} ! Comment puis‑je sublimer votre éclat aujourd’hui ?",
      default: "Je suis l’assistant de Saria. J’aide pour les produits, recommandations, expédition, ou questions.",
      products: "Découvrez nos soins et maquillages de luxe. Choix : {{list}}",
      products_found: "Voici des produits correspondant à '{{query}}' : {{list}}",
      products_not_found: "Je n'ai pas trouvé de produits correspondant à '{{query}}', mais voici nos meilleurs choix : {{list}}",
      shipping: "Livraison mondiale. Gratuite au‑delà de 100 $. Délai standard 3–5 jours ouvrés.",
      returns: "Retours acceptés sous 30 jours pour articles non utilisés dans l’emballage d’origine.",
      contact: "Contactez le support : support@sariabeautyy.com.",
      thanks: "Avec plaisir ! Besoin d’autre chose ?",
      skin_dry: "Pour peau sèche, essayez des soins hydratants : {{list}}",
      skin_oily: "Pour peau grasse, essayez des soins matifiants : {{list}}",
      navigate: "Parcourez la Boutique, consultez le Panier, ou connectez‑vous pour suivre vos commandes.",
      orders_list: "Voici vos commandes récentes :\n{{list}}\n\nSouhaitez-vous des détails sur une commande spécifique ?",
      orders_empty: "Je ne vois aucune commande sur votre compte. Souhaitez-vous parcourir nos produits ?",
      login_to_track: "Pour suivre vos commandes, veuillez vous connecter. Vous pouvez parcourir les produits en attendant.",
      follow_up_products: "Souhaitez-vous voir plus de produits ou obtenir des recommandations pour un type de peau spécifique ?",
      follow_up_orders: "Souhaitez-vous savoir quelque chose de spécifique concernant vos commandes ?",
      follow_up_skincare: "Je peux vous aider à trouver des produits pour peau sèche, grasse ou mixte. Quel est votre type ?",
      payment: "Nous acceptons Visa, Mastercard et Stripe. Toutes les transactions sont sécurisées.",
      promotions: "Consultez notre page d'accueil pour les offres ! Livraison gratuite dès 100 $ d'achat.",
      about: "SariaBeautyy se consacre aux soins et produits de beauté haut de gamme pour sublimer votre éclat naturel.",
      ingredients: "Nos produits utilisent des ingrédients de haute qualité et éthiques. Voir les pages produits pour les détails.",
      yes: "Super ! Comment puis-je continuer ?",
      no: "Compris. Puis-je vous aider pour autre chose ?",
    },
    ar: {
      greet: "مرحباً! أهلاً بك في SariaBeautyy. كيف أساعدك اليوم؟",
      greet_user: "مرحباً {{name}}! أهلاً بك في SariaBeautyy. كيف أساعدك اليوم؟",
      welcome_back: "أهلاً بعودتك {{name}}! كيف أساعدك اليوم؟",
      default: "أنا مساعد سارية. أساعدك في معلومات المنتجات والتوصيات والشحن والأسئلة العامة.",
      products: "استكشف منتجات العناية الفاخرة والتجميل. اقتراحات: {{list}}",
      products_found: "إليك بعض المنتجات المطابقة لـ '{{query}}': {{list}}",
      products_not_found: "لم أجد منتجات تطابق '{{query}}'، لكن إليك أفضل اختياراتنا: {{list}}",
      shipping: "شحن عالمي. مجاني لما يزيد عن 100$. التوصيل خلال 3–5 أيام عمل.",
      returns: "يمكن الإرجاع خلال 30 يوماً للمنتجات غير المستخدمة وبعبوتها الأصلية.",
      contact: "تواصل مع فريق الدعم: support@sariabeautyy.com.",
      thanks: "على الرحب والسعة! هل تحتاج المزيد؟",
      skin_dry: "للبشرة الجافة ننصح بمنتجات ترطيب: {{list}}",
      skin_oily: "للبشرة الدهنية ننصح بمنتجات ماتفة: {{list}}",
      navigate: "تصفح المتجر، شاهد السلة، أو سجّل الدخول لمتابعة الطلبات.",
      orders_list: "إليك طلباتك الأخيرة:\n{{list}}\n\nهل تود معرفة تفاصيل طلب محدد؟",
      orders_empty: "لا أرى أي طلبات في حسابك. هل تود تصفح منتجاتنا؟",
      login_to_track: "لتتبع طلباتك، يرجى تسجيل الدخول. يمكنك تصفح المنتجات في هذه الأثناء.",
      follow_up_products: "هل تود رؤية المزيد من المنتجات أو الحصول على توصيات لنوع بشرة محدد؟",
      follow_up_orders: "هل هناك شيء محدد تود معرفته عن طلباتك؟",
      follow_up_skincare: "يمكنني مساعدتك في العثور على منتجات للبشرة الجافة أو الدهنية أو المختلطة. ما هو نوع بشرتك؟",
      payment: "نقبل فيزا وماستركارد وStripe. جميع المعاملات آمنة.",
      promotions: "تحقق من الصفحة الرئيسية للعروض! شحن مجاني للطلبات فوق 100$.",
      about: "SariaBeautyy مكرسة لمنتجات العناية والجمال الفاخرة لتعزيز جمالك الطبيعي.",
      ingredients: "منتجاتنا تستخدم مكونات عالية الجودة وأخلاقية. راجع صفحات المنتجات للتفاصيل.",
      yes: "رائع! كيف يمكنني المتابعة؟",
      no: "فهمت. هل هناك أي شيء آخر يمكنني مساعدتك به؟",
    }
  };
  const d = dict[lang] || dict.en;
  return (d[key] || dict.en[key]).replace(/{{(\w+)}}/g, (_, k) => vars[k] ?? '');
};

const getChatResponse = async (req, res) => {
  const { message, lang: reqLang, userId, sessionId } = req.body;

  if (!message) {
    return res.status(400).json({ message: 'Message is required' });
  }

  const sessionKey = sessionId || userId || 'anonymous';
  const lowerMsg = message.toLowerCase();
  
  // Improved language detection
  const isArabic = /[\u0600-\u06FF]/.test(message);
  const isFrench = /\b(le|la|les|bonjour|merci|produit|prix|je|tu|vous|nous|pas|est|c'est|ca|ça|comment|pourquoi|salut|au revoir|s'il|plait)\b/i.test(message);
  
  // Prioritize detected language over UI language for better UX
  let lang = reqLang || 'en';
  if (isArabic) lang = 'ar';
  else if (isFrench) lang = 'fr';
  
  // Get or create conversation context
  let context = conversationContext.get(sessionKey) || {
    messages: [],
    userPreferences: {},
    conversationHistory: [],
    lastTopic: null,
    userInfo: null
  };

  // Add current message to context
  context.messages.push({ text: message, sender: 'user', timestamp: new Date() });
  
  let reply = t(lang, 'default');
  let useLLM = false;

  // Enhanced greeting with personalization
  if (lowerMsg.match(/\b(hi|hello|hey|greetings)\b/) || lowerMsg.match(/\b(bonjour|salut)\b/) || lowerMsg.match(/\b(مرحبا|اهلا)\b/)) {
    if (userId && !context.userInfo) {
      try {
        const user = await User.findById(userId).select('name');
        if (user) {
          context.userInfo = { name: user.name };
          reply = t(lang, 'greet_user', { name: user.name });
        } else {
          reply = t(lang, 'greet');
        }
      } catch (error) {
        reply = t(lang, 'greet');
      }
    } else if (context.userInfo) {
      reply = t(lang, 'welcome_back', { name: context.userInfo.name });
    } else {
      reply = t(lang, 'greet');
    }
    context.lastTopic = 'greeting';
  }
  
  // Enhanced product recommendations
  else if (lowerMsg.includes('product') || lowerMsg.includes('price') || lowerMsg.includes('cost') || lowerMsg.includes('produit') || lowerMsg.includes('prix') || lowerMsg.includes('المنتج') || lowerMsg.includes('سعر') || lowerMsg.includes('buy') || lowerMsg.includes('acheter') || lowerMsg.includes('achat') || lowerMsg.includes('شراء') || 
           lowerMsg.includes('cream') || lowerMsg.includes('serum') || lowerMsg.includes('oil') || lowerMsg.includes('mask') || lowerMsg.includes('cleanser') || lowerMsg.includes('toner') || lowerMsg.includes('moisturizer') || lowerMsg.includes('shampoo') || lowerMsg.includes('conditioner') || lowerMsg.includes('lipstick') || lowerMsg.includes('makeup') ||
           lowerMsg.includes('crème') || lowerMsg.includes('sérum') || lowerMsg.includes('huile') || lowerMsg.includes('masque') || lowerMsg.includes('nettoyant') || lowerMsg.includes('shampoing') || lowerMsg.includes('maquillage') || lowerMsg.includes('rouge à lèvres') ||
           lowerMsg.includes('beauty') || lowerMsg.includes('bodycare') || lowerMsg.includes('haircare') || lowerMsg.includes('skincare') || lowerMsg.includes('tools') ||
           lowerMsg.includes('beauté') || lowerMsg.includes('soin') || lowerMsg.includes('cheveux') || lowerMsg.includes('outils')) {
    let prods;
    let query = '';
    let msgKey = 'products';
    
    // Check for specific search terms
    // Remove common stop words and intent keywords to find the actual query
    const searchTerms = lowerMsg.replace(/product|produit|price|prix|cost|buy|acheter|achat|شراء|المنتج|سعر|show|montrez|voir|find|trouver/gi, '').trim();
    
    if (searchTerms.length > 2) {
      query = searchTerms;
      // Search in name or category
      const regex = new RegExp(searchTerms, 'i');
      prods = await Product.find({
        $or: [
          { name: regex },
          { category: regex },
          { 'translations.fr.name': regex },
          { 'translations.ar.name': regex }
        ]
      }).sort({ rating: -1 }).limit(3);
      
      if (prods && prods.length > 0) {
        msgKey = 'products_found';
      } else {
        // If specific search failed, maybe try searching by category if the query matches a known category?
        // For now, fall back to default recommendations but use 'products_not_found' message
        msgKey = 'products_not_found';
      }
    }

    // Smart product recommendations based on user history if no specific search or no results
    if ((!prods || prods.length === 0) && userId) {
      try {
        const userOrders = await Order.find({ user: userId, isPaid: true }).populate('orderItems.product');
        const purchasedCategories = userOrders.flatMap(order => 
          order.orderItems.map(item => item.product.category)
        );
        
        if (purchasedCategories.length > 0) {
          // Recommend products from similar categories
          const categoryCounts = purchasedCategories.reduce((acc, cat) => {
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
          }, {});
          
          const topCategory = Object.entries(categoryCounts).sort(([,a], [,b]) => b - a)[0]?.[0];
          if (topCategory) {
            prods = await Product.find({ category: topCategory }).sort({ rating: -1 }).limit(3);
            if (msgKey !== 'products_not_found') msgKey = 'products'; // Reset key if we found history-based recs
          }
        }
      } catch (error) {
        console.error('Error fetching user preferences:', error);
      }
    }
    
    // Fallback to top-rated products
    if (!prods || prods.length === 0) {
      prods = await Product.find({}).sort({ rating: -1 }).limit(3);
    }
    
    const list = prods.map(p => {
      const name = (lang === 'fr' ? p.translations?.fr?.name : lang === 'ar' ? p.translations?.ar?.name : p.name) || p.name;
      return `${name} ($${p.price})`;
    }).join(', ');
    
    reply = t(lang, msgKey, { list, query });
    context.lastTopic = 'products';
  }
  
  // Enhanced order tracking
  else if (lowerMsg.includes('order') || lowerMsg.includes('commande') || lowerMsg.includes('طلب') || lowerMsg.includes('track') || lowerMsg.includes('status')) {
    if (userId) {
      try {
        const recentOrders = await Order.find({ user: userId }).sort({ createdAt: -1 }).limit(3);
        if (recentOrders.length > 0) {
          const orderList = recentOrders.map(order => 
            `Order #${order._id.toString().slice(-6)} - ${order.isPaid ? 'Paid' : 'Pending'} - ${order.isDelivered ? 'Delivered' : 'In Transit'}`
          ).join('\n');
          reply = t(lang, 'orders_list', { list: orderList });
        } else {
          reply = t(lang, 'orders_empty');
        }
      } catch (error) {
        reply = t(lang, 'navigate');
      }
    } else {
      reply = t(lang, 'login_to_track');
    }
    context.lastTopic = 'orders';
  }
  
  // Existing functionality for other topics
  else if (lowerMsg.includes('shipping') || lowerMsg.includes('delivery') || lowerMsg.includes('livraison') || lowerMsg.includes('expédition') || lowerMsg.includes('شحن') || lowerMsg.includes('تسليم')) {
    reply = t(lang, 'shipping');
    context.lastTopic = 'shipping';
  } else if (lowerMsg.includes('return') || lowerMsg.includes('refund') || lowerMsg.includes('retour') || lowerMsg.includes('remboursement') || lowerMsg.includes('إرجاع') || lowerMsg.includes('استرداد')) {
    reply = t(lang, 'returns');
    context.lastTopic = 'returns';
  } else if (lowerMsg.includes('contact') || lowerMsg.includes('support') || lowerMsg.includes('help') || lowerMsg.includes('contact') || lowerMsg.includes('support') || lowerMsg.includes('مساعدة')) {
    reply = t(lang, 'contact');
    context.lastTopic = 'support';
  } else if (lowerMsg.includes('thank') || lowerMsg.includes('merci') || lowerMsg.includes('شكراً')) {
    reply = t(lang, 'thanks');
    context.lastTopic = 'thanks';
  } else if (lowerMsg.includes('dry') || lowerMsg.includes('sèche') || lowerMsg.includes('جافة')) {
    const prods = await Product.find({ category: /skin/i }).sort({ rating: -1 }).limit(3);
    const list = prods.map(p => {
      const name = (lang === 'fr' ? p.translations?.fr?.name : lang === 'ar' ? p.translations?.ar?.name : p.name) || p.name;
      return `${name}`;
    }).join(', ');
    reply = t(lang, 'skin_dry', { list });
    context.lastTopic = 'skincare';
  } else if (lowerMsg.includes('oily') || lowerMsg.includes('grasse') || lowerMsg.includes('دهنية')) {
    const prods = await Product.find({ category: /skin/i }).sort({ rating: -1 }).limit(3);
    const list = prods.map(p => {
      const name = (lang === 'fr' ? p.translations?.fr?.name : lang === 'ar' ? p.translations?.ar?.name : p.name) || p.name;
      return `${name}`;
    }).join(', ');
    reply = t(lang, 'skin_oily', { list });
    context.lastTopic = 'skincare';
  } else if (lowerMsg.includes('payment') || lowerMsg.includes('paiement') || lowerMsg.includes('carte') || lowerMsg.includes('credit') || lowerMsg.includes('visa') || lowerMsg.includes('دفع') || lowerMsg.includes('بطاقة')) {
    reply = t(lang, 'payment');
    context.lastTopic = 'payment';
  } else if (
    lowerMsg.includes('promo') ||
    lowerMsg.includes('sale') ||
    lowerMsg.includes('deal') ||
    lowerMsg.includes('discount') ||
    lowerMsg.includes('offre') ||
    lowerMsg.includes('réduction') ||
    lowerMsg.includes('solde') ||
    lowerMsg.includes('new arrival') ||
    lowerMsg.includes('new arrivals') ||
    lowerMsg.includes('nouveauté') ||
    lowerMsg.includes('nouveautés') ||
    lowerMsg.includes('عرض') ||
    lowerMsg.includes('خصم') ||
    lowerMsg.includes('جديد')
  ) {
    reply = t(lang, 'promotions');
    context.lastTopic = 'promotions';
  } else if (lowerMsg.includes('about') || lowerMsg.includes('brand') || lowerMsg.includes('saria') || lowerMsg.includes('story') || lowerMsg.includes('propos') || lowerMsg.includes('histoire') || lowerMsg.includes('marque') || lowerMsg.includes('قصة') || lowerMsg.includes('عن')) {
    reply = t(lang, 'about');
    context.lastTopic = 'about';
  } else if (lowerMsg.includes('ingredient') || lowerMsg.includes('composition') || lowerMsg.includes('organic') || lowerMsg.includes('natural') || lowerMsg.includes('ingrédient') || lowerMsg.includes('naturel') || lowerMsg.includes('bio') || lowerMsg.includes('مكونات') || lowerMsg.includes('طبيعي')) {
    reply = t(lang, 'ingredients');
    context.lastTopic = 'ingredients';
  } else if (lowerMsg.includes('navigate') || lowerMsg.includes('shop') || lowerMsg.includes('boutique')) {
    reply = t(lang, 'navigate');
    context.lastTopic = 'navigation';
  } else if (lowerMsg.match(/\b(yes|yeah|sure|ok|okay|oui|d'accord|ouais|نعم|أكيد)\b/)) {
    if (context.lastTopic === 'orders_empty' || context.lastTopic === 'follow_up_products' || context.lastTopic === 'greeting') {
        // Trigger product logic manually
        // We can't easily recurse, so we'll just set a flag or duplicate simple logic
        // For simplicity, let's just show top products
        const prods = await Product.find({}).sort({ rating: -1 }).limit(3);
        const list = prods.map(p => {
            const name = (lang === 'fr' ? p.translations?.fr?.name : lang === 'ar' ? p.translations?.ar?.name : p.name) || p.name;
            return `${name} ($${p.price})`;
        }).join(', ');
        reply = t(lang, 'products', { list });
        context.lastTopic = 'products';
    } else {
        reply = t(lang, 'yes');
    }
  } else if (lowerMsg.match(/\b(no|nope|non|لا|كلا)\b/)) {
    reply = t(lang, 'no');
  } else {
    if (context.lastTopic === 'products') {
      reply = t(lang, 'follow_up_products');
    } else if (context.lastTopic === 'orders') {
      reply = t(lang, 'follow_up_orders');
    } else if (context.lastTopic === 'skincare') {
      reply = t(lang, 'follow_up_skincare');
    } else {
      reply = t(lang, 'default');
      useLLM = true;
    }
  }

  let finalReply = reply;

  if (useLLM && openai) {
    try {
      const languageNames = { en: 'English', fr: 'French', ar: 'Arabic' };
      const languageName = languageNames[lang] || 'English';

      const historyMessages = context.messages.slice(-8).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const completion = await openai.chat.completions.create({
        model: process.env.SARIA_ASSISTANT_MODEL || 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content:
              `You are Saria, an AI beauty shopping assistant for SariaBeautyy.\n` +
              `- Always answer in ${languageName}.\n` +
              `- Be friendly, elegant and concise (2–5 short sentences).\n` +
              `- You can explain skincare, makeup, haircare, bodycare, shipping, returns, and how to use the website.\n` +
              `- Do not invent order or account details; if asked for specific order information, say you cannot see it and suggest the Orders page or contacting support.\n` +
              `- When giving product advice, focus on skin type, concerns and routine steps; keep brand names generic unless provided in the conversation.`
          },
          ...historyMessages,
          {
            role: 'user',
            content: message,
          },
        ],
        temperature: 0.7,
        max_tokens: 320,
      });
      const aiText = completion.choices?.[0]?.message?.content?.trim();
      if (aiText) {
        finalReply = aiText;
      }
    } catch (e) {
      console.error('OpenAI chat error', e.message);
    }
  }

  context.messages.push({ text: finalReply, sender: 'ai', timestamp: new Date() });
  
  if (context.messages.length > 10) {
    context.messages = context.messages.slice(-10);
  }
  
  conversationContext.set(sessionKey, context);

  setTimeout(() => {
    res.json({ 
      response: finalReply, 
      suggestions: getSmartSuggestions(context.lastTopic, lang),
      context: {
        lastTopic: context.lastTopic,
        userInfo: context.userInfo
      }
    });
  }, 500);
};

// Helper function to provide smart suggestions
const getSmartSuggestions = (lastTopic, lang) => {
  const suggestions = {
    en: {
      products: ["Show me bestsellers", "Products for oily skin", "What's on sale?"],
      orders: ["Track my latest order", "When will my order arrive?", "Cancel order"],
      skincare: ["Products for dry skin", "Anti-aging products", "Sunscreen recommendations"],
      greeting: ["What products do you recommend?", "Tell me about shipping", "Show me new arrivals"]
    },
    fr: {
      products: ["Montrez-moi les best-sellers", "Produits pour peau grasse", "Qu'est-ce qui est en promotion ?"],
      orders: ["Suivre ma dernière commande", "Quand ma commande arrivera-t-elle ?", "Annuler une commande"],
      skincare: ["Produits pour peau sèche", "Produits anti-âge", "Recommandations de protection solaire"],
      greeting: ["Quels produits recommandez-vous ?", "Parlez-moi de la livraison", "Montrez-moi les nouveautés"]
    },
    ar: {
      products: ["أظهر لي الأكثر مبيعًا", "منتجات للبشرة الدهنية", "ما العروض المتاحة الآن؟"],
      orders: ["تتبع طلبي الأخير", "متى سيصل طلبي؟", "إلغاء طلب"],
      skincare: ["منتجات للبشرة الجافة", "منتجات لمكافحة الشيخوخة", "توصيات واقي شمس"],
      greeting: ["ما المنتجات التي توصي بها؟", "أخبرني عن الشحن", "أظهر لي أحدث المنتجات"]
    }
  };
  
  return suggestions[lang]?.[lastTopic] || suggestions[lang]?.greeting || suggestions.en.greeting;
};

// Function to send real-time notifications to chat assistant
const sendChatNotification = (message, type = 'notification') => {
  broadcastEvent({
    channel: 'assistant',
    type: type,
    message: message,
    timestamp: new Date()
  });
};

module.exports = { getChatResponse, sendChatNotification };
