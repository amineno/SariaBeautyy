/**
 * Service to handle WhatsApp message generation and CRM logic
 */
class WhatsAppService {
  /**
   * Generates a structured WhatsApp message for an order
   */
  generateOrderMessage(order, customer, address) {
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
    order.items.forEach((item) => {
      // Assuming item has product populated or we pass names
      const name = item.product?.name || item.name || 'Produit';
      message += `- ${name} x${item.quantity} = ${(item.price * item.quantity).toFixed(2)} DT\n`;
    });
    message += `\n`;

    const deliveryFee = 7.0;
    message += `💰 *TOTAL: ${order.total.toFixed(2)} DT* (Livraison: ${deliveryFee.toFixed(2)} DT comprise)\n\n`;
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
