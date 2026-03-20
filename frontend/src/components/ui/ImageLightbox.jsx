// /app/frontend/src/components/ui/ImageLightbox.jsx
// مكون لعرض الصور بشكل مكبر داخل التطبيق

import { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

const ImageLightbox = ({ src, alt, onClose }) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.5, 0.5));
  const handleRotate = () => setRotation(prev => prev + 90);

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-50 flex flex-col"
      onClick={onClose}
    >
      {/* Header with controls */}
      <div className="flex items-center justify-between p-3 bg-black/50">
        <p className="text-white text-sm font-medium">{alt}</p>
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            <ZoomOut size={20} className="text-white" />
          </button>
          <span className="text-white text-sm min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
          <button 
            onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            <ZoomIn size={20} className="text-white" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleRotate(); }}
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            <RotateCw size={20} className="text-white" />
          </button>
          <button 
            onClick={onClose}
            className="p-2 bg-red-500/80 rounded-lg hover:bg-red-500 transition-colors mr-2"
          >
            <X size={20} className="text-white" />
          </button>
        </div>
      </div>

      {/* Image container */}
      <div 
        className="flex-1 flex items-center justify-center overflow-auto p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img 
          src={src} 
          alt={alt}
          className="max-w-full max-h-full object-contain transition-transform duration-200"
          style={{ 
            transform: `scale(${scale}) rotate(${rotation}deg)`,
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Footer hint */}
      <div className="p-2 bg-black/50 text-center">
        <p className="text-white/60 text-xs">اضغط في أي مكان للإغلاق • استخدم الأزرار للتكبير والتدوير</p>
      </div>
    </div>
  );
};

export default ImageLightbox;
