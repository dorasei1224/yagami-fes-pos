"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ⚠️ ここにご自身の Google Apps Script の Web App URL を貼り付けてください
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxpu67F6b6Yi_Nsvt9ZLptvm6cVp31A6rFQ9yr26wVdqRYaq5prcS7-Hnsxt8IxKDbl/exec";

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

  // 送信中の重複実行を防ぐフラグ
  const isSyncingRef = useRef<boolean>(false);

  // GASへの一括/単一送信処理
  const sendToGAS = async (orderData: Order | Order[]) => {
    if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL.includes("YOUR_GAS")) return false;
    try {
      await fetch(GAS_WEB_APP_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      return true;
    } catch (err) {
      console.error("GAS送信失敗（オフラインまたはエラー）:", err);
      return false;
    }
  };

  // 未送信データを全件一括同期するメイン関数
  const syncUnsentOrders = useCallback(async () => {
    if (!navigator.onLine || isSyncingRef.current) return;

    // LocalStorageから最新の注文リストを直接読み出し（ステートのズレ防止）
    const savedOrdersStr = localStorage.getItem("pos_orders");
    if (!savedOrdersStr) return;

    const currentOrders: Order[] = JSON.parse(savedOrdersStr);
    const unsentOrders = currentOrders.filter((o) => !o.synced);

    if (unsentOrders.length === 0) return;

    isSyncingRef.current = true;

    // 未送信データをまとめてGASへ送信
    const success = await sendToGAS(unsentOrders);

    if (success) {
      const unsentIds = new Set(unsentOrders.map((o) => o.orderId));
      setOrders((prev) => {
        const updated = prev.map((o) => (unsentIds.has(o.orderId) ? { ...o, synced: true } : o));
        localStorage.setItem("pos_orders", JSON.stringify(updated));
        return updated;
      });
    }

    isSyncingRef.current = false;
  }, []);

  // 初期化・ネットワーク検知・タイマー自動同期の設定
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const savedProducts = localStorage.getItem("pos_products");
    if (savedProducts) setProducts(JSON.parse(savedProducts));

    const savedOrdersStr = localStorage.getItem("pos_orders");
    if (savedOrdersStr) setOrders(JSON.parse(savedOrdersStr));

    const savedStaff = localStorage.getItem("pos_staff");
    if (savedStaff) setStaffName(savedStaff);

    const savedTarget = localStorage.getItem("pos_target");
    if (savedTarget) setTargetAmount(Number(savedTarget));

    // ★ 1. オンライン復帰時の自動検知＆即時同期
    const handleOnline = () => {
      setIsOnline(true);
      syncUnsentOrders();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // ★ 2. オンライン中、5秒ごとにバックグラウンドで自動同期チェック
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        syncUnsentOrders();
      }
    }, 5000);

    // 初回読み込み時にも未送信分があれば送信トライ
    if (navigator.onLine) {
      syncUnsentOrders();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(intervalId);
    };
  }, [syncUnsentOrders]);

  const updateProductPrice = (productId: string, newPrice: number) => {
    const updated = products.map((p) =>
      p.id === productId ? { ...p, currentPrice: newPrice } : p
    );
    setProducts(updated);
    localStorage.setItem("pos_products", JSON.stringify(updated));
  };

  const toggleTimeSale = (active: boolean) => {
    setIsTimeSale(active);
    const updated = products.map((p) => ({
      ...p,
      currentPrice: active ? Math.max(0, p.basePrice - 100) : p.basePrice,
    }));
    setProducts(updated);
    localStorage.setItem("pos_products", JSON.stringify(updated));
  };

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

  // 会計完了（ローカルに即時書き込み ➔ 次のタイマーまたは即時実行で同期）
  const completeOrder = (receivedAmount: number): Order => {
    const nextOrderNumber = orders.length + 1;
    const newOrder: Order = {
      orderId: `ORD-${Date.now()}`,
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

    // バックグラウンドで同期を直ちにキューイング
    setTimeout(() => syncUnsentOrders(), 100);

    return newOrder;
  };

  // 返金・キャンセル処理
  const cancelOrder = (orderId: string) => {
    const targetOrder = orders.find((o) => o.orderId === orderId);
    if (!targetOrder) return;

    const cancelledOrder: Order = { ...targetOrder, status: "CANCELLED", synced: false };
    const updated = orders.map((o) => (o.orderId === orderId ? cancelledOrder : o));
    setOrders(updated);
    localStorage.setItem("pos_orders", JSON.stringify(updated));

    // バックグラウンドで同期を直ちにキューイング
    setTimeout(() => syncUnsentOrders(), 100);
  };

  const changeStaff = (name: string) => {
    setStaffName(name);
    localStorage.setItem("pos_staff", name);
  };

  const updateTargetAmount = (amount: number) => {
    setTargetAmount(amount);
    localStorage.setItem("pos_target", amount.toString());
  };

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