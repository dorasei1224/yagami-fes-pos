"use client";

import { useState } from "react";
import Link from "next/link";
import { usePOS } from "@/hooks/usePOS";

export default function AdminPage() {
  const {
    products,
    orders,
    targetAmount,
    isTimeSale,
    isOnline,
    unsentCount,
    totalSales,
    cancelOrder,
    updateProductPrice,
    toggleTimeSale,
    updateTargetAmount,
    manualSync,
  } = usePOS();

  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<number>(0);

  const [counts, setCounts] = useState<{ [key: number]: number }>({
    10000: 0, 5000: 0, 1000: 0, 500: 0, 100: 0, 50: 0, 10: 0,
  });
  const [initialCash, setInitialCash] = useState<number>(10000);

  const validOrders = orders.filter((o) => o.status === "COMPLETED");
  const totalOrdersCount = validOrders.length;
  const progressPercent = Math.min(100, Math.round((totalSales / targetAmount) * 100));

  const actualCashInRegister = Object.entries(counts).reduce(
    (sum, [denom, count]) => sum + Number(denom) * count,
    0
  );
  const expectedCashInRegister = initialCash + totalSales;
  const cashDifference = actualCashInRegister - expectedCashInRegister;

  const handleCountChange = (denom: number, value: number) => {
    setCounts((prev) => ({ ...prev, [denom]: Math.max(0, value) }));
  };

  const handlePriceSave = (productId: string) => {
    updateProductPrice(productId, tempPrice);
    setEditingPriceId(null);
  };

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-800 pb-12 font-sans">
      {/* ヘッダー */}
      <header className="bg-white border-b border-neutral-200 px-4 py-3 shadow-sm flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <h1 className="text-base md:text-lg font-bold text-neutral-900">売上管理ダッシュボード</h1>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${isOnline ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
            {isOnline ? "オンライン" : "オフライン"}
          </span>
        </div>
        <Link href="/pos" className="bg-neutral-900 hover:bg-neutral-800 text-white px-3.5 py-1.5 rounded-lg font-medium text-xs md:text-sm transition">
          POS画面へ戻る
        </Link>
      </header>

      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* 売上指標 */}
        <div className="bg-white p-5 md:p-6 rounded-xl border border-neutral-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">売上サマリー</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/60">
              <div className="text-xs text-neutral-500 font-medium">総売上額 (有効注文)</div>
              <div className="text-2xl md:text-3xl font-extrabold text-neutral-900 mt-1">
                {totalSales.toLocaleString()} <span className="text-xs font-normal text-neutral-500">円</span>
              </div>
            </div>
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/60">
              <div className="text-xs text-neutral-500 font-medium">成立件数</div>
              <div className="text-2xl md:text-3xl font-extrabold text-neutral-900 mt-1">
                {totalOrdersCount} <span className="text-xs font-normal text-neutral-500">件</span>
              </div>
            </div>
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/60 flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-500 font-medium">目標達成率</span>
                <input
                  type="number"
                  value={targetAmount}
                  onChange={(e) => updateTargetAmount(Number(e.target.value))}
                  className="text-xs w-24 p-1 border rounded bg-white text-right font-medium"
                  step="5000"
                />
              </div>
              <div className="text-2xl md:text-3xl font-extrabold text-neutral-900 mt-1">
                {progressPercent} <span className="text-xs font-normal text-neutral-500">%</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <div className="flex justify-between text-xs text-neutral-500 font-medium mb-1">
              <span>進捗 ({totalSales.toLocaleString()}円)</span>
              <span>目標: {targetAmount.toLocaleString()}円</span>
            </div>
            <div className="w-full bg-neutral-100 rounded-full h-2.5 overflow-hidden">
              <div className="bg-neutral-900 h-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
        </div>

        {/* 現金実査 */}
        <div className="bg-white p-5 md:p-6 rounded-xl border border-neutral-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
            <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">現金点検・点検結果</h2>
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="text-neutral-500">釣準備金:</span>
              <input
                type="number"
                value={initialCash}
                onChange={(e) => setInitialCash(Number(e.target.value))}
                className="w-24 p-1 border border-neutral-300 rounded text-right font-bold bg-neutral-50"
                step="1000"
              />
              <span>円</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {[10000, 5000, 1000, 500, 100, 50, 10].map((denom) => (
              <div key={denom} className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 text-center">
                <div className="text-[11px] text-neutral-500 mb-1 font-medium">
                  {denom >= 1000 ? `${denom / 1000}千円` : `${denom}円`}
                </div>
                <input
                  type="number"
                  min="0"
                  value={counts[denom] || ""}
                  onChange={(e) => handleCountChange(denom, Number(e.target.value))}
                  placeholder="0"
                  className="w-full p-1 border rounded text-center font-bold text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-100">
              <div className="text-xs text-neutral-500">理論上のレジ内現金</div>
              <div className="text-lg font-bold text-neutral-800">{expectedCashInRegister.toLocaleString()} 円</div>
            </div>

            <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-100">
              <div className="text-xs text-neutral-500">実際のレジ内現金</div>
              <div className="text-lg font-bold text-neutral-800">{actualCashInRegister.toLocaleString()} 円</div>
            </div>

            <div className={`p-3 rounded-lg border ${
              cashDifference === 0
                ? "bg-emerald-50/50 border-emerald-200 text-emerald-800"
                : cashDifference > 0
                ? "bg-amber-50/50 border-amber-200 text-amber-800"
                : "bg-rose-50/50 border-rose-200 text-rose-800"
            }`}>
              <div className="text-xs font-medium">過不足</div>
              <div className="text-lg font-bold">
                {cashDifference === 0
                  ? "差額なし"
                  : cashDifference > 0
                  ? `＋${cashDifference.toLocaleString()} 円`
                  : `${cashDifference.toLocaleString()} 円`}
              </div>
            </div>
          </div>
        </div>

        {/* タイムセール・価格管理 */}
        <div className="bg-white p-5 md:p-6 rounded-xl border border-neutral-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">価格・タイムセール管理</h2>
            <button
              onClick={() => toggleTimeSale(!isTimeSale)}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs transition ${
                isTimeSale ? "bg-rose-600 hover:bg-rose-700 text-white" : "bg-neutral-900 hover:bg-neutral-800 text-white"
              }`}
            >
              {isTimeSale ? "タイムセール解除" : "全品100円引き開始"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.map((p) => (
              <div key={p.id} className="p-3 border border-neutral-200 rounded-lg bg-neutral-50 flex justify-between items-center">
                <div>
                  <div className="font-bold text-xs md:text-sm text-neutral-800">{p.name}</div>
                  <div className="text-[10px] text-neutral-400">定価: {p.basePrice}円</div>
                </div>
                <div className="text-right">
                  {editingPriceId === p.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={tempPrice}
                        onChange={(e) => setTempPrice(Number(e.target.value))}
                        className="w-16 p-1 border rounded text-right text-xs font-bold"
                      />
                      <button onClick={() => handlePriceSave(p.id)} className="bg-neutral-900 text-white text-[10px] px-2 py-1 rounded">
                        保存
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-neutral-900">{p.currentPrice}円</span>
                      <button onClick={() => { setEditingPriceId(p.id); setTempPrice(p.currentPrice); }} className="text-[10px] bg-white border border-neutral-200 px-2 py-0.5 rounded text-neutral-600">
                        変更
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 注文履歴 ＆ スプレッドシート同期ステータス */}
        <div className="bg-white p-5 md:p-6 rounded-xl border border-neutral-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
            <div>
              <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">注文履歴・クラウド同期</h2>
              <div className="text-xs text-neutral-500 mt-0.5">
                未同期データ: <span className="font-bold text-neutral-800">{unsentCount} 件</span>
              </div>
            </div>
            {unsentCount > 0 && (
              <button
                onClick={manualSync}
                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 text-xs font-medium px-3 py-1.5 rounded-lg transition"
              >
                未同期データを手動送信
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm text-neutral-600">
              <thead className="bg-neutral-50 text-neutral-500 uppercase text-[10px] font-bold border-b border-neutral-200">
                <tr>
                  <th className="p-2.5">注文ID</th>
                  <th className="p-2.5">時刻</th>
                  <th className="p-2.5">担当</th>
                  <th className="p-2.5">購入内容</th>
                  <th className="p-2.5 text-right">金額</th>
                  <th className="p-2.5 text-center">状態</th>
                  <th className="p-2.5 text-center">同期</th>
                  <th className="p-2.5 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-neutral-400">注文履歴はありません</td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.orderId} className={o.status === "CANCELLED" ? "bg-neutral-50 text-neutral-400 line-through" : ""}>
                      <td className="p-2.5 font-bold text-neutral-800">#{o.orderNumber}</td>
                      <td className="p-2.5 text-[11px] text-neutral-400">{new Date(o.timestamp).toLocaleTimeString()}</td>
                      <td className="p-2.5">{o.staffName}</td>
                      <td className="p-2.5 text-xs">{o.items.map((i) => `${i.name}×${i.quantity}`).join(", ")}</td>
                      <td className="p-2.5 text-right font-bold text-neutral-800">{o.totalAmount.toLocaleString()}円</td>
                      <td className="p-2.5 text-center">
                        {o.status === "COMPLETED" ? (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium border border-emerald-200">完了</span>
                        ) : (
                          <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded font-medium border border-rose-200">取消</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        {o.synced ? (
                          <span className="text-[10px] text-neutral-500">同期済</span>
                        ) : (
                          <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-medium border border-amber-200">未送信</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        {o.status === "COMPLETED" && (
                          <button
                            onClick={() => {
                              if (confirm(`注文 #${o.orderNumber} をキャンセル（返金）しますか？`)) {
                                cancelOrder(o.orderId);
                              }
                            }}
                            className="text-[11px] text-rose-600 hover:text-rose-800 font-medium hover:underline"
                          >
                            返金・取消
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}