/**
 * Service to handle WhatsApp message generation and CRM logic
 */
class WhatsAppService {
  /**
   * Generates a structured WhatsApp message for an order
   */
  generateOrderMessage(order, customer, address, currency = 'DT', verifiedItems = null, convertedTotal = null) {
    let message = `🛒 *NOUVELLE COMMANDE - Saria Beauty*\n\n`;
    message += `👤 *CLIENT:*\n`;
    message += `Nom: ${customer.name}\n`;
    message += `Email: ${customer.email}\n`;
    message += `Téléphone: ${customer.phone}\n\n`;

    message += `📍 *ADRESSE:*\n`;
    message += `${address.address}, ${address.city}${address.postalCode ? `, ${address.postalCode}` : ''}\n`;
    if (address.notes) message += `Notes: ${address.notes}\n`;
    message += `\n`;

    message += `🛍️ *PRODUITS:*\n`;
    if (verifiedItems && verifiedItems.length > 0) {
      verifiedItems.forEach((item) => {
        const name = item.name || 'Produit';
        const imgPath = item.image ? (item.image.startsWith('http') ? item.image : `https://sariabeauty.com/images/${item.image}`) : '';
        const imgString = imgPath ? `\n   🖼️ Image: ${imgPath}` : '';
        message += `- ${name} x${item.quantity} = ${(item.convertedPrice * item.quantity).toFixed(2)} ${currency}${imgString}\n`;
      });
    } else {
      order.items.forEach((item) => {
        const name = item.product?.name || item.name || 'Produit';
        message += `- ${name} x${item.quantity} = ${(item.price * item.quantity).toFixed(2)} ${currency}\n`;
      });
    }
    message += `\n`;

    const finalTotal = convertedTotal !== null ? convertedTotal.toFixed(2) : order.total.toFixed(2);
    message += `💰 *TOTAL: ${finalTotal} ${currency}*\n`;
    message += `🚚 *Livraison: Gratuite*\n\n`;
    message += `📌 Merci de confirmer la réception de cette commande.`;
    return message;
  }

  /**
   * Returns the encoded WhatsApp URL
   */
  generateWhatsAppUrl(message, phone = "21653236163") {
    const cleanPhone = phone.replace(/\+/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }
}

module.exports = new WhatsAppService();
