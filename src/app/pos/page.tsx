"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePOS, Order } from "@/hooks/usePOS";

export default function POSPage() {
  const {
    products,
    cart,
    orders,
    staffName,
    hasCoupon,
    isOnline,
    unsentCount,
    totalQuantity,
    subtotal,
    discountAmount,
    totalAmount,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    setHasCoupon,
    completeOrder,
    changeStaff,
  } = usePOS();

  const [activeTab, setActiveTab] = useState<"menu" | "cart">("menu");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "waffle" | "drink">("all");
  
  // 画面遷移モード (cart: カート確認 / payment: お会計入力)
  const [checkoutMode, setCheckoutMode] = useState<"cart" | "payment">("cart");
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // トースト通知を3秒後に自動消去
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const filteredProducts = products.filter((p) =>
    selectedCategory === "all" ? true : p.category === selectedCategory
  );

  // 会計に進む時の初期化
  const handleStartPayment = () => {
    setReceivedAmount(totalAmount); // 初期値は「ぴったり」
    setCheckoutMode("payment");
  };

  // 会計完了処理
  const handleCompletePayment = () => {
    if (receivedAmount < totalAmount) {
      alert("預かり金額が不足しています");
      return;
    }
    const order = completeOrder(receivedAmount);
    setLastOrder(order);
    setCheckoutMode("cart");
    setReceivedAmount(0);
    setNotification(`注文 #${order.orderNumber} の会計が完了しました`);
  };

  const handleQuickMoney = (amount: number) => {
    setReceivedAmount((prev) => prev + amount);
  };

  // 硬貨・紙幣のラインナップ
  const coins = [1, 5, 10, 50, 100, 500];
  const bills = [1000, 2000, 5000, 10000];

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-800 flex flex-col font-sans selection:bg-neutral-200 relative">
      {/* ヘッダー */}
      <header className="bg-white border-b border-neutral-200 px-4 py-3 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <h1 className="text-base md:text-lg font-bold tracking-tight text-neutral-900">
            文化祭POS
          </h1>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
              isOnline
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            {isOnline ? "オンライン" : "オフライン"}
          </span>
          {unsentCount > 0 && (
            <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded border border-neutral-200">
              未同期 {unsentCount}件
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <select
            value={staffName}
            onChange={(e) => changeStaff(e.target.value)}
            className="text-xs md:text-sm bg-neutral-50 border border-neutral-300 rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus:ring-2 focus:ring-neutral-400"
          >
            <option value="スタッフA">担当: スタッフA</option>
            <option value="スタッフB">担当: スタッフB</option>
            <option value="スタッフC">担当: スタッフC</option>
          </select>

          <Link
            href="/admin"
            className="text-xs md:text-sm text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-lg border border-neutral-200 font-medium transition"
          >
            管理画面
          </Link>
        </div>
      </header>

      {/* モバイル用タブ切り替え（画面幅 md 未満で表示） */}
      <div className="md:hidden flex border-b border-neutral-200 bg-white sticky top-[57px] z-10">
        <button
          onClick={() => setActiveTab("menu")}
          className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 transition ${
            activeTab === "menu"
              ? "border-neutral-900 text-neutral-900 bg-white"
              : "border-transparent text-neutral-500 bg-neutral-50"
          }`}
        >
          商品一覧
        </button>
        <button
          onClick={() => setActiveTab("cart")}
          className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 transition relative ${
            activeTab === "cart"
              ? "border-neutral-900 text-neutral-900 bg-white"
              : "border-transparent text-neutral-500 bg-neutral-50"
          }`}
        >
          カート / 会計
          {totalQuantity > 0 && (
            <span className="ml-2 bg-neutral-900 text-white text-xs px-2 py-0.5 rounded-full">
              {totalQuantity}
            </span>
          )}
        </button>
      </div>

      {/* メインエリア */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        {/* 左側: 商品選択エリア */}
        <div
          className={`md:col-span-7 lg:col-span-7 space-y-4 ${
            activeTab === "menu" ? "block" : "hidden md:block"
          }`}
        >
          {/* カテゴリフィルターボタン */}
          <div className="flex gap-2">
            {[
              { id: "all", label: "すべて" },
              { id: "waffle", label: "ワッフル" },
              { id: "drink", label: "ドリンク" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id as any)}
                className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition ${
                  selectedCategory === tab.id
                    ? "bg-neutral-900 text-white shadow-sm"
                    : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 商品グリッド */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white p-4 rounded-xl border border-neutral-200 hover:border-neutral-400 active:scale-95 transition text-left flex flex-col justify-between shadow-sm min-h-[110px]"
              >
                <div>
                  <span className="text-[10px] text-neutral-400 font-semibold tracking-wider uppercase">
                    {product.category}
                  </span>
                  <div className="font-bold text-neutral-800 text-sm md:text-base mt-0.5">
                    {product.name}
                  </div>
                </div>
                <div className="text-right mt-2">
                  <span className="text-base md:text-lg font-extrabold text-neutral-900">
                    {product.currentPrice.toLocaleString()}
                  </span>
                  <span className="text-xs text-neutral-500 ml-0.5">円</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 右側: カート ＆ 決済エリア（インラインシームレス切り替え） */}
        <div
          className={`md:col-span-5 lg:col-span-5 ${
            activeTab === "cart" ? "block" : "hidden md:block"
          }`}
        >
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 md:p-5 shadow-sm space-y-4 sticky top-[73px]">
            
            {/* 【1. カートモード】 */}
            {checkoutMode === "cart" ? (
              <>
                <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
                  <h2 className="font-bold text-neutral-800 text-base">注文内容</h2>
                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-xs text-neutral-400 hover:text-neutral-600 transition"
                    >
                      すべてクリア
                    </button>
                  )}
                </div>

                {/* カート内アイテム一覧 */}
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {cart.length === 0 ? (
                    <div className="text-center py-12 text-neutral-400 text-xs">
                      商品を選択してください
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex justify-between items-center p-2.5 bg-neutral-50 rounded-lg border border-neutral-100"
                      >
                        <div className="flex-1 pr-2">
                          <div className="font-medium text-xs md:text-sm text-neutral-800">
                            {item.product.name}
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            {item.product.currentPrice}円 × {item.quantity}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center border border-neutral-300 rounded-md bg-white">
                            <button
                              onClick={() => updateQuantity(item.product.id, -1)}
                              className="w-7 h-7 flex items-center justify-center text-xs font-bold text-neutral-600 hover:bg-neutral-100"
                            >
                              -
                            </button>
                            <span className="w-6 text-center text-xs font-bold text-neutral-800">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.product.id, 1)}
                              className="w-7 h-7 flex items-center justify-center text-xs font-bold text-neutral-600 hover:bg-neutral-100"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-neutral-300 hover:text-neutral-500 p-1 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* クーポン設定 */}
                <div className="pt-2 border-t border-neutral-100">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasCoupon}
                      onChange={(e) => setHasCoupon(e.target.checked)}
                      className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-400"
                    />
                    <span className="text-xs font-medium text-neutral-700">
                      割引クーポンを利用（-100円）
                    </span>
                  </label>
                </div>

                {/* 金額計算サマリー */}
                <div className="space-y-1.5 pt-2 border-t border-neutral-100 text-xs">
                  <div className="flex justify-between text-neutral-500">
                    <span>小計 ({totalQuantity}点)</span>
                    <span>{subtotal.toLocaleString()} 円</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>割引額</span>
                      <span>-{discountAmount.toLocaleString()} 円</span>
                    </div>
                  )}

                  <div className="flex justify-between items-baseline pt-2 border-t border-neutral-200">
                    <span className="font-bold text-neutral-800 text-sm">合計</span>
                    <span className="text-2xl font-extrabold text-neutral-900">
                      {totalAmount.toLocaleString()}
                      <span className="text-xs font-normal text-neutral-500 ml-1">円</span>
                    </span>
                  </div>
                </div>

                {/* お会計に進むボタン */}
                <button
                  disabled={cart.length === 0}
                  onClick={handleStartPayment}
                  className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white rounded-xl font-bold text-sm transition shadow-sm"
                >
                  お会計へ進む
                </button>
              </>
            ) : (
              /* 【2. お会計入力モード】（ポップアップではなく右側エリアがそのまま変化） */
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
                  <button
                    onClick={() => setCheckoutMode("cart")}
                    className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-1 font-bold"
                  >
                    ← 注文内容に戻る
                  </button>
                  <span className="text-xs font-bold text-neutral-400">お支払い手続き</span>
                </div>

                {/* 請求額・預かり額・お釣りサマリー */}
                <div className="bg-neutral-900 text-white p-4 rounded-xl space-y-2 shadow-inner">
                  <div className="flex justify-between text-xs text-neutral-400">
                    <span>請求金額</span>
                    <span className="font-bold text-white text-sm">{totalAmount.toLocaleString()} 円</span>
                  </div>
                  <div className="flex justify-between text-xs text-neutral-400">
                    <span>お預かり</span>
                    <span className="font-bold text-amber-400 text-base">{receivedAmount.toLocaleString()} 円</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2 border-t border-neutral-800">
                    <span className="text-xs font-bold text-neutral-300">お釣り</span>
                    <span className={`text-2xl font-black ${receivedAmount >= totalAmount ? "text-emerald-400" : "text-rose-400"}`}>
                      {receivedAmount >= totalAmount
                        ? `${(receivedAmount - totalAmount).toLocaleString()} 円`
                        : "不足"}
                    </span>
                  </div>
                </div>

                {/* 預かり金額操作エリア */}
                <div className="space-y-3">
                  {/* 「ぴったり」＆「クリア」クイックボタン */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setReceivedAmount(totalAmount)}
                      className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs rounded-lg transition border border-neutral-200"
                    >
                      ぴったり (¥{totalAmount.toLocaleString()})
                    </button>
                    <button
                      onClick={() => setReceivedAmount(0)}
                      className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-500 font-medium text-xs rounded-lg transition border border-neutral-200"
                    >
                      クリア
                    </button>
                  </div>

                  {/* 小銭ボタン (1円〜500円) */}
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 block mb-1">硬貨</span>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                      {coins.map((coin) => (
                        <button
                          key={coin}
                          onClick={() => handleQuickMoney(coin)}
                          className="py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-lg border border-amber-200/60 transition active:scale-95"
                        >
                          +{coin}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 紙幣ボタン (1,000円〜10,000円) */}
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 block mb-1">紙幣</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {bills.map((bill) => (
                        <button
                          key={bill}
                          onClick={() => handleQuickMoney(bill)}
                          className="py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs rounded-lg border border-emerald-200/60 transition active:scale-95"
                        >
                          +{bill.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 手入力インプット */}
                  <div className="pt-1">
                    <input
                      type="number"
                      value={receivedAmount || ""}
                      onChange={(e) => setReceivedAmount(Number(e.target.value))}
                      placeholder="金額を直接入力"
                      className="w-full p-2.5 border border-neutral-300 rounded-xl text-right font-bold text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                    />
                  </div>
                </div>

                {/* 会計完了ボタン */}
                <button
                  disabled={receivedAmount < totalAmount}
                  onClick={handleCompletePayment}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-200 disabled:text-neutral-400 text-white rounded-xl font-bold text-base transition shadow-md active:scale-[0.99]"
                >
                  会計を確定する
                </button>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* 右下トースト通知 */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="bg-neutral-900/90 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-xl border border-neutral-700/60 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <p className="text-xs font-semibold pr-2">{notification}</p>
            <button
              onClick={() => setNotification(null)}
              className="text-neutral-400 hover:text-white transition text-xs pl-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}