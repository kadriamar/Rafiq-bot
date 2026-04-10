const express = require('express');
const axios = require('axios');
const https = require('https');
const app = express();

app.use(express.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'rafiq_verify_2026';
const WHATSAPP_NUMBER = '213561758379';

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

const sessions = {};

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', (req, res) => {
  const body = req.body;
  if (body.object === 'page') {
    body.entry.forEach(entry => {
      const event = entry.messaging[0];
      const senderId = event.sender.id;
      if (event.message) {
        if (event.message.attachments) {
          handleAttachment(senderId, event.message.attachments[0]);
        } else if (event.message.text) {
          handleMessage(senderId, event.message.text);
        }
      } else if (event.postback) {
        handlePostback(senderId, event.postback.payload);
      }
    });
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

function handleMessage(senderId, text) {
  const msg = text.toLowerCase();
  if (sessions[senderId]) {
    handleOrderSession(senderId, text);
    return;
  }
  if (msg.includes('مرحبا') || msg.includes('سلام') || msg.includes('هلا') || msg.includes('اهلا')) {
    sendWelcome(senderId);
  } else if (msg.includes('فرع') || msg.includes('عنوان') || msg.includes('فروع')) {
    sendBranches(senderId);
  } else if (msg.includes('طلب') || msg.includes('اشتري') || msg.includes('دراسة') || msg.includes('ملفك') || msg.includes('ملف')) {
    startOrder(senderId);
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

function handleAttachment(senderId, attachment) {
  if (sessions[senderId] && sessions[senderId].step === 'photo') {
    sessions[senderId].photo = attachment.payload.url;
    sessions[senderId].step = 'done';
    finishOrder(senderId);
  } else {
    sendMessage(senderId, {
      text: 'شكراً على الصورة! هل تريد تقديم طلب تقسيط؟',
      quick_replies: [
        { content_type: 'text', title: 'نعم', payload: 'START_ORDER' },
        { content_type: 'text', title: 'القائمة الرئيسية', payload: 'GET_STARTED' },
      ]
    });
  }
}

function handlePostback(senderId, payload) {
  switch (payload) {
    case 'BRANCHES': sendBranches(senderId); break;
    case 'INSTALLMENT': sendInstallment(senderId); break;
    case 'PRODUCTS': sendProducts(senderId); break;
    case 'HOURS': sendHours(senderId); break;
    case 'START_ORDER': startOrder(senderId); break;
    case 'GET_STARTED': sendWelcome(senderId); break;
    default: sendDefault(senderId);
  }
}

function startOrder(senderId) {
  sessions[senderId] = { step: 'name' };
  sendMessage(senderId, { text: 'دراسة ملفك للتقسيط\n\nسنحتاج بعض المعلومات منك.\n\nما هو اسمك الكامل؟' });
}

function handleOrderSession(senderId, text) {
  const session = sessions[senderId];
  switch (session.step) {
    case 'name':
      session.name = text;
      session.step = 'phone';
      sendMessage(senderId, { text: 'ما هو رقم هاتفك؟' });
      break;
    case 'phone':
      session.phone = text;
      session.step = 'product';
      sendMessage(senderId, { text: 'ما هو المنتج الذي تريده؟' });
      break;
    case 'product':
      session.product = text;
      session.step = 'branch';
      sendMessage(senderId, {
        text: 'أي فرع تفضل؟',
        quick_replies: BRANCHES.map(b => ({
          content_type: 'text',
          title: b.name,
          payload: 'BRANCH_SELECT'
        })).slice(0, 9)
      });
      break;
    case 'branch':
      session.branch = text;
      session.step = 'photo';
      sendMessage(senderId, { text: 'أرسل لنا صورة كشف حساب CCP\n(يمكنك إرسال أكثر من صورة - اكتب "تخطي" للمتابعة بدون صورة)' });
      break;
    case 'photo':
      session.photo = null;
      session.step = 'done';
      finishOrder(senderId);
      break;
  }
}

async function finishOrder(senderId) {
  const s = sessions[senderId];
  sendMessage(senderId, {
    text: `تم استلام ملفك!\n\nالاسم: ${s.name}\nالهاتف: ${s.phone}\nالمنتج: ${s.product}\nالفرع: ${s.branch}\n\nسيتم دراسة ملفك والتواصل معك قريباً 🌟`,
    quick_replies: [
      { content_type: 'text', title: 'القائمة الرئيسية', payload: 'GET_STARTED' },
    ]
  });

  const waMsg = `📋 ملف تقسيط جديد!\nالاسم: ${s.name}\nالهاتف: ${s.phone}\nالمنتج: ${s.product}\nالفرع: ${s.branch}${s.photo ? '\nصورة CCP: ' + s.photo : ''}`;
  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMsg)}`;
  console.log('WhatsApp URL:', waUrl);

  delete sessions[senderId];
}

function sendWelcome(senderId) {
  sendMessage(senderId, {
    text: 'مرحباً بك في محلات الرفيق!\n\nمن 3 إلى 24 شهر | بدون دفع أولي\n\nكيف يمكنني مساعدتك؟',
    quick_replies: [
      { content_type: 'text', title: 'دراسة ملفك', payload: 'START_ORDER' },
      { content_type: 'text', title: 'الفروع', payload: 'BRANCHES' },
      { content_type: 'text', title: 'شروط التقسيط', payload: 'INSTALLMENT' },
      { content_type: 'text', title: 'المنتجات', payload: 'PRODUCTS' },
    ]
  });
}

function sendBranches(senderId) {
  let text = 'فروع محلات الرفيق:\n\n';
  BRANCHES.forEach(b => { text += `${b.name}: ${b.phone}\n`; });
  text += '\nWhatsApp متاح على جميع الأرقام';
  sendMessage(senderId, {
    text,
    quick_replies: [
      { content_type: 'text', title: 'دراسة ملفك', payload: 'START_ORDER' },
      { content_type: 'text', title: 'شروط التقسيط', payload: 'INSTALLMENT' },
    ]
  });
}

function sendInstallment(senderId) {
  sendMessage(senderId, {
    text: 'شروط التقسيط:\n\nمن 3 إلى 24 شهر\nبدون دفع أولي\nإجراءات بسيطة وسريعة\n\nالوثائق المطلوبة:\n1. بطاقة التعريف الوطنية\n2. آخر 3 كشوف راتب\n3. شهادة ميلاد\n4. شهادة إقامة\n5. كشف حساب بريدي CCP',
    quick_replies: [
      { content_type: 'text', title: 'دراسة ملفك', payload: 'START_ORDER' },
      { content_type: 'text', title: 'الفروع', payload: 'BRANCHES' },
    ]
  });
}

function sendProducts(senderId) {
  sendMessage(senderId, {
    text: 'منتجاتنا:\n\nأجهزة الإلكترونيك\nالغسالات والمجففات\nالثلاجات والمكيفات\nالهواتف الذكية\nأجهزة الطبخ\nالتلفزيونات\n\nكل هذا بالتقسيط المريح!',
    quick_replies: [
      { content_type: 'text', title: 'دراسة ملفك', payload: 'START_ORDER' },
      { content_type: 'text', title: 'الفروع', payload: 'BRANCHES' },
    ]
  });
}

function sendHours(senderId) {
  sendMessage(senderId, {
    text: 'ساعات العمل:\n\nالسبت - الخميس:\n8:30 - 12:30\n14:30 - 18:30\n\nالجمعة: مغلق',
    quick_replies: [
      { content_type: 'text', title: 'دراسة ملفك', payload: 'START_ORDER' },
      { content_type: 'text', title: 'الفروع', payload: 'BRANCHES' },
    ]
  });
}

function sendDefault(senderId) {
  sendMessage(senderId, {
    text: 'شكراً على تواصلك مع محلات الرفيق\n\nاختر من الخيارات:',
    quick_replies: [
      { content_type: 'text', title: 'دراسة ملفك', payload: 'START_ORDER' },
      { content_type: 'text', title: 'الفروع', payload: 'BRANCHES' },
      { content_type: 'text', title: 'شروط التقسيط', payload: 'INSTALLMENT' },
      { content_type: 'text', title: 'المنتجات', payload: 'PRODUCTS' },
    ]
  });
}

async function sendMessage(senderId, message) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      { recipient: { id: senderId }, message }
    );
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

setInterval(() => {
  https.get('https://rafiq-bot.onrender.com/webhook', () => {}).on('error', () => {});
}, 14 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rafiq Bot running on port ${PORT}`));
