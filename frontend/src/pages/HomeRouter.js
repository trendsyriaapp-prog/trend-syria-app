// /app/frontend/src/pages/HomeRouter.js
// موجه الصفحة الرئيسية حسب نوع المستخدم

import { useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import HomePage from './HomePage';
import DeliveryHomePage from './DeliveryHomePage';

const HomeRouter = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  // إذا كان المستخدم يريد التصفح كعميل
  const viewAsCustomer = searchParams.get('view') === 'customer';
  
  // إذا لم يكن مسجل دخول أو يريد التصفح كعميل
  if (!user || viewAsCustomer) {
    return <HomePage />;
  }
  
  // توجيه حسب نوع المستخدم
  switch (user.user_type) {
    case 'delivery':
      // موظف التوصيل المعتمد يُوجّه مباشرة للوحة التحكم الكاملة
      if (user.is_approved) {
        return <Navigate to="/delivery/dashboard" replace />;
      }
      return <HomePage />;
      
    case 'admin':
    case 'sub_admin':
      // الأدمن والمدير التنفيذي يُوجّهون مباشرة لصفحة الأدمن الكاملة
      return <Navigate to="/admin" replace />;
      
    case 'seller':
    case 'food_seller':
      // البائع المعتمد (منتجات أو طعام) يُوجّه مباشرة للوحة التحكم الكاملة
      if (user.is_approved) {
        return <Navigate to="/seller/dashboard" replace />;
      }
      return <HomePage />;
      
    default:
      return <HomePage />;
  }
};

export default HomeRouter;
