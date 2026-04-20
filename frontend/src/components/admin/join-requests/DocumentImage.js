// /app/frontend/src/components/admin/join-requests/DocumentImage.js
// مكون عرض صورة الوثيقة

import { Image, ZoomIn } from 'lucide-react';

const DocumentImage = ({ src, label, onClick }) => {
  if (!src) {
    return (
      <div className="flex flex-col items-center p-2 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
        <div className="w-16 h-16 flex items-center justify-center bg-gray-200 rounded-lg">
          <Image size={24} className="text-gray-400" />
        </div>
        <span className="text-xs text-gray-500 mt-1 text-center">{label}</span>
        <span className="text-[10px] text-red-500">غير مرفق</span>
      </div>
    );
  }
  
  return (
    <div 
      className="flex flex-col items-center p-2 bg-green-50 rounded-lg border-2 border-green-200 cursor-pointer hover:border-green-400 transition-all"
      onClick={() => onClick(src, label)}
    >
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-white shadow-sm relative group">
        <img 
          src={src} 
          alt={label}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        <div className="hidden w-full h-full items-center justify-center bg-gray-200">
          <Image size={20} className="text-gray-400" />
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
          <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition-all" />
        </div>
      </div>
      <span className="text-xs text-green-700 mt-1 text-center font-medium">{label}</span>
      <span className="text-[10px] text-green-600">✓ مرفق</span>
    </div>
  );
};

export default DocumentImage;
