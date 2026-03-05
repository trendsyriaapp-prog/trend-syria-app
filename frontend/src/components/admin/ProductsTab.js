// /app/frontend/src/components/admin/ProductsTab.js
import { Package } from 'lucide-react';

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const ProductsTab = ({ allProducts }) => {
  return (
    <section>
      {allProducts.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
          <Package size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">لا يوجد منتجات</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {allProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <img 
                src={product.images?.[0] || 'https://via.placeholder.com/150'} 
                alt={product.name}
                className="w-full h-24 object-cover"
              />
              <div className="p-2">
                <h3 className="font-bold text-[11px] text-gray-900 line-clamp-1">{product.name}</h3>
                <p className="text-[#FF6B00] font-bold text-xs">{formatPrice(product.price)}</p>
                <p className="text-[9px] text-gray-400">المخزون: {product.stock}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default ProductsTab;
