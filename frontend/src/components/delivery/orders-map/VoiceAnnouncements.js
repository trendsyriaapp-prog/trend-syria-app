// /app/frontend/src/components/delivery/orders-map/VoiceAnnouncements.js
// التنبيهات الصوتية للسائقين

/**
 * تشغيل التنبيهات الصوتية - محسّن مع قراءة إعدادات المستخدم
 * @param {string} text - النص المراد نطقه
 * @param {Object} options - خيارات إضافية {rate, pitch, volume}
 */
export const speakInstruction = (text, options = {}) => {
  // التحقق من تفعيل الصوت الناطق
  const voiceEnabled = localStorage.getItem('voiceAnnouncementEnabled') !== 'false';
  if (!voiceEnabled) return;
  
  if ('speechSynthesis' in window) {
    // إلغاء أي كلام سابق
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // قراءة الإعدادات المحفوظة من localStorage
    const savedVoiceName = localStorage.getItem('selectedVoiceName');
    const savedVolume = parseFloat(localStorage.getItem('voiceVolume') || '1');
    const savedRate = parseFloat(localStorage.getItem('voiceRate') || '0.9');
    const savedPitch = parseFloat(localStorage.getItem('voicePitch') || '1.1');
    
    // دالة لتطبيق الإعدادات وتشغيل الصوت
    const applySettingsAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      let selectedVoice = null;
      
      // البحث عن الصوت المحدد
      if (savedVoiceName) {
        selectedVoice = voices.find(v => v.name === savedVoiceName);
      }
      
      // إذا لم يوجد الصوت المحدد، استخدم صوت عربي افتراضي
      if (!selectedVoice) {
        selectedVoice = voices.find(v => 
          v.lang.startsWith('ar') && (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Apple'))
        ) || voices.find(v => v.lang.startsWith('ar'));
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      utterance.lang = 'ar-SA';
      // تطبيق الإعدادات - القيم من localStorage مباشرة
      utterance.rate = savedRate;
      utterance.pitch = savedPitch;
      utterance.volume = savedVolume;
      
      // تجاوز بالقيم من options إذا وجدت
      if (options.rate !== undefined) utterance.rate = options.rate;
      if (options.pitch !== undefined) utterance.pitch = options.pitch;
      if (options.volume !== undefined) utterance.volume = options.volume;
      
      window.speechSynthesis.speak(utterance);
    };
    
    // التأكد من تحميل الأصوات قبل التشغيل
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      applySettingsAndSpeak();
    } else {
      // انتظار تحميل الأصوات
      window.speechSynthesis.onvoiceschanged = () => {
        applySettingsAndSpeak();
      };
      // تشغيل بعد تأخير كبديل
      setTimeout(applySettingsAndSpeak, 100);
    }
  }
};

/**
 * إعلان طلب جديد
 * @param {Object} orderDetails - تفاصيل الطلب {storeName, total, distance, isFood}
 */
export const announceNewOrder = (orderDetails = {}) => {
  const { storeName, total, distance, isFood } = orderDetails;
  let message = isFood ? 'طلب طعام جديد!' : 'طلب جديد!';
  
  if (storeName) {
    message += ` من ${storeName}.`;
  }
  if (total) {
    message += ` المبلغ ${total} ليرة.`;
  }
  if (distance) {
    message += ` المسافة ${distance} كيلومتر.`;
  }
  
  speakInstruction(message, { rate: 0.85 });
};

/**
 * إعلان قبول الطلب
 * @param {string|number} orderNumber - رقم الطلب
 */
export const announceOrderAccepted = (orderNumber) => {
  speakInstruction(`تم قبول الطلب رقم ${orderNumber}. توجه للمتجر الآن.`, { rate: 0.85 });
};

/**
 * إعلان بدء الملاحة
 * @param {string} destination - الوجهة
 */
export const announceNavigation = (destination) => {
  speakInstruction(`جاري التوجه إلى ${destination}`, { rate: 0.9 });
};

/**
 * إعلان الوصول
 * @param {string} location - المكان الذي وصل إليه
 */
export const announceArrival = (location) => {
  speakInstruction(`وصلت إلى ${location}. تأكد من استلام الطلب.`, { rate: 0.85 });
};

/**
 * إعلان طلب أولوية
 * @param {string} storeName - اسم المتجر
 */
export const announcePriorityOrder = (storeName) => {
  speakInstruction(`تنبيه! طلب عاجل من ${storeName || 'نفس المتجر'}. اقبله الآن!`, { rate: 0.95, pitch: 1.2 });
};

/**
 * إعلان تعليمات الاتجاهات
 * @param {string} direction - الاتجاه (يمين، يسار، مستقيم)
 * @param {string} streetName - اسم الشارع (اختياري)
 */
export const announceDirection = (direction, streetName = '') => {
  let message = '';
  switch (direction) {
    case 'right':
      message = 'انعطف يميناً';
      break;
    case 'left':
      message = 'انعطف يساراً';
      break;
    case 'straight':
      message = 'تابع مستقيماً';
      break;
    case 'uturn':
      message = 'قم بدوران للخلف';
      break;
    default:
      message = direction;
  }
  if (streetName) {
    message += ` إلى ${streetName}`;
  }
  speakInstruction(message, { rate: 0.9 });
};

/**
 * إعلان المسافة المتبقية
 * @param {number} distance - المسافة بالكيلومتر
 */
export const announceRemainingDistance = (distance) => {
  if (distance < 0.1) {
    speakInstruction('وصلت إلى وجهتك');
  } else if (distance < 0.5) {
    speakInstruction(`متبقي ${Math.round(distance * 1000)} متر`);
  } else {
    speakInstruction(`متبقي ${distance.toFixed(1)} كيلومتر`);
  }
};

/**
 * إيقاف جميع التنبيهات الصوتية
 */
export const stopAllAnnouncements = () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};
