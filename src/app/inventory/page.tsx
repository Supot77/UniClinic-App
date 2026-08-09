"use client";

import React, { useState } from "react";

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const inventoryItems = [
    { id: 1, name: "Amoxicillin 500mg", type: "ยาเม็ด", category: "ยาปฏิชีวนะ", stock: 1200, minStock: 200, expiry: "12/2027", status: "มีเพียงพอ" },
    { id: 2, name: "Paracetamol 500mg", type: "ยาเม็ด", category: "ยาลดไข้", stock: 5000, minStock: 500, expiry: "09/2028", status: "มีเพียงพอ" },
    { id: 3, name: "CPM 4mg (Chlorpheniramine)", type: "ยาเม็ด", category: "ยาแก้แพ้", stock: 150, minStock: 300, expiry: "05/2027", status: "ต้องสั่งเพิ่ม" },
    { id: 4, name: "Ibuprofen 400mg", type: "ยาเม็ด", category: "ยาแก้ปวดลดอักเสบ", stock: 80, minStock: 200, expiry: "11/2026", status: "วิกฤตใกล้หมด" },
    { id: 5, name: "Cough Syrup 60ml", type: "ยาน้ำ", category: "ยาแก้ไอขับเสมหะ", stock: 450, minStock: 100, expiry: "02/2027", status: "มีเพียงพอ" }
  ];

  const filteredItems = inventoryItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100 md:p-12">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">ระบบคลังเวชภัณฑ์และคลังยา (Inventory)</h1>
            <p className="mt-2 text-zinc-400">ควบคุมยอด ยาหมดอายุ และจัดการยอดขั้นต่ำสำหรับยาในสถานพยาบาล</p>
          </div>
          <button className="self-start rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500">
            + นำเข้าเวชภัณฑ์ใหม่
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input 
            type="text" 
            placeholder="ค้นหาชื่อยา หรือหมวดหมู่..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 px-5 py-3.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {/* Inventory Table */}
        <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/20 backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/45 text-zinc-400 font-medium">
                  <th className="p-4 pl-6">ชื่อเวชภัณฑ์</th>
                  <th className="p-4">หมวดหมู่</th>
                  <th className="p-4">จำนวนคงเหลือ</th>
                  <th className="p-4">วันหมดอายุ</th>
                  <th className="p-4 pr-6 text-right">สถานะคลัง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-900/25 transition">
                    <td className="p-4 pl-6">
                      <div className="font-semibold text-white">{item.name}</div>
                      <div className="text-xs text-zinc-500">{item.type}</div>
                    </td>
                    <td className="p-4 text-zinc-300">{item.category}</td>
                    <td className="p-4 font-mono font-medium text-zinc-200">
                      {item.stock} <span className="text-xs text-zinc-500">({item.minStock} min)</span>
                    </td>
                    <td className="p-4 text-zinc-400">{item.expiry}</td>
                    <td className="p-4 pr-6 text-right">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                        item.status === "มีเพียงพอ" && "bg-emerald-500/10 text-emerald-400"
                      } ${
                        item.status === "ต้องสั่งเพิ่ม" && "bg-amber-500/10 text-amber-400"
                      } ${
                        item.status === "วิกฤตใกล้หมด" && "bg-rose-500/10 text-rose-400"
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/20 p-5 text-center">
          <p className="text-[11px] text-zinc-500">
            📦 <span className="font-semibold text-cyan-400">คนที่ 6 กำลังพัฒนา:</span> ระบบตรวจเช็คคลังยา บันทึกการจ่ายยา และแจ้งเตือนยาหมดอายุ/ใกล้หมดสต็อก
          </p>
        </div>
      </div>
    </div>
  );
}
