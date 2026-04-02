import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle, Download, ArrowRight, Share2 } from 'lucide-react';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';

const OrderSuccessScreen = () => {
  const { id } = useParams();
  const [qrCodeUrl, setQrCodeUrl] = React.useState('');

  React.useEffect(() => {
    if (id) {
      const generateQRWithLogo = async () => {
        try {
          const url = `${window.location.origin}/order/${id}`;
          
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
  }, [id]);

  const downloadQR = () => {
    if (!qrCodeUrl) {
      toast.error('Erreur lors du téléchargement');
      return;
    }
    const downloadLink = document.createElement('a');
    downloadLink.download = `SariaBeautyy-Order-${id}.png`;
    downloadLink.href = qrCodeUrl;
    downloadLink.click();
    toast.success('Réception téléchargée !');
  };

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="text-center">
          <h2 className="text-2xl font-serif mb-4 text-gray-900 dark:text-white">Commande introuvable</h2>
          <Link to="/" className="btn btn-primary">Retour à l'accueil</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-16 px-4 transition-colors duration-300">
      <div className="max-w-xl w-full space-y-8 animate-in fade-in zoom-in duration-700">
        <div className="bg-white dark:bg-gray-800 rounded-[32px] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-colors duration-300">
          {/* Header section with Success Icon */}
          <div className="bg-primary/5 dark:bg-primary/10 py-12 text-center relative overflow-hidden transition-colors duration-300">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(183,110,121,0.1),transparent)] dark:bg-[radial-gradient(circle_at_top_right,rgba(183,110,121,0.2),transparent)]" />
            <div className="relative z-10">
              <div className="w-24 h-24 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto shadow-lg mb-6 ring-8 ring-primary/5 dark:ring-primary/10 transition-colors duration-300">
                <CheckCircle className="w-12 h-12 text-green-500 dark:text-green-400" />
              </div>
              <h2 className="text-4xl font-serif text-gray-900 dark:text-white mb-2 transition-colors duration-300">Paiement Confirmé !</h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium uppercase tracking-widest text-sm transition-colors duration-300">Merci pour votre confiance</p>
            </div>
          </div>

          <div className="p-8 md:p-12 space-y-10">
            {/* Order Info & QR Code Section */}
            <div className="flex flex-col md:flex-row items-center gap-10">
              <div className="flex-1 space-y-4 text-center md:text-left">
                <div className="space-y-1">
                  <p className="text-sm text-gray-400 dark:text-gray-500 font-bold uppercase tracking-tighter transition-colors duration-300">Numéro de commande</p>
                  <p className="text-2xl font-mono font-bold text-primary">{id?.slice(-8).toUpperCase()}</p>
                </div>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors duration-300">
                  Votre commande a été validée. Scannez ou téléchargez ce QR code pour accéder rapidement à vos informations de livraison.
                </p>
              </div>

              <div className="relative group">
                <div className="absolute -inset-4 bg-primary/5 dark:bg-primary/10 rounded-[24px] blur-xl opacity-50 group-hover:opacity-100 transition-all duration-300" />
                <div className="relative bg-white dark:bg-gray-200 p-4 rounded-[24px] shadow-sm border border-gray-100 dark:border-gray-600 flex items-center justify-center min-w-[160px] min-h-[160px] transition-colors duration-300">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="Order QR Code" className="w-40 h-40" />
                  ) : (
                    <div className="w-40 h-40 bg-gray-50 dark:bg-gray-300 animate-pulse rounded-lg transition-colors duration-300" />
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={downloadQR}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-gray-900 dark:bg-gray-700 text-white rounded-2xl font-bold hover:bg-black dark:hover:bg-gray-600 transition-all active:scale-95 shadow-lg shadow-gray-200 dark:shadow-gray-900/50"
              >
                <Download className="w-5 h-5" />
                Télécharger le QR
              </button>
              
              <Link
                to={`/order/${id}`}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition-all active:scale-95 shadow-lg shadow-primary/20"
              >
                Voir la commande
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            <div className="pt-8 border-t border-gray-100 dark:border-gray-700 text-center transition-colors duration-300">
              <Link to="/" className="text-gray-400 dark:text-gray-500 hover:text-primary dark:hover:text-primary font-bold text-sm uppercase tracking-widest transition-colors">
                Retourner à la boutique
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccessScreen;
