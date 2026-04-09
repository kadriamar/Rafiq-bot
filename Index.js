const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'rafiq_verify_2026';

const BRANCHES = [
  { name: 'الأغواط', phone: '0561 75 83 79' },
  { name: 'أفلو', phone: '0561 75 83 80' },
  { name: 'البيض', phone: '0561 75 82 80' },
  { name: 'باتنة', phone: '0555 69 05 77' },
  { name: 'بسكرة', phone: '0561 75 82 38' },
  { name: 'تيزي وزو', phone: '0561 75 82 40' },
  { name: 'بير توتة', phone: '0557 29 80 82' },
  { name: 'بابا حسن', phone: '0665 05 78 22' },
  { name: 'الرغاية', phone: '0561 75 82 31' },
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
  } else if (msg.includes('ساعة') || msg.includes('وقت') || msg.includes('متى')) {
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
    text: '💳 شروط التقسيط في محلات الرفيق:\n\n✅ من 3 إلى 24 شهر\n✅ بدون دفع أولي\n✅ بدون فوائد\n✅ ملف بسيط وسريع\n\nتواصل مع أقرب فرع للمزيد!',
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
    text: '🕐 ساعات العمل:\n\nالأحد - الخميس: 9:00 ص - 7:00 م\nالجمعة: مغلق\nالسبت: 9:00 ص - 5:00 م',
    quick_replies: [
      { content_type: 'text', title: '📍 الفروع', payload: 'BRANCHES' },
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
