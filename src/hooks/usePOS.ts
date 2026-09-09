"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ⚠️ ご自身の Google Apps Script の Web App URL
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzXI6OREZINVr2P0EOmXV7hvG98rJaG80UDgQPVjW0qhwuvCjAv8BXIRp1bvqYdsGKY/exec";

export interface Product {
  id: string;
  name: string;
  category: "waffle" | "drink";
  basePrice: number;
  currentPrice: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  orderId: string;
  orderNumber: number;
  timestamp: string;
  staffName: string;
  status: "COMPLETED" | "CANCELLED";
  items: OrderItem[];
  totalQuantity: number;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  receivedAmount: number;
  changeAmount: number;
  hasCoupon: boolean;
  synced: boolean;
}

const INITIAL_PRODUCTS: Product[] = [
  { id: "waffle-plain", name: "プレーン", category: "waffle", basePrice: 400, currentPrice: 400 },
  { id: "waffle-caramel", name: "キャラメル", category: "waffle", basePrice: 400, currentPrice: 400 },
  { id: "waffle-maple", name: "メープル", category: "waffle", basePrice: 400, currentPrice: 400 },
  { id: "waffle-chocolate", name: "チョコ", category: "waffle", basePrice: 400, currentPrice: 400 },
  { id: "drink-soda", name: "ソーダ味", category: "drink", basePrice: 400, currentPrice: 400 },
];

export function usePOS() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [staffName, setStaffName] = useState<string>("スタッフA");
  const [hasCoupon, setHasCoupon] = useState<boolean>(false);
  const [targetAmount, setTargetAmount] = useState<number>(50000);
  const [isTimeSale, setIsTimeSale] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const isSyncingRef = useRef<boolean>(false);

  // 1. スプレッドシートからデータを取得し、重複を除外してマージ
  const fetchAndMergeOrders = useCallback(async () => {
    if (!navigator.onLine || !GAS_WEB_APP_URL || GAS_WEB_APP_URL.includes("YOUR_GAS")) return;

    try {
      setIsSyncing(true);
      const fetchUrl = `${GAS_WEB_APP_URL}?t=${Date.now()}`;
      const res = await fetch(fetchUrl, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });

      if (!res.ok) return;

      const data = await res.json();

      if (data.status === "success" && Array.isArray(data.orders)) {
        const remoteOrders: Order[] = data.orders.map((o: any) => {
          let parsedItems = [];
          try {
            parsedItems = typeof o.items === "string" ? JSON.parse(o.items) : o.items;
          } catch (e) {
            parsedItems = [];
          }

          return {
            ...o,
            orderNumber: Number(o.orderNumber) || 0,
            totalQuantity: Number(o.totalQuantity) || 0,
            subtotal: Number(o.subtotal) || 0,
            discountAmount: Number(o.discountAmount) || 0,
            totalAmount: Number(o.totalAmount) || 0,
            receivedAmount: Number(o.receivedAmount) || 0,
            changeAmount: Number(o.changeAmount) || 0,
            hasCoupon: String(o.hasCoupon) === "true",
            items: parsedItems,
            synced: true,
          };
        });

        // 重複を除外するための Map 処理
        const orderMap = new Map<string, Order>();

        // スプレッドシート側のデータで上書き
        remoteOrders.forEach((o) => {
          if (o.orderId) orderMap.set(o.orderId, o);
        });

        // ローカルでまだ送信できていないデータ(synced: false)のみ保持
        const savedOrdersStr = localStorage.getItem("pos_orders");
        if (savedOrdersStr) {
          const localOrders: Order[] = JSON.parse(savedOrdersStr);
          localOrders.forEach((o) => {
            if (!o.synced && o.orderId) {
              orderMap.set(o.orderId, o);
            }
          });
        }

        const mergedOrders = Array.from(orderMap.values()).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setOrders(mergedOrders);
        localStorage.setItem("pos_orders", JSON.stringify(mergedOrders));
      }
    } catch (err) {
      console.error("データ同期エラー:", err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // 2. 未送信データを送信する関数
  const syncUnsentOrders = useCallback(async () => {
    if (!navigator.onLine || isSyncingRef.current) return;

    const savedOrdersStr = localStorage.getItem("pos_orders");
    if (!savedOrdersStr) return;

    const currentOrders: Order[] = JSON.parse(savedOrdersStr);
    const unsentOrders = currentOrders.filter((o) => !o.synced);

    if (unsentOrders.length === 0) {
      await fetchAndMergeOrders();
      return;
    }

    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      await fetch(GAS_WEB_APP_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(unsentOrders),
      });

      const unsentIds = new Set(unsentOrders.map((o) => o.orderId));
      
      setOrders((prev) => {
        const updated = prev.map((o) => (unsentIds.has(o.orderId) ? { ...o, synced: true } : o));
        localStorage.setItem("pos_orders", JSON.stringify(updated));
        return updated;
      });

      setTimeout(async () => {
        await fetchAndMergeOrders();
        isSyncingRef.current = false;
        setIsSyncing(false);
      }, 1500);
    } catch (err) {
      console.error("POST失敗:", err);
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [fetchAndMergeOrders]);

  // 定期同期と初期ロード
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const savedOrdersStr = localStorage.getItem("pos_orders");
    if (savedOrdersStr) setOrders(JSON.parse(savedOrdersStr));

    fetchAndMergeOrders();

    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        syncUnsentOrders();
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [fetchAndMergeOrders, syncUnsentOrders]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setHasCoupon(false);
  };

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.product.currentPrice * item.quantity, 0);
  const multiDiscount = totalQuantity > 1 ? (totalQuantity - 1) * 100 : 0;
  const couponDiscount = hasCoupon ? 100 : 0;
  const discountAmount = multiDiscount + couponDiscount;
  const totalAmount = Math.max(0, subtotal - discountAmount);

  const completeOrder = (receivedAmount: number): Order => {
    const nextOrderNumber = orders.length + 1;
    // 完全に一意な ID を生成（ランダム英数字を付与して重複を100%防止）
    const uniqueId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newOrder: Order = {
      orderId: uniqueId,
      orderNumber: nextOrderNumber,
      timestamp: new Date().toISOString(),
      staffName,
      status: "COMPLETED",
      items: cart.map((item) => ({
        id: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.currentPrice,
      })),
      totalQuantity,
      subtotal,
      discountAmount,
      totalAmount,
      receivedAmount,
      changeAmount: Math.max(0, receivedAmount - totalAmount),
      hasCoupon,
      synced: false,
    };

    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    localStorage.setItem("pos_orders", JSON.stringify(updatedOrders));
    clearCart();

    setTimeout(() => syncUnsentOrders(), 100);

    return newOrder;
  };

  const cancelOrder = (orderId: string) => {
    const targetOrder = orders.find((o) => o.orderId === orderId);
    if (!targetOrder) return;

    const cancelledOrder: Order = { ...targetOrder, status: "CANCELLED", synced: false };
    const updated = orders.map((o) => (o.orderId === orderId ? cancelledOrder : o));
    setOrders(updated);
    localStorage.setItem("pos_orders", JSON.stringify(updated));

    setTimeout(() => syncUnsentOrders(), 100);
  };

  const updateProductPrice = (productId: string, newPrice: number) => {
    const updated = products.map((p) =>
      p.id === productId ? { ...p, currentPrice: newPrice } : p
    );
    setProducts(updated);
  };

  const toggleTimeSale = (active: boolean) => {
    setIsTimeSale(active);
    const updated = products.map((p) => ({
      ...p,
      currentPrice: active ? Math.max(0, p.basePrice - 100) : p.basePrice,
    }));
    setProducts(updated);
  };

  const changeStaff = (name: string) => setStaffName(name);
  const updateTargetAmount = (amount: number) => setTargetAmount(amount);

  const validOrders = orders.filter((o) => o.status === "COMPLETED");
  const totalSales = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const unsentCount = orders.filter((o) => !o.synced).length;

  return {
    products,
    cart,
    orders,
    staffName,
    hasCoupon,
    targetAmount,
    isTimeSale,
    isOnline,
    isSyncing,
    unsentCount,
    totalQuantity,
    subtotal,
    discountAmount,
    totalAmount,
    totalSales,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    setHasCoupon,
    completeOrder,
    cancelOrder,
    changeStaff,
    updateProductPrice,
    toggleTimeSale,
    updateTargetAmount,
    manualSync: syncUnsentOrders,
  };
}