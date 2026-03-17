#!/usr/bin/env python3
# /app/backend/tests/performance_test.py
# اختبار الأداء السريع

import requests
import time
import statistics
import concurrent.futures
import json

BASE_URL = "http://localhost:8001/api"

def measure_request(url: str, method: str = "GET", headers: dict = None, data: dict = None):
    """قياس زمن طلب واحد"""
    start = time.time()
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        else:
            response = requests.post(url, headers=headers, json=data, timeout=10)
        duration = (time.time() - start) * 1000
        return {
            "url": url,
            "status": response.status_code,
            "duration_ms": duration,
            "success": response.status_code < 400
        }
    except Exception as e:
        return {
            "url": url,
            "status": 0,
            "duration_ms": (time.time() - start) * 1000,
            "success": False,
            "error": str(e)
        }

def run_performance_test():
    """تشغيل اختبار الأداء"""
    print("=" * 60)
    print("🚀 بدء اختبار الأداء - Trend Syria API")
    print("=" * 60)
    
    # قائمة الـ endpoints للاختبار
    endpoints = [
        {"url": f"{BASE_URL}/categories", "method": "GET", "name": "Categories"},
        {"url": f"{BASE_URL}/products", "method": "GET", "name": "Products List"},
        {"url": f"{BASE_URL}/food/stores?city=دمشق", "method": "GET", "name": "Food Stores"},
    ]
    
    # تسجيل الدخول للحصول على token
    login_response = requests.post(f"{BASE_URL}/auth/login", json={
        "phone": "0933333333",
        "password": "buyer123"
    })
    
    if login_response.status_code == 200:
        token = login_response.json().get("token")
        auth_headers = {"Authorization": f"Bearer {token}"}
        endpoints.extend([
            {"url": f"{BASE_URL}/cart", "method": "GET", "name": "Cart", "headers": auth_headers},
            {"url": f"{BASE_URL}/notifications", "method": "GET", "name": "Notifications", "headers": auth_headers},
            {"url": f"{BASE_URL}/orders/my-orders", "method": "GET", "name": "My Orders", "headers": auth_headers},
        ])
    else:
        print("⚠️ فشل تسجيل الدخول، سيتم اختبار الـ endpoints العامة فقط")
        auth_headers = {}
    
    results = {}
    
    for endpoint in endpoints:
        print(f"\n📊 اختبار: {endpoint['name']}")
        times = []
        
        # 10 طلبات لكل endpoint
        for i in range(10):
            result = measure_request(
                endpoint["url"],
                endpoint.get("method", "GET"),
                endpoint.get("headers")
            )
            times.append(result["duration_ms"])
            status_icon = "✅" if result["success"] else "❌"
            print(f"  {status_icon} Request {i+1}: {result['duration_ms']:.2f}ms")
        
        # حساب الإحصائيات
        results[endpoint["name"]] = {
            "avg_ms": statistics.mean(times),
            "min_ms": min(times),
            "max_ms": max(times),
            "median_ms": statistics.median(times),
            "stdev_ms": statistics.stdev(times) if len(times) > 1 else 0
        }
    
    # طباعة الملخص
    print("\n" + "=" * 60)
    print("📈 ملخص نتائج الأداء")
    print("=" * 60)
    
    for name, stats in results.items():
        status = "🟢" if stats["avg_ms"] < 100 else "🟡" if stats["avg_ms"] < 500 else "🔴"
        print(f"\n{status} {name}:")
        print(f"   المتوسط: {stats['avg_ms']:.2f}ms")
        print(f"   الأدنى: {stats['min_ms']:.2f}ms")
        print(f"   الأعلى: {stats['max_ms']:.2f}ms")
        print(f"   الوسيط: {stats['median_ms']:.2f}ms")
    
    # اختبار الأحمال المتزامنة
    print("\n" + "=" * 60)
    print("🔥 اختبار الأحمال المتزامنة (50 طلب)")
    print("=" * 60)
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [
            executor.submit(measure_request, f"{BASE_URL}/categories")
            for _ in range(50)
        ]
        
        concurrent_results = [f.result() for f in concurrent.futures.as_completed(futures)]
    
    success_count = sum(1 for r in concurrent_results if r["success"])
    times = [r["duration_ms"] for r in concurrent_results]
    
    print(f"\n✅ نجاح: {success_count}/50 طلب")
    print(f"⏱️ متوسط الزمن: {statistics.mean(times):.2f}ms")
    print(f"📊 أقصى زمن: {max(times):.2f}ms")
    
    if success_count == 50:
        print("\n🎉 اجتاز التطبيق اختبار الأداء بنجاح!")
    else:
        print(f"\n⚠️ {50 - success_count} طلبات فشلت")
    
    return results

if __name__ == "__main__":
    run_performance_test()
