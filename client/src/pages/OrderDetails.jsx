import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { DollarSign, Calendar, Package, MapPin, CreditCard, CheckCircle, XCircle, QrCode, Download } from 'lucide-react';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';

const OrderDetails = () => {
  const { id: orderId } = useParams();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  // Image resolution logic
  const productImages = import.meta.glob('/images/*', { as: 'url' });
  const resolveImage = (img) => {
    if (!img) return '';
    const lower = img.toLowerCase();
    if (lower.startsWith('http') || lower.startsWith('data:') || lower.startsWith('/')) return img;
    const key = `/images/${img}`;
    return productImages[key] || `/images/${img}`; // Fallback to direct path
  };

  useEffect(() => {
    if (orderId) {
      const generateQRWithLogo = async () => {
        try {
          const url = `${window.location.origin}/order/${orderId}`;
          
          // 1. Generate QR Code as DataURL
          const qrDataUrl = await QRCode.toDataURL(url, {
            width: 600, // Higher resolution for better logo quality
            margin: 2,
            color: {
              dark: '#000000',
              light: '#ffffff',
            },
            errorCorrectionLevel: 'H' // High error correction to allow for logo overlay
          });

          // 2. Create Canvas to draw QR + Logo
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const qrImage = new Image();
          const logoImage = new Image();

          qrImage.src = qrDataUrl;
          logoImage.src = '/logo.png'; // Path to your logo in public folder

          await Promise.all([
            new Promise(resolve => qrImage.onload = resolve),
            new Promise(resolve => logoImage.onload = resolve)
          ]);

          canvas.width = 600;
          canvas.height = 600;

          // Draw QR Code
          ctx.drawImage(qrImage, 0, 0, 600, 600);

          // Draw Logo in center
          const logoSize = 150; // Size of the logo in the middle
          const x = (600 - logoSize) / 2;
          const y = (600 - logoSize) / 2;

          // Draw white background for logo (excavate)
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.roundRect(x - 5, y - 5, logoSize + 10, logoSize + 10, 10);
          ctx.fill();

          // Draw logo
          ctx.drawImage(logoImage, x, y, logoSize, logoSize);

          setQrCodeUrl(canvas.toDataURL('image/png'));
        } catch (err) {
          console.error('QR generation error:', err);
        }
      };
      generateQRWithLogo();
    }
  }, [orderId]);

  const downloadQR = () => {
    if (!qrCodeUrl) {
      toast.error(t('order.qr_download_error'));
      return;
    }
    const downloadLink = document.createElement('a');
    downloadLink.download = `SariaBeautyy-Order-${orderId}.png`;
    downloadLink.href = qrCodeUrl;
    downloadLink.click();
    toast.success(t('order.qr_download_success'));
  };

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const config = {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        };
        const { data } = await api.get(`/orders/${orderId}`, config);
        setOrder(data);
        setLoading(false);
      } catch (err) {
        setError(err.response && err.response.data.message ? err.response.data.message : err.message);
        setLoading(false);
      }
    };

    if (user) {
      fetchOrder();
    }
  }, [orderId, user]);

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-xl text-primary">{t('order.loading')}</div>;
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-3xl font-serif text-gray-900 mb-4">{t('order.not_found_title')}</h2>
        <p className="text-gray-500 mb-8">{error}</p>
        <Link to="/" className="btn btn-primary">
          {t('order.go_home')}
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 transition-colors duration-300">
      <h1 className="text-4xl font-serif text-gray-900 dark:text-white mb-10 text-center">{t('order.title', { id: order._id })}</h1>

      <div className="max-w-5xl mx-auto card-strong p-8 bg-white dark:bg-gray-800 dark:border-gray-700">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Order Details Column */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2 className="text-2xl font-serif text-gray-800 dark:text-white mb-4 flex items-center"><MapPin className="mr-3" /> {t('order.shipping_title')}</h2>
              <div className="card p-5 dark:bg-gray-800 dark:border-gray-700">
                <p className="text-gray-700 dark:text-gray-300"><strong>{t('order.name_label')}:</strong> {order.user.name}</p>
                <p className="text-gray-700 dark:text-gray-300"><strong>{t('order.email_label')}:</strong> <a href={`mailto:${order.user.email}`} className="text-primary hover:underline">{order.user.email}</a></p>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>{t('order.address_label')}:</strong> {order.shippingAddress.address}, {order.shippingAddress.city},{' '}
                  {order.shippingAddress.postalCode}, {order.shippingAddress.country}
                </p>
                {order.isDelivered ? (
                  <div className="mt-3 text-green-600 dark:text-green-400 flex items-center">
                    <CheckCircle className="mr-2" size={20} /> {t('order.delivered_on', { date: new Date(order.deliveredAt).toLocaleDateString() })}
                  </div>
                ) : (
                  <div className="mt-3 text-red-500 dark:text-red-400 flex items-center">
                    <XCircle className="mr-2" size={20} /> {t('order.not_delivered')}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-serif text-gray-800 dark:text-white mb-4 flex items-center"><CreditCard className="mr-3" /> {t('order.payment_title')}</h2>
              <div className="card p-5 dark:bg-gray-800 dark:border-gray-700">
                <p className="text-gray-700 dark:text-gray-300"><strong>{t('order.method_label')}:</strong> {order.paymentMethod}</p>
                {order.isPaid ? (
                  <div className="mt-3 text-green-600 dark:text-green-400 flex items-center">
                    <CheckCircle className="mr-2" size={20} /> {t('order.paid_on', { date: new Date(order.paidAt).toLocaleDateString() })}
                  </div>
                ) : (
                  <div className="mt-3 text-red-500 dark:text-red-400 flex items-center">
                    <XCircle className="mr-2" size={20} /> {t('order.not_paid')}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-serif text-gray-800 dark:text-white mb-4 flex items-center"><Package className="mr-3" /> {t('order.items_title')}</h2>
              <div className="card p-5 space-y-4 dark:bg-gray-800 dark:border-gray-700">
                {order.orderItems.map((item) => (
                  <div key={item.product} className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4 last:border-b-0 last:pb-0">
                    <div className="flex items-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-md flex items-center justify-center shadow-inner mr-4">
                        <img 
                          src={resolveImage(item.image)} 
                          alt={item.name} 
                          className="w-14 h-14 object-contain transition-all duration-300 hover:scale-105"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <Package className="w-8 h-8 text-gray-400 hidden" />
                      </div>
                      <div>
                        <Link to={`/product/${item.product}`} className="text-lg font-medium text-gray-800 dark:text-white hover:text-primary hover:underline">
                          {item.name}
                        </Link>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">{item.qty} x AED {(item.price * 3.67).toFixed(2)}</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">AED {(item.qty * item.price * 3.67).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary Column */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24 dark:bg-gray-800 dark:border-gray-700">
              <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-white mb-6">{t('order.summary_title')}</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>{t('order.summary_items')}</span>
                  <span>AED {((order.itemsPrice || order.orderItems.reduce((acc, item) => acc + item.price * item.qty, 0)) * 3.67).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>{t('order.summary_shipping')}</span>
                  <span>AED {((order.shippingPrice || 0) * 3.67).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>{t('order.summary_tax')}</span>
                  <span>AED {((order.taxPrice || 0) * 3.67).toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex justify-between font-bold text-lg text-gray-900 dark:text-white">
                  <span>{t('order.summary_total')}</span>
                  <span>AED {((order.totalPrice || 0) * 3.67).toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Status (if not paid) */}
              {!order.isPaid && (
                <div className="mt-6">
                  <button className="btn btn-primary w-full">
                    {t('order.proceed_payment')}
                  </button>
                </div>
              )}

              {/* QR Code Section */}
              <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <QrCode className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-gray-900 dark:text-white">{t('order.ticket_title')}</h3>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6 text-center">
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm inline-block mb-4 border border-gray-100 dark:border-gray-700 min-w-[140px] min-h-[140px]">
                    {qrCodeUrl ? (
                      <img src={qrCodeUrl} alt="Order QR Code" className="w-32 h-32" />
                    ) : (
                      <div className="w-32 h-32 bg-gray-100 dark:bg-gray-700 animate-pulse rounded-lg" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed px-2">
                    {t('order.ticket_scan_hint')}
                  </p>
                  <button 
                    onClick={downloadQR}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    {t('order.ticket_download')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
