// /app/frontend/src/components/admin/join-requests/ImageViewerModal.js
// Modal لعرض الصورة بحجم كامل

import { X } from 'lucide-react';

const ImageViewerModal = ({ image, label, onClose }) => {
  if (!image) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div className="relative max-w-4xl max-h-[90vh] w-full">
        {/* زر الإغلاق */}
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-gray-300 flex items-center gap-2"
        >
          <X size={24} />
          <span>إغلاق</span>
        </button>
        
        {/* عنوان الصورة */}
        <div className="absolute -top-12 left-0 text-white font-bold">
          {label}
        </div>
        
        {/* الصورة */}
        <div 
          className="bg-white rounded-xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <img 
            src={image} 
            alt={label}
            className="w-full h-auto max-h-[85vh] object-contain"
          />
        </div>
      </div>
    </div>
  );
};

export default ImageViewerModal;
