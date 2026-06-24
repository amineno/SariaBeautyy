const ORDER_STATUS = {
  PENDING: 'pending',
  PENDING_WHATSAPP: 'pending_whatsapp',
  CONFIRMED: 'confirmed',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

const PAYMENT_METHOD = {
  STRIPE: 'stripe',
  WHATSAPP: 'whatsapp'
};

const ROLES = {
  ADMIN: 'admin',
  USER: 'user'
};

module.exports = {
  ORDER_STATUS,
  PAYMENT_METHOD,
  ROLES
};
