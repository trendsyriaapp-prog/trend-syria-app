// /app/frontend/src/components/delivery/DriverPerformance.js
// لوحة تقارير أداء السائق مع رسوم بيانية

import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, Package, DollarSign, Star, Calendar,
  ChevronDown, ChevronUp, Lightbulb, Award, Target,
  Clock, Zap
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const COLORS = ['#FF6B00', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

const DriverPerformance = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeChart, setActiveChart] = useState('monthly');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchPerformance();
  }, []);

  const fetchPerformance = async () => {
    try {
      const res = await axios.get(`${API}/api/delivery/performance`);
      setData(res.data);
    } catch (error) {
      console.error('Error fetching performance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
        <div className="h-48 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { overview, period_stats, charts, performance_level, tips } = data;

  return (
    <div className="space-y-2">
      {/* Performance Level Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl overflow-hidden"
        style={{ 
          background: `linear-gradient(135deg, ${performance_level.color}20, ${performance_level.color}10)`,
          border: `1px solid ${performance_level.color}40`
        }}
      >
        <div className="p-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                style={{ backgroundColor: `${performance_level.color}30` }}
              >
                {performance_level.icon}
              </div>
              <div>
                <p className="text-[10px] text-gray-500">مستوى الأداء</p>
                <p className="text-sm font-bold" style={{ color: performance_level.color }}>
                  {performance_level.level}
                </p>
              </div>
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1">
                <Star className="fill-amber-400 text-amber-400" size={14} />
                <span className="text-lg font-bold text-gray-900">{overview.avg_rating}</span>
              </div>
              <p className="text-[10px] text-gray-500">{overview.total_ratings} تقييم</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-1.5">
        <QuickStatCard 
          icon={Clock}
          label="اليوم"
          value={period_stats.today.orders}
          subValue={formatPrice(period_stats.today.earnings)}
          color="#3b82f6"
        />
        <QuickStatCard 
          icon={Calendar}
          label="الأسبوع"
          value={period_stats.week.orders}
          subValue={formatPrice(period_stats.week.earnings)}
          color="#22c55e"
        />
        <QuickStatCard 
          icon={Target}
          label="الشهر"
          value={period_stats.month.orders}
          subValue={formatPrice(period_stats.month.earnings)}
          color="#FF6B00"
        />
      </div>

      {/* Expandable Performance Details */}
      <motion.div 
        className="bg-white rounded-xl border border-gray-200 overflow-hidden"
        layout
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
          data-testid="performance-expand-btn"
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-[#FF6B00]" />
            <span className="font-bold text-gray-900 text-xs">تقارير الأداء التفصيلية</span>
          </div>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Overview Stats */}
              <div className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <StatBox
                    icon={Package}
                    label="إجمالي الطلبات"
                    value={overview.total_delivered}
                    color="#FF6B00"
                  />
                  <StatBox
                    icon={DollarSign}
                    label="إجمالي الأرباح"
                    value={formatPrice(overview.total_earnings)}
                    color="#22c55e"
                  />
                </div>

                {/* Chart Tabs */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                  {[
                    { id: 'monthly', label: 'شهري', icon: Calendar },
                    { id: 'daily', label: 'يومي', icon: Clock },
                    { id: 'ratings', label: 'التقييمات', icon: Star }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveChart(tab.id)}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                        activeChart === tab.id
                          ? 'bg-[#FF6B00] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      data-testid={`chart-tab-${tab.id}`}
                    >
                      <tab.icon size={14} />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Charts */}
                <div className="bg-gray-50 rounded-xl p-3">
                  {activeChart === 'monthly' && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-3">الطلبات الشهرية</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={charts.monthly}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            axisLine={{ stroke: '#e5e7eb' }}
                          />
                          <YAxis 
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            axisLine={{ stroke: '#e5e7eb' }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#fff', 
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '12px'
                            }}
                            formatter={(value, name) => [
                              name === 'orders' ? `${value} طلب` : formatPrice(value),
                              name === 'orders' ? 'الطلبات' : 'الأرباح'
                            ]}
                          />
                          <Bar dataKey="orders" fill="#FF6B00" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {activeChart === 'daily' && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-3">آخر 7 أيام</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={charts.daily}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            axisLine={{ stroke: '#e5e7eb' }}
                          />
                          <YAxis 
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            axisLine={{ stroke: '#e5e7eb' }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#fff', 
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '12px'
                            }}
                            formatter={(value) => [`${value} طلب`, 'الطلبات']}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="orders" 
                            stroke="#FF6B00" 
                            strokeWidth={2}
                            dot={{ fill: '#FF6B00', strokeWidth: 2 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {activeChart === 'ratings' && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-3">توزيع التقييمات</h4>
                      <div className="flex items-center justify-center">
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={charts.ratings.filter(r => r.count > 0)}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={3}
                              dataKey="count"
                              label={({ stars, count }) => count > 0 ? `${stars}` : ''}
                            >
                              {charts.ratings.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value) => [`${value} تقييم`, '']}
                              contentStyle={{ 
                                backgroundColor: '#fff', 
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                fontSize: '12px'
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Rating Legend */}
                      <div className="flex flex-wrap justify-center gap-2 mt-2">
                        {charts.ratings.map((r, i) => (
                          <div key={i} className="flex items-center gap-1 text-xs">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: COLORS[i] }}
                            />
                            <span className="text-gray-600">{r.stars}: {r.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Performance Tips */}
                {tips && tips.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Lightbulb size={16} className="text-amber-500" />
                      نصائح لتحسين أدائك
                    </h4>
                    {tips.map((tip, i) => (
                      <div 
                        key={i}
                        className={`p-3 rounded-lg text-sm ${
                          tip.type === 'excellent' 
                            ? 'bg-orange-50 border border-orange-200' 
                            : 'bg-amber-50 border border-amber-200'
                        }`}
                      >
                        <p className={`font-bold ${tip.type === 'excellent' ? 'text-orange-700' : 'text-amber-700'}`}>
                          {tip.title}
                        </p>
                        <p className={`text-xs mt-1 ${tip.type === 'excellent' ? 'text-orange-600' : 'text-amber-600'}`}>
                          {tip.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// مكون بطاقة الإحصاء السريع
const QuickStatCard = ({ icon: Icon, label, value, subValue, color }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-2 text-center">
    <Icon size={14} className="mx-auto mb-0.5" style={{ color }} />
    <p className="text-sm font-bold text-gray-900">{value}</p>
    <p className="text-[9px] text-gray-500">{label}</p>
    <p className="text-[9px] font-medium" style={{ color }}>{subValue}</p>
  </div>
);

// مكون صندوق الإحصاء
const StatBox = ({ icon: Icon, label, value, color }) => (
  <div 
    className="p-3 rounded-xl"
    style={{ backgroundColor: `${color}10`, border: `1px solid ${color}20` }}
  >
    <Icon size={18} style={{ color }} className="mb-2" />
    <p className="text-xs text-gray-500">{label}</p>
    <p className="font-bold text-gray-900">{value}</p>
  </div>
);

export default DriverPerformance;
