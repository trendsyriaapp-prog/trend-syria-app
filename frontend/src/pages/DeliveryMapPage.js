import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import OrdersMap from '../components/delivery/OrdersMap';
import { useAuth } from '../context/AuthContext';
import '../styles/driver-dark-theme.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DeliveryMapPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [foodOrders, setFoodOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [myFoodOrders, setMyFoodOrders] = useState([]);
  const [docStatus, setDocStatus] = useState(null);
  const [shouldRedirect, setShouldRedirect] = useState(null);

  // التحقق من صلاحيات المستخدم
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        setShouldRedirect('/login');
      } else if (user.role !== 'delivery') {
        setShouldRedirect('/');
      }
    }
  }, [user, authLoading]);

  // التنفيذ الفعلي للتحويل
  useEffect(() => {
    if (shouldRedirect) {
      navigate(shouldRedirect);
    }
  }, [shouldRedirect, navigate]);

  // جلب البيانات
  useEffect(() => {
    if (!user || user.role !== 'delivery') return;
    
    const fetchData = async () => {
      try {
        // التحقق من حالة الوثائق أولاً
        const statusRes = await axios.get(`${API}/delivery/documents/status`);
        setDocStatus(statusRes.data.status);
        
        if (statusRes.data.status !== 'approved') {
          setLoading(false);
          return;
        }

        // جلب جميع الطلبات
        const [availableRes, myRes, availableFoodRes, myFoodRes] = await Promise.all([
          axios.get(`${API}/delivery/available-orders`),
          axios.get(`${API}/delivery/my-orders`),
          axios.get(`${API}/food/orders/delivery/available`).catch(() => ({ data: { single_orders: [], batch_orders: [] } })),
          axios.get(`${API}/delivery/my-food-orders`).catch(() => ({ data: [] }))
        ]);
        
        setOrders(availableRes.data);
        setMyOrders(myRes.data);
        
        // معالجة طلبات الطعام
        const foodData = availableFoodRes.data || {};
        const singleOrders = foodData.single_orders || [];
        const batchOrders = (foodData.batch_orders || []).flatMap(batch => 
          batch.orders.map(order => ({ ...order, is_batch: true, batch_info: batch }))
        );
        setFoodOrders([...singleOrders, ...batchOrders]);
        
        setMyFoodOrders(myFoodRes.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        // إذا كان الخطأ 401، إعادة التوجيه للدخول
        if (error.response?.status === 401) {
          setShouldRedirect('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // تحديث كل 30 ثانية
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // إعادة التوجيه لصفحة الوثائق إذا لزم
  useEffect(() => {
    if (!loading && docStatus && docStatus !== 'approved') {
      setShouldRedirect('/delivery/documents');
    }
  }, [loading, docStatus]);

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  // قبول طلب طعام
  const handleTakeFoodOrder = async (order) => {
    try {
      // التحقق من نوع الطلب (عادي أم تجميعي)
      if (order.is_batch && order.batch_info?.batch_id) {
        // قبول جميع طلبات الدفعة
        await axios.post(`${API}/food/orders/delivery/batch/${order.batch_info.batch_id}/accept`);
      } else {
        // طلب عادي
        await axios.post(`${API}/food/orders/delivery/${order.id}/accept`);
      }
      // إعادة جلب البيانات
      const [availableFoodRes, myFoodRes] = await Promise.all([
        axios.get(`${API}/food/orders/delivery/available`).catch(() => ({ data: { single_orders: [], batch_orders: [] } })),
        axios.get(`${API}/delivery/my-food-orders`).catch(() => ({ data: [] }))
      ]);
      const foodData = availableFoodRes.data || {};
      const singleOrders = foodData.single_orders || [];
      const batchOrders = (foodData.batch_orders || []).flatMap(batch => 
        batch.orders.map(o => ({ ...o, is_batch: true, batch_info: batch }))
      );
      setFoodOrders([...singleOrders, ...batchOrders]);
      setMyFoodOrders(myFoodRes.data || []);
    } catch (error) {
      console.error('Error accepting food order:', error);
    }
  };

  // قبول طلب منتجات
  const handleTakeOrder = async (order) => {
    try {
      await axios.post(`${API}/orders/${order.id}/delivery/pickup`);
      // إعادة جلب البيانات
      const [availableRes, myRes] = await Promise.all([
        axios.get(`${API}/delivery/available-orders`),
        axios.get(`${API}/delivery/my-orders`)
      ]);
      setOrders(availableRes.data);
      setMyOrders(myRes.data);
    } catch (error) {
      console.error('Error accepting order:', error);
    }
  };

  const totalOrders = orders.length + foodOrders.length;

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Header بسيط */}
      <div className="bg-[#1a1a1a] border-b border-[#333] px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate('/delivery/dashboard')}
          className="p-2 bg-[#252525] text-white rounded-lg hover:bg-[#333] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19 7-7-7-7"/>
            <path d="M19 12H5"/>
          </svg>
        </button>
        <h1 className="text-white font-bold">خريطة التوصيل</h1>
        <div className="text-green-400 font-bold text-sm">
          {totalOrders} طلب
        </div>
      </div>

      {/* زر فتح الخريطة أو رسالة */}
      <div className="p-4">
        {totalOrders > 0 ? (
          <OrdersMap
            orders={orders}
            foodOrders={foodOrders}
            onTakeOrder={handleTakeOrder}
            onTakeFoodOrder={handleTakeFoodOrder}
            myOrders={myOrders}
            myFoodOrders={myFoodOrders}
          />
        ) : (
          <div className="bg-[#1a1a1a] rounded-2xl p-8 text-center border border-[#333]">
            <div className="text-6xl mb-4">🗺️</div>
            <h2 className="text-white font-bold text-lg mb-2">لا توجد طلبات متاحة</h2>
            <p className="text-gray-400 text-sm mb-4">
              عندما تتوفر طلبات جديدة، ستظهر هنا على الخريطة
            </p>
            <button
              onClick={() => navigate('/delivery/dashboard')}
              className="bg-green-500 text-black px-6 py-2 rounded-xl font-bold"
            >
              العودة للوحة التحكم
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryMapPage;
