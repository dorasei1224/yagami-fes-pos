"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePOS } from "@/hooks/usePOS";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

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
    updateProductStock,
    toggleTimeSale,
    updateTargetAmount,
    manualSync,
  } = usePOS();

  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<number>(0);

  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [tempStock, setTempStock] = useState<number>(0);

  // ① キャンセル対象の注文を保持するステート
  const [cancelingOrder, setCancelingOrder] = useState<any | null>(null);

  const [counts, setCounts] = useState<{ [key: number]: number }>({
    10000: 0,
    5000: 0,
    1000: 0,
    500: 0,
    100: 0,
    50: 0,
    10: 0,
  });
  const [initialCash, setInitialCash] = useState<number>(10000);

  const validOrders = useMemo(
    () => orders.filter((o) => o.status === "COMPLETED"),
    [orders]
  );
  const totalOrdersCount = validOrders.length;
  const progressPercent = Math.min(
    100,
    Math.round((totalSales / targetAmount) * 100)
  );

  const averageCustomerSpend =
    totalOrdersCount > 0 ? Math.round(totalSales / totalOrdersCount) : 0;

  // 集計データ処理
  const { hourlyChartData, productPieData, topSellingItem } = useMemo(() => {
    const hourlyMap: { [hour: string]: number } = {};
    const productCountMap: { [name: string]: number } = {};

    validOrders.forEach((o) => {
      const date = new Date(o.timestamp);
      const hourStr = `${date.getHours().toString().padStart(2, "0")}:00`;
      hourlyMap[hourStr] = (hourlyMap[hourStr] || 0) + o.totalAmount;

      o.items.forEach((item) => {
        productCountMap[item.name] =
          (productCountMap[item.name] || 0) + item.quantity;
      });
    });

    const hourlyDataArr = Object.entries(hourlyMap)
      .map(([time, amount]) => ({ time, amount }))
      .sort((a, b) => a.time.localeCompare(b.time));

    const pieDataArr = Object.entries(productCountMap).map(([name, value]) => ({
      name,
      value,
    }));

    let topItem = "なし";
    let maxCount = 0;
    Object.entries(productCountMap).forEach(([name, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topItem = `${name} (${count}個)`;
      }
    });

    return {
      hourlyChartData: hourlyDataArr,
      productPieData: pieDataArr,
      topSellingItem: topItem,
    };
  }, [validOrders]);

  const COLORS = ["#171717", "#525252", "#a3a3a3", "#d4d4d4", "#e5e5e5"];

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

  const handleStockSave = (productId: string) => {
    updateProductStock(productId, tempStock);
    setEditingStockId(null);
  };

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-800 pb-12 font-sans">
      {/* ヘッダー */}
      <header className="bg-white border-b border-neutral-200 px-4 py-3 shadow-sm flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <h1 className="text-base md:text-lg font-bold text-neutral-900">
            売上・在庫管理ダッシュボード
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
        </div>
        <Link
          href="/pos"
          className="bg-neutral-900 hover:bg-neutral-800 text-white px-3.5 py-1.5 rounded-lg font-medium text-xs md:text-sm transition"
        >
          POS画面へ戻る
        </Link>
      </header>

      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* KPIカード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
            <div className="text-xs text-neutral-500 font-medium">総売上額 (有効)</div>
            <div className="text-xl md:text-2xl font-extrabold text-neutral-900 mt-1">
              {totalSales.toLocaleString()}{" "}
              <span className="text-xs font-normal text-neutral-500">円</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
            <div className="text-xs text-neutral-500 font-medium">成立件数</div>
            <div className="text-xl md:text-2xl font-extrabold text-neutral-900 mt-1">
              {totalOrdersCount}{" "}
              <span className="text-xs font-normal text-neutral-500">件</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
            <div className="text-xs text-neutral-500 font-medium">平均客単価</div>
            <div className="text-xl md:text-2xl font-extrabold text-neutral-900 mt-1">
              {averageCustomerSpend.toLocaleString()}{" "}
              <span className="text-xs font-normal text-neutral-500">円</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
            <div className="text-xs text-neutral-500 font-medium">売れ筋 No.1</div>
            <div className="text-sm md:text-base font-extrabold text-neutral-900 mt-1 truncate">
              {topSellingItem}
            </div>
          </div>
        </div>

        {/* 📦 リアルタイム在庫状況 & 調整 */}
        <div className="bg-white p-5 md:p-6 rounded-xl border border-neutral-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              リアルタイム在庫管理
            </h2>
            <span className="text-xs text-neutral-400">
              ※ 会計完了で自動的に残数が減ります
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.map((p) => {
              const isLowStock = p.stock > 0 && p.stock <= 5;
              const isOutOfStock = p.stock === 0;

              return (
                <div
                  key={p.id}
                  className={`p-3 border rounded-xl flex justify-between items-center transition ${
                    isOutOfStock
                      ? "bg-rose-50/60 border-rose-200"
                      : isLowStock
                      ? "bg-amber-50/60 border-amber-200"
                      : "bg-neutral-50 border-neutral-200"
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs md:text-sm text-neutral-800 flex items-center gap-1.5">
                      {p.name}
                      {isOutOfStock && (
                        <span className="bg-rose-600 text-white text-[9px] px-1.5 py-0.2 rounded font-medium">
                          完売
                        </span>
                      )}
                      {isLowStock && (
                        <span className="bg-amber-600 text-white text-[9px] px-1.5 py-0.2 rounded font-medium">
                          残りわずか
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">
                      単価: {p.currentPrice}円
                    </div>
                  </div>

                  <div className="text-right">
                    {editingStockId === p.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={tempStock}
                          onChange={(e) => setTempStock(Number(e.target.value))}
                          className="w-16 p-1 border rounded text-right text-xs font-bold bg-white"
                          min="0"
                        />
                        <button
                          onClick={() => handleStockSave(p.id)}
                          className="bg-neutral-900 text-white text-[10px] px-2 py-1 rounded"
                        >
                          確定
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span
                            className={`font-extrabold text-base md:text-lg ${
                              isOutOfStock
                                ? "text-rose-600"
                                : isLowStock
                                ? "text-amber-700"
                                : "text-neutral-900"
                            }`}
                          >
                            {p.stock}
                          </span>
                          <span className="text-[10px] text-neutral-500 ml-0.5">
                            個
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setEditingStockId(p.id);
                            setTempStock(p.stock);
                          }}
                          className="text-[10px] bg-white border border-neutral-200 px-2 py-1 rounded text-neutral-600 hover:bg-neutral-100 transition"
                        >
                          変更
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 📊 グラフエリア */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
          <div className="md:col-span-7 bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-3">
            <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              時間帯別売上推移
            </h2>
            {hourlyChartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-neutral-400">
                売上データがまだありません
              </div>
            ) : (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyChartData}>
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={40} />
                    <Tooltip
                      formatter={(val: any) => [`${Number(val).toLocaleString()}円`, "売上"]}
                      contentStyle={{ fontSize: "12px", borderRadius: "8px" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#171717"
                      fill="#e5e5e5"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="md:col-span-5 bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-3">
            <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              商品別販売個数シェア
            </h2>
            {productPieData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-neutral-400">
                データがありません
              </div>
            ) : (
              <div className="h-48 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={productPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      label={({ name, value }) => `${name}:${value}`}
                    >
                      {productPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* 目標達成進捗 */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs text-neutral-500 font-medium">
            <div className="flex items-center gap-2">
              <span className="font-bold text-neutral-800">目標達成率</span>
              <span className="text-sm font-extrabold text-neutral-900">
                {progressPercent}%
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span>目標額:</span>
              <input
                type="number"
                value={targetAmount}
                onChange={(e) => updateTargetAmount(Number(e.target.value))}
                className="text-xs w-24 p-1 border rounded bg-neutral-50 text-right font-medium"
                step="5000"
              />
              <span>円</span>
            </div>
          </div>
          <div className="w-full bg-neutral-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* 現金実査 */}
        <div className="bg-white p-5 md:p-6 rounded-xl border border-neutral-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
            <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              現金点検・点検結果
            </h2>
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
              <div
                key={denom}
                className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 text-center"
              >
                <div className="text-[11px] text-neutral-500 mb-1 font-medium">
                  {denom >= 1000 ? `${denom / 1000}千円` : `${denom}円`}
                </div>
                <input
                  type="number"
                  min="0"
                  value={counts[denom] || ""}
                  onChange={(e) => handleCountChange(denom, Number(e.target.value))}
                  placeholder="0"
                  className="w-full p-1 border rounded text-center font-bold text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400 bg-white"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-100">
              <div className="text-xs text-neutral-500">理論上のレジ内現金</div>
              <div className="text-lg font-bold text-neutral-800">
                {expectedCashInRegister.toLocaleString()} 円
              </div>
            </div>

            <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-100">
              <div className="text-xs text-neutral-500">実際のレジ内現金</div>
              <div className="text-lg font-bold text-neutral-800">
                {actualCashInRegister.toLocaleString()} 円
              </div>
            </div>

            <div
              className={`p-3 rounded-lg border ${
                cashDifference === 0
                  ? "bg-emerald-50/50 border-emerald-200 text-emerald-800"
                  : cashDifference > 0
                  ? "bg-amber-50/50 border-amber-200 text-amber-800"
                  : "bg-rose-50/50 border-rose-200 text-rose-800"
              }`}
            >
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

        {/* 価格・タイムセール管理 */}
        <div className="bg-white p-5 md:p-6 rounded-xl border border-neutral-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              価格・タイムセール管理
            </h2>
            <button
              onClick={() => toggleTimeSale(!isTimeSale)}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs transition ${
                isTimeSale
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-neutral-900 hover:bg-neutral-800 text-white"
              }`}
            >
              {isTimeSale ? "タイムセール解除" : "全品100円引き開始"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.map((p) => (
              <div
                key={p.id}
                className="p-3 border border-neutral-200 rounded-lg bg-neutral-50 flex justify-between items-center"
              >
                <div>
                  <div className="font-bold text-xs md:text-sm text-neutral-800">
                    {p.name}
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    定価: {p.basePrice}円
                  </div>
                </div>
                <div className="text-right">
                  {editingPriceId === p.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={tempPrice}
                        onChange={(e) => setTempPrice(Number(e.target.value))}
                        className="w-16 p-1 border rounded text-right text-xs font-bold bg-white"
                      />
                      <button
                        onClick={() => handlePriceSave(p.id)}
                        className="bg-neutral-900 text-white text-[10px] px-2 py-1 rounded"
                      >
                        保存
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-neutral-900">
                        {p.currentPrice}円
                      </span>
                      <button
                        onClick={() => {
                          setEditingPriceId(p.id);
                          setTempPrice(p.currentPrice);
                        }}
                        className="text-[10px] bg-white border border-neutral-200 px-2 py-0.5 rounded text-neutral-600"
                      >
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
              <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                注文履歴・クラウド同期
              </h2>
              <div className="text-xs text-neutral-500 mt-0.5">
                未同期データ:{" "}
                <span className="font-bold text-neutral-800">{unsentCount} 件</span>
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
                    <td colSpan={8} className="p-4 text-center text-neutral-400">
                      注文履歴はありません
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr
                      key={o.orderId}
                      className={
                        o.status === "CANCELLED"
                          ? "bg-neutral-50 text-neutral-400 line-through"
                          : ""
                      }
                    >
                      <td className="p-2.5 font-bold text-neutral-800">
                        #{o.orderNumber}
                      </td>
                      <td className="p-2.5 text-[11px] text-neutral-400">
                        {new Date(o.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="p-2.5">{o.staffName}</td>
                      <td className="p-2.5 text-xs">
                        {o.items.map((i: any) => `${i.name}×${i.quantity}`).join(", ")}
                      </td>
                      <td className="p-2.5 text-right font-bold text-neutral-800">
                        {o.totalAmount.toLocaleString()}円
                      </td>
                      <td className="p-2.5 text-center">
                        {o.status === "COMPLETED" ? (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium border border-emerald-200">
                            完了
                          </span>
                        ) : (
                          <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded font-medium border border-rose-200">
                            取消
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        {o.synced ? (
                          <span className="text-[10px] text-neutral-500">同期済</span>
                        ) : (
                          <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-medium border border-amber-200">
                            未送信
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        {/* ② 「返金・取消」ボタンの変更 */}
                        {o.status === "COMPLETED" && (
                          <button
                            onClick={() => setCancelingOrder(o)}
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

      {/* ③ 返金選択ダイアログ */}
      {cancelingOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-neutral-900 border-b pb-2">
              注文 #{cancelingOrder.orderNumber} の取消処理
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              この注文をキャンセル（返金）します。<br />
              商品の状態に合わせて、在庫数をどのように戻すか選択してください。
            </p>

            <div className="bg-neutral-50 p-3 rounded-lg text-xs space-y-1 text-neutral-700">
              <div className="font-bold">対象商品:</div>
              {cancelingOrder.items.map((item: any) => (
                <div key={item.id || item.name} className="flex justify-between">
                  <span>{item.name}</span>
                  <span>× {item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  cancelOrder(cancelingOrder.orderId, true);
                  setCancelingOrder(null);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-lg transition"
              >
                在庫に戻して返金（再販売可能）
              </button>

              <button
                onClick={() => {
                  cancelOrder(cancelingOrder.orderId, false);
                  setCancelingOrder(null);
                }}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2.5 rounded-lg transition"
              >
                在庫に戻さずに返金（廃棄・破損など）
              </button>

              <button
                onClick={() => setCancelingOrder(null)}
                className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-medium text-xs py-2 rounded-lg transition mt-1"
              >
                モーダルを閉じる（中断）
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}