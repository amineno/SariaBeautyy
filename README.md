# SariaBeautyy 🌟

**SariaBeautyy** is a premium, full-stack e-commerce platform dedicated to luxury skincare and beauty products. Designed with a modern aesthetic and high-performance features, it offers a seamless shopping experience across multiple languages and currencies.

---

## 🚀 Live Demo
[https://saria-beauty.vercel.app](https://saria-beauty.vercel.app)

---

## ✨ Key Features

### 🛍️ E-Commerce Excellence
- **Product Discovery:** Browse a curated collection of beauty products with detailed descriptions, high-quality images, and customer reviews.
- **Smart Shopping Cart:** Manage items easily with real-time updates and persistence.
- **Secure Checkout:** Integrated with **Stripe** for safe and encrypted payment processing.
- **Wishlist:** Save your favorite products for later.

### 🤖 Saria AI Assistant
- **Multilingual Support:** An advanced AI persona ("Saria") that communicates in **English**, **French**, and **Arabic**.
- **Expert Advice:** Provides skincare recommendations based on skin type (Dry, Oily, Combination).
- **Real-time Help:** Answers questions about shipping, returns, payment methods, and order tracking.
- **Database Integration:** Fetches real-time product data to provide accurate suggestions.

### 🌍 Localization & Customization
- **Multi-Language:** Toggle between English, French, and Arabic seamlessly.
- **Multi-Currency:** Support for various currencies to cater to a global audience.
- **Dark/Light Mode:** Adaptive theme support for a comfortable viewing experience.

### 🛡️ Admin & Security
- **Admin Dashboard:** Comprehensive control panel to manage products, users, reviews, and site content.
- **Authentication:** Secure login using **JWT** and **Google OAuth**.
- **Rate Limiting & Security:** Protected by **Helmet**, **CORS** policies, and **Express Rate Limit**.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 19 (Vite)
- **Styling:** Tailwind CSS 4, Framer Motion (Animations)
- **Icons:** Lucide React
- **State Management:** React Context API (Auth, Cart, Currency, Theme)
- **Internationalization:** i18next

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose)
- **AI:** OpenAI API
- **Payments:** Stripe API
- **Real-time:** Socket.io & SSE (Server-Sent Events)

---

## 📂 Project Structure

```text
SariaBeautyy/
├── client/                # React Frontend (Vite)
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── context/       # State management (Auth, Cart, etc.)
│   │   ├── pages/         # Application screens
│   │   └── i18n.js        # Internationalization config
├── server/                # Node.js Backend
│   ├── controllers/       # Business logic
│   ├── models/            # Database schemas
│   ├── routes/            # API endpoints
│   └── index.js           # Server entry point
└── vercel.json            # Deployment configuration
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas account or local MongoDB
- OpenAI API Key
- Stripe Account (for payments)
- Google Cloud Console Project (for Google Auth)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/SariaBeautyy.git
cd SariaBeautyy
```

### 2. Backend Setup
```bash
cd server
npm install
```
Create a `.env` file in the `server` directory:
```env
PORT=5000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=your_openai_key
STRIPE_SECRET_KEY=your_stripe_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
CORS_ORIGIN=http://localhost:5173
```
Run the server:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd ../client
npm install
```
Create a `.env` file in the `client` directory:
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```
Run the client:
```bash
npm run dev
```

---

## 📜 License
This project is licensed under the MIT License.

---

## 🤝 Contact
Developed with ❤️ by [Amine Nouioui].
For support, contact: [(aminenouioui18@icloud.com)]
