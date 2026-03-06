import { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * زر العودة للأعلى
 * يظهر بعد التمرير لأسفل بمقدار معين ويعيد المستخدم لأعلى الصفحة
 * 
 * مثال الاستخدام:
 * import BackToTopButton from '../components/BackToTopButton';
 * // في أي صفحة:
 * <BackToTopButton />
 */
const BackToTopButton = ({ showAfter = 400 }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > showAfter) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, [showAfter]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={scrollToTop}
          className="fixed bottom-24 left-4 z-40 w-12 h-12 bg-[#FF6B00] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#E65000] hover:scale-110 transition-all duration-200"
          aria-label="العودة للأعلى"
          data-testid="back-to-top-btn"
        >
          <ChevronUp size={24} />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default BackToTopButton;

/**
 * =============================================
 * مثال بصري للزر:
 * =============================================
 * 
 *    ┌─────────────────────────────────────┐
 *    │           صفحة المنتجات             │
 *    │  ┌─────┐  ┌─────┐  ┌─────┐         │
 *    │  │منتج1│  │منتج2│  │منتج3│         │
 *    │  └─────┘  └─────┘  └─────┘         │
 *    │                                     │
 *    │  ┌─────┐  ┌─────┐  ┌─────┐         │
 *    │  │منتج4│  │منتج5│  │منتج6│         │
 *    │  └─────┘  └─────┘  └─────┘         │
 *    │                                     │
 *    │  ┌─────┐  ┌─────┐  ┌─────┐   ┌──┐  │
 *    │  │منتج7│  │منتج8│  │منتج9│   │▲ │  │  ← زر العودة للأعلى
 *    │  └─────┘  └─────┘  └─────┘   └──┘  │    (يظهر بعد التمرير)
 *    │                                     │
 *    │  ═══════════════════════════════   │
 *    │  🏠    ❤️     🛒    📱    👤      │  ← شريط التنقل السفلي
 *    └─────────────────────────────────────┘
 * 
 * =============================================
 * سلوك الزر:
 * =============================================
 * 
 * 1. مخفي في البداية ✗
 * 2. يظهر بعد التمرير 400px للأسفل ✓
 * 3. عند الضغط → تمرير سلس للأعلى
 * 4. موقعه: أسفل يسار الشاشة (فوق شريط التنقل)
 * 5. لون برتقالي (#FF6B00) متوافق مع الثيم
 * 6. حركة ظهور/اختفاء سلسة مع framer-motion
 * 
 */
