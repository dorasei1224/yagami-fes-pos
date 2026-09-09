"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import Link from "next/link";
import { usePOS, Order, Product } from "@/hooks/usePOS";

type Category = "all" | "waffle" | "drink";
type CheckoutMode = "cart" | "payment" | "completed";

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
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");
  
  // 右側エリアのモード (cart: カート確認 / payment: お会計入力 / completed: お支払い完了確認)
  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>("cart");
  
  // 預かり金額を string（初期値 ""）で管理
  const [receivedAmount, setReceivedAmount] = useState<string>("");
  const [notification, setNotification] = useState<string | null>(null);

  // 完了時の注文・お釣り・預かり金情報保持用
  const [completedDetails, setCompletedDetails] = useState<{
    order: Order;
    received: number;
    change: number;
  } | null>(null);

  // トースト通知を3秒後に自動消去
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // カートの中身や合計金額が変わった際、預かり金額をクリア
  useEffect(() => {
    setReceivedAmount("");
  }, [totalAmount, cart]);

  const filteredProducts = products.filter((p) =>
    selectedCategory === "all" ? true : p.category === selectedCategory
  );

  // カート確認画面（checkoutMode === "cart"）の時だけ商品追加を許可するガード
  const handleAddToCart = (product: Product) => {
    if (checkoutMode !== "cart") return;
    if (product.stock <= 0) return; // 売り切れの場合は追加しない
    addToCart(product);
  };

  // 指定した商品がカートにいくつ入っているかを取得
  const getItemQuantity = (productId: string) => {
    const item = cart.find((i) => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  // 数値化した預かり金額（未入力・不正値の場合は0）
  const numReceived = Math.max(0, parseInt(receivedAmount, 10) || 0);

  // お釣りの計算
  const changeAmount = numReceived >= totalAmount ? numReceived - totalAmount : 0;

  // 支払いボタンの有効化判定
  const isPayable = totalAmount > 0 && numReceived >= totalAmount;

  // 会計に進む時の処理
  const handleStartPayment = () => {
    setReceivedAmount(""); // 初期値は空にする
    setCheckoutMode("payment");
  };

  // 会計確定処理
  const handleCompletePayment = () => {
    if (!isPayable) {
      alert("預かり金額が不足しています");
      return;
    }
    const order = completeOrder(numReceived);

    // 確定時の情報を右側エリアに表示するため保持
    setCompletedDetails({
      order,
      received: numReceived,
      change: changeAmount,
    });
    setCheckoutMode("completed");
  };

  // 次の会計へ進む処理
  const handleNextOrder = () => {
    if (completedDetails) {
      setNotification(
        `注文 #${completedDetails.order.orderNumber} の会計が完了しました（お釣り: ${completedDetails.change.toLocaleString()}円）`
      );
    }
    setCompletedDetails(null);
    setCheckoutMode("cart");
    setReceivedAmount("");
  };

  // クイック入力（加算）
  const handleQuickMoney = (amount: number) => {
    setReceivedAmount(String(numReceived + amount));
  };

  // Enterキーで会計確定
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && isPayable) {
      e.preventDefault();
      handleCompletePayment();
    }
  };

  // 硬貨・紙幣のラインナップ
  const coins = [1, 5, 10, 50, 100, 500];
  const bills = [1000, 2000, 5000, 10000];

  const categories: { id: Category; label: string }[] = [
    { id: "all", label: "すべて" },
    { id: "waffle", label: "ワッフル" },
    { id: "drink", label: "ドリンク" },
  ];

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

      {/* モバイル用タブ切り替え */}
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
            {categories.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
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
            {filteredProducts.map((product) => {
              const isCartMode = checkoutMode === "cart";
              const quantity = getItemQuantity(product.id);
              const isSoldOut = product.stock <= 0;
              const isLowStock = product.stock > 0 && product.stock <= 5; // 残り5個以下を僅少扱い

              return (
                <button
                  key={product.id}
                  disabled={!isCartMode || isSoldOut}
                  onClick={() => handleAddToCart(product)}
                  className={`relative p-4 rounded-xl border transition text-left flex flex-col justify-between shadow-sm min-h-[110px] ${
                    isSoldOut
                      ? "bg-neutral-100 border-neutral-200 opacity-60 cursor-not-allowed"
                      : isCartMode
                      ? quantity > 0
                        ? "bg-white border-neutral-900 ring-1 ring-neutral-900 shadow"
                        : "bg-white border-neutral-200 hover:border-neutral-400 active:scale-95 cursor-pointer"
                      : "bg-neutral-50 border-neutral-200 opacity-60 cursor-not-allowed"
                  }`}
                >
                  {/* カートに入っている数量のバッジ（右上） */}
                  {quantity > 0 && (
                    <span className="absolute -top-2 -right-2 bg-neutral-900 text-white font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center shadow-md animate-in zoom-in duration-150 z-10">
                      {quantity}
                    </span>
                  )}

                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-neutral-400 font-semibold tracking-wider uppercase">
                        {product.category}
                      </span>
                      {/* 在庫数バッジ / 残数アラート */}
                      {isSoldOut ? (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          売り切れ
                        </span>
                      ) : isLowStock ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 animate-pulse">
                          残り {product.stock} 個
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-neutral-400">
                          残 {product.stock}
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-neutral-800 text-sm md:text-base mt-0.5 pr-1">
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
              );
            })}
          </div>
        </div>

        {/* 右側: カート / 決済 / 完了確認エリア */}
        <div
          className={`md:col-span-5 lg:col-span-5 ${
            activeTab === "cart" ? "block" : "hidden md:block"
          }`}
        >
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 md:p-5 shadow-sm space-y-4 sticky top-[73px]">
            
            {/* 【1. カートモード】 */}
            {checkoutMode === "cart" && (
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
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
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
                            {item.product.currentPrice.toLocaleString()}円 × {item.quantity}
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
                              disabled={item.quantity >= item.product.stock}
                              onClick={() => updateQuantity(item.product.id, 1)}
                              className="w-7 h-7 flex items-center justify-center text-xs font-bold text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed"
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

                {/* 改善されたクーポン設定エリア */}
                <div
                  onClick={() => setHasCoupon(!hasCoupon)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between select-none ${
                    hasCoupon
                      ? "bg-emerald-50/80 border-emerald-300 shadow-sm"
                      : "bg-neutral-50 border-neutral-200 hover:bg-neutral-100/80"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">🎟️</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-800">
                          100円引きクーポン
                        </span>
                        {hasCoupon && (
                          <span className="text-[10px] font-bold bg-emerald-600 text-white px-1.5 py-0.2 rounded">
                            適用中
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-500 mt-0.5">
                        {hasCoupon ? "小計から100円値引きされます" : "タップして割引を適用"}
                      </p>
                    </div>
                  </div>

                  {/* スイッチ（トグルボタン） */}
                  <div
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                      hasCoupon ? "bg-emerald-500" : "bg-neutral-300"
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                        hasCoupon ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </div>
                </div>

                {/* 金額計算サマリー */}
                <div className="space-y-1.5 pt-2 border-t border-neutral-100 text-xs">
                  <div className="flex justify-between text-neutral-500">
                    <span>小計 ({totalQuantity}点)</span>
                    <span>{subtotal.toLocaleString()} 円</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold bg-emerald-50/60 p-1.5 rounded border border-emerald-100">
                      <span>🎟️ クーポン割引</span>
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
                  className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white rounded-xl font-bold text-sm transition shadow-sm cursor-pointer disabled:cursor-not-allowed"
                >
                  お会計へ進む
                </button>
              </>
            )}

            {/* 【2. お会計入力モード】 */}
            {checkoutMode === "payment" && (
              <div className="space-y-4 animate-in fade-in duration-200">
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
                    <span className="font-bold text-white text-sm">
                      {totalAmount.toLocaleString()} 円
                      {hasCoupon && (
                        <span className="text-[10px] text-emerald-400 ml-1 font-normal">
                          (割引済)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-neutral-400">
                    <span>お預かり</span>
                    <span className="font-bold text-amber-400 text-base">
                      {receivedAmount !== "" ? `${numReceived.toLocaleString()} 円` : "-- 円"}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2 border-t border-neutral-800">
                    <span className="text-xs font-bold text-neutral-300">お釣り</span>
                    <span
                      className={`text-2xl font-black ${
                        isPayable ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {isPayable ? `${changeAmount.toLocaleString()} 円` : "-- 円"}
                    </span>
                  </div>
                </div>

                {/* 預かり金額操作エリア */}
                <div className="space-y-3">
                  {/* 「ぴったり」＆「クリア」クイックボタン */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setReceivedAmount(String(totalAmount))}
                      className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs rounded-lg transition border border-neutral-200"
                    >
                      ぴったり (¥{totalAmount.toLocaleString()})
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceivedAmount("")}
                      className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-500 font-medium text-xs rounded-lg transition border border-neutral-200"
                    >
                      クリア
                    </button>
                  </div>

                  {/* 硬貨ボタン */}
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 block mb-1">硬貨</span>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                      {coins.map((coin) => (
                        <button
                          key={coin}
                          type="button"
                          onClick={() => handleQuickMoney(coin)}
                          className="py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-lg border border-amber-200/60 transition active:scale-95"
                        >
                          +{coin}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 紙幣ボタン */}
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 block mb-1">紙幣</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {bills.map((bill) => (
                        <button
                          key={bill}
                          type="button"
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
                      min="0"
                      inputMode="numeric"
                      value={receivedAmount}
                      onChange={(e) => setReceivedAmount(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="金額を直接入力"
                      className="w-full p-2.5 border border-neutral-300 rounded-xl text-right font-bold text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                    />
                  </div>
                </div>

                {/* 会計完了ボタン */}
                <button
                  type="button"
                  disabled={!isPayable}
                  onClick={handleCompletePayment}
                  className={`w-full py-3.5 rounded-xl font-bold text-base transition shadow-md ${
                    isPayable
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-[0.99]"
                      : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                  }`}
                >
                  会計を確定する
                </button>
              </div>
            )}

            {/* 【3. お会計完了・お釣り確認モード】 */}
            {checkoutMode === "completed" && completedDetails && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    お会計完了
                  </span>
                  <span className="text-xs font-bold text-neutral-500">
                    注文番号 #{completedDetails.order.orderNumber}
                  </span>
                </div>

                {/* 特大お釣り表示エリア */}
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-5 text-center space-y-1">
                  <p className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider">
                    お釣りをお渡しください
                  </p>
                  <p className="text-4xl md:text-5xl font-black text-emerald-600 tracking-tight">
                    {completedDetails.change.toLocaleString()}
                    <span className="text-lg md:text-xl font-bold text-emerald-800 ml-1">円</span>
                  </p>
                </div>

                {/* 金額内訳（お預かり金額・合計請求額） */}
                <div className="grid grid-cols-2 gap-2 bg-neutral-50 p-3 rounded-xl border border-neutral-100 text-center">
                  <div>
                    <span className="text-[11px] text-neutral-500 font-medium block">お預かり</span>
                    <span className="text-base font-bold text-neutral-900">
                      {completedDetails.received.toLocaleString()} 円
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-neutral-500 font-medium block">請求額</span>
                    <span className="text-base font-bold text-neutral-900">
                      {completedDetails.order.totalAmount.toLocaleString()} 円
                    </span>
                  </div>
                </div>

                {/* 購入商品明細（確認用） */}
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1 text-xs border-t border-b border-neutral-100 py-3">
                  <p className="font-bold text-neutral-400 mb-1">購入商品一覧</p>
                  {completedDetails.order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-neutral-700">
                      <span>
                        {item.name} <span className="font-bold">× {item.quantity}</span>
                      </span>
                      <span>{(item.unitPrice * item.quantity).toLocaleString()} 円</span>
                    </div>
                  ))}
                  {completedDetails.order.hasCoupon && (
                    <div className="flex justify-between items-center text-emerald-600 font-semibold pt-1">
                      <span>クーポン割引</span>
                      <span>-100 円</span>
                    </div>
                  )}
                </div>

                {/* 次のお会計へボタン */}
                <button
                  onClick={handleNextOrder}
                  className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-bold text-sm transition shadow-md active:scale-[0.99] cursor-pointer"
                >
                  確認してお釣りを渡した（次のお会計へ）
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