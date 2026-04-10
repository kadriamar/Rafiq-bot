const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'rafiq_verify_2026';

const BRANCHES = [
  { name: 'الأغواط', phone: '\u202A0561 75 83 79\u202C' },
  { name: 'أفلو', phone: '\u202A0561 75 83 80\u202C' },
  { name: 'البيض', phone: '\u202A0561 75 82 80\u202C' },
  { name: 'باتنة', phone: '\u202A0555 69 05 77\u202C' },
  { name: 'بسكرة', phone: '\u202A0561 75 82 38\u202C' },
  { name: 'تيزي وزو', phone: '\u202A0561 75 82 40\u202C' },
  { name: 'بير توتة', phone: '\u202A0557 29 80 82\u202C' },
  { name: 'بابا حسن', phone: '\u202A0665 05 78 22\u202C' },
  { name: 'الرغاية', phone: '\u202A0561 75 82 31\u202C' },
];

// ====== Webhook Verification ======
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified!');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ====== Receive Messages ======
app.post('/webhook', (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    body.entry.forEach(entry => {
      const event = entry.messaging[0];
      const senderId = event.sender.id;

      if (event.message && event.message.text) {
        handleMessage(senderId, event.message.text);
      } else if (event.postback) {
        handlePostback(senderId, event.postback.payload);
      }
    });
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// ====== Handle Text Messages ======
function handleMessage(senderId, text) {
  const msg = text.toLowerCase();

  if (msg.includes('مرحبا') || msg.includes('سلام') || msg.includes('هلا') || msg.includes('اهلا')) {
    sendWelcome(senderId);
  } else if (msg.includes('فرع') || msg.includes('عنوان') || msg.includes('فروع')) {
    sendBranches(senderId);
  } else if (msg.includes('تقسيط') || msg.includes('قسط') || msg.includes('دفع')) {
    sendInstallment(senderId);
  } else if (msg.includes('منتج') || msg.includes('جهاز') || msg.includes('بيع')) {
    sendProducts(senderId);
  } else if (msg.includes('ساعة') || msg.includes('ساعات') || msg.includes('وقت') || msg.includes('متى')) {
    sendHours(senderId);
  } else {
    sendDefault(senderId);
  }
}

// ====== Handle Postbacks (Quick Replies) ======
function handlePostback(senderId, payload) {
  switch (payload) {
    case 'BRANCHES': sendBranches(senderId); break;
    case 'INSTALLMENT': sendInstallment(senderId); break;
    case 'PRODUCTS': sendProducts(senderId); break;
    case 'HOURS': sendHours(senderId); break;
    case 'GET_STARTED': sendWelcome(senderId); break;
    default: sendDefault(senderId);
  }
}

// ====== Message Functions ======
function sendWelcome(senderId) {
  sendMessage(senderId, {
    text: 'أهلاً وسهلاً! 😊\nمرحباً بك في محلات الرفيق\nكيف يمكنني مساعدتك؟',
    quick_replies: [
      { content_type: 'text', title: '📍 الفروع', payload: 'BRANCHES' },
      { content_type: 'text', title: '💳 التقسيط', payload: 'INSTALLMENT' },
      { content_type: 'text', title: '📦 المنتجات', payload: 'PRODUCTS' },
      { content_type: 'text', title: '🕐 ساعات العمل', payload: 'HOURS' },
    ]
  });
}

function sendBranches(senderId) {
  let text = '📍 فروع محلات الرفيق:\n\n';
  BRANCHES.forEach(b => {
    text += `• ${b.name}: ${b.phone}\n`;
  });
  text += '\n✅ WhatsApp متاح على جميع الأرقام';
  sendMessage(senderId, {
    text,
    quick_replies: [
      { content_type: 'text', title: '💳 التقسيط', payload: 'INSTALLMENT' },
      { content_type: 'text', title: '📦 المنتجات', payload: 'PRODUCTS' },
    ]
  });
}

function sendInstallment(senderId) {
  sendMessage(senderId, {
    text: '💳 شروط التقسيط في محلات الرفيق:\n\n✅ من 3 إلى 24 شهر\n✅ بدون دفع أولي\n✅ إجراءات بسيطة وسريعة\n\n🔵 الوثائق المطلوبة:\n1. 📄 بطاقة التعريف الوطنية\n2. 💼 آخر 3 كشوف راتب\n3. 🏦 شهادة ميلاد\n4. 📑 شهادة إقامة\n5. 📄 كشف حساب بريدي CCP\n\nنتمنى لك تجربة تسوق ممتازة مع محلات الرفيق 🌟',
    quick_replies: [
      { content_type: 'text', title: '📍 الفروع', payload: 'BRANCHES' },
      { content_type: 'text', title: '📦 المنتجات', payload: 'PRODUCTS' },
    ]
  });
}

function sendProducts(senderId) {
  sendMessage(senderId, {
    text: '📦 منتجاتنا:\n\n🖥️ أجهزة الإلكترونيك\n🧺 الغسالات والمجففات\n❄️ الثلاجات والمكيفات\n📱 الهواتف الذكية\n🍳 أجهزة الطبخ\n📺 التلفزيونات\n\nكل هذا بالتقسيط المريح! 🎉',
    quick_replies: [
      { content_type: 'text', title: '💳 التقسيط', payload: 'INSTALLMENT' },
      { content_type: 'text', title: '📍 الفروع', payload: 'BRANCHES' },
    ]
  });
}

function sendHours(senderId) {
  sendMessage(senderId, {
    text: '🕐 ساعات العمل:\n\nالسبت - الخميس:\n• 8:30 ص - 12:30 م\n• 14:30 - 18:30 م\n\n❌ الجمعة: مغلق',
    quick_replies: [
      { content_type: 'text', title: '📍 الفروع', payload: 'BRANCHES' },
      { content_type: 'text', title: '💳 التقسيط', payload: 'INSTALLMENT' },
    ]
  });
}

function sendDefault(senderId) {
  sendMessage(senderId, {
    text: 'شكراً على تواصلك مع محلات الرفيق 🙏\n\nاختر من الخيارات:',
    quick_replies: [
      { content_type: 'text', title: '📍 الفروع', payload: 'BRANCHES' },
      { content_type: 'text', title: '💳 التقسيط', payload: 'INSTALLMENT' },
      { content_type: 'text', title: '📦 المنتجات', payload: 'PRODUCTS' },
      { content_type: 'text', title: '🕐 ساعات العمل', payload: 'HOURS' },
    ]
  });
}

// ====== Send API Call ======
async function sendMessage(senderId, message) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: senderId },
        message: message
      }
    );
  } catch (err) {
    console.error('Error sending message:', err.response?.data || err.message);
  }
}

// ====== Start Server ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Rafiq Bot running on port ${PORT}`);
});

// ====== Keep Alive (prevent Render sleep) ======
const https = require('https');
setInterval(() => {
  https.get('https://rafiq-bot.onrender.com/webhook', (res) => {
    console.log(`Keep-alive ping: ${res.statusCode}`);
  }).on('error', (err) => {
    console.log('Keep-alive error:', err.message);
  });
}, 14 * 60 * 1000);
