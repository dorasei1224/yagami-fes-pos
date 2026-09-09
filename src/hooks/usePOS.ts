"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const GAS_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbzXI6OREZINVr2P0EOmXV7hvG98rJaG80UDgQPVjW0qhwuvCjAv8BXIRp1bvqYdsGKY/exec";

export interface Product {
  id: string;
  name: string;
  category: "waffle" | "drink";
  basePrice: number;
  currentPrice: number;
  stock: number; // ★ 在庫数を追加
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
  { id: "waffle-plain", name: "プレーン", category: "waffle", basePrice: 400, currentPrice: 400, stock: 30 },
  { id: "waffle-caramel", name: "キャラメル", category: "waffle", basePrice: 400, currentPrice: 400, stock: 30 },
  { id: "waffle-maple", name: "メープル", category: "waffle", basePrice: 400, currentPrice: 400, stock: 30 },
  { id: "waffle-chocolate", name: "チョコ", category: "waffle", basePrice: 400, currentPrice: 400, stock: 30 },
  { id: "drink-soda", name: "ソーダ味", category: "drink", basePrice: 400, currentPrice: 400, stock: 50 },
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

  // 初回ロード時に localStorage から商品（在庫情報含む）を復元
  useEffect(() => {
    const savedProducts = localStorage.getItem("pos_products");
    if (savedProducts) {
      try {
        setProducts(JSON.parse(savedProducts));
      } catch (e) {
        console.error("Failed to parse saved products", e);
      }
    }
  }, []);

  // 商品データ変更時に localStorage に保存
  const saveProductsToStorage = (updatedProducts: Product[]) => {
    setProducts(updatedProducts);
    localStorage.setItem("pos_products", JSON.stringify(updatedProducts));
  };

  // 1. スプレッドシートからデータを取得し、重複を除外してマージ
  const fetchAndMergeOrders = useCallback(async () => {
    if (!navigator.onLine || !GAS_WEB_APP_URL || GAS_WEB_APP_URL.includes("YOUR_GAS")) return;

    try {
      setIsSyncing(true);
      const fetchUrl = `${GAS_WEB_APP_URL}?t=${Date.now()}`;
      const res = await fetch(fetchUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
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

        const orderMap = new Map<string, Order>();

        remoteOrders.forEach((o) => {
          if (o.orderId) orderMap.set(o.orderId, o);
        });

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
    // 在庫切れの場合は追加させない
    if (product.stock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        // 在庫数以上のカート追加を防止
        if (existing.quantity >= product.stock) return prev;
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    const product = products.find((p) => p.id === productId);
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            // 在庫上限をチェック
            if (product && newQty > product.stock) return item;
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

  // 会計完了（在庫を自動減算）
  const completeOrder = (receivedAmount: number): Order => {
    const nextOrderNumber = orders.length + 1;
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

    // ★ 在庫数を自動減算処理
    const updatedProducts = products.map((p) => {
      const cartItem = cart.find((item) => item.product.id === p.id);
      if (cartItem) {
        return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) };
      }
      return p;
    });
    saveProductsToStorage(updatedProducts);

    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    localStorage.setItem("pos_orders", JSON.stringify(updatedOrders));
    clearCart();

    setTimeout(() => syncUnsentOrders(), 100);

    return newOrder;
  };

  // 注文キャンセル（在庫を自動復元）
// 注文キャンセル（在庫戻し選択に対応）
  const cancelOrder = (orderId: string, restoreStock: boolean = true) => {
    const targetOrder = orders.find((o) => o.orderId === orderId);
    if (!targetOrder || targetOrder.status === "CANCELLED") return;

    // restoreStock が true の場合のみ、在庫数を復元処理
    if (restoreStock) {
      const updatedProducts = products.map((p) => {
        const orderItem = targetOrder.items.find((item) => item.id === p.id);
        if (orderItem) {
          return { ...p, stock: p.stock + orderItem.quantity };
        }
        return p;
      });
      saveProductsToStorage(updatedProducts);
    }

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
    saveProductsToStorage(updated);
  };

  // ★ 在庫数の手動変更関数
  const updateProductStock = (productId: string, newStock: number) => {
    const updated = products.map((p) =>
      p.id === productId ? { ...p, stock: Math.max(0, newStock) } : p
    );
    saveProductsToStorage(updated);
  };

  const toggleTimeSale = (active: boolean) => {
    setIsTimeSale(active);
    const updated = products.map((p) => ({
      ...p,
      currentPrice: active ? Math.max(0, p.basePrice - 100) : p.basePrice,
    }));
    saveProductsToStorage(updated);
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
    updateProductStock, // ★ 追加
    toggleTimeSale,
    updateTargetAmount,
    manualSync: syncUnsentOrders,
  };
}