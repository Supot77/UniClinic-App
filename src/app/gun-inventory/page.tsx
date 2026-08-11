"use client";

import React, { useState } from "react";

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const inventoryItems = [
    { id: 1, name: "Amoxicillin 500mg", type: "ยาเม็ด (Tablet)", category: "ยาปฏิชีวนะ", stock: 1200, minStock: 200, expiry: "12/2027", status: "มีเพียงพอ" },
    { id: 2, name: "Paracetamol 500mg", type: "ยาเม็ด (Tablet)", category: "ยาลดไข้", stock: 5000, minStock: 500, expiry: "09/2028", status: "มีเพียงพอ" },
    { id: 3, name: "CPM 4mg (Chlorpheniramine)", type: "ยาเม็ด (Tablet)", category: "ยาแก้แพ้", stock: 150, minStock: 300, expiry: "05/2027", status: "ต้องสั่งเพิ่ม" },
    { id: 4, name: "Ibuprofen 400mg", type: "ยาเม็ด (Tablet)", category: "ยาแก้ปวดลดอักเสบ", stock: 80, minStock: 200, expiry: "11/2026", status: "วิกฤตใกล้หมด" },
    { id: 5, name: "Cough Syrup 60ml", type: "ยาน้ำ (Syrup)", category: "ยาแก้ไอขับเสมหะ", stock: 450, minStock: 100, expiry: "02/2027", status: "มีเพียงพอ" }
  ];

  const filteredItems = inventoryItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-[85vh] bg-[#f5f5f7] py-16 px-6 flex flex-col items-center">
      <div className="w-full max-w-[980px] space-y-12">
        {/* Editorial Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-4 border-b border-zinc-200/60">
          <div className="space-y-2">
            <p className="text-[12px] font-bold uppercase tracking-wider text-zinc-500">ระบบควบคุมสต็อกเวชภัณฑ์และคลังยา</p>
            <h1 className="text-3xl md:text-[40px] font-semibold text-[#1d1d1f] tracking-tight leading-[1.1] apple-tight-headline">
              การจัดการคลังยา (Inventory).
            </h1>
          </div>
          <button className="apple-btn-active bg-[#0066cc] text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-[#0071e3] transition shadow-sm">
            + นำเข้าเวชภัณฑ์ใหม่
          </button>
        </div>

        {/* Apple Style Search Input (rounded.pill, height 44px) */}
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-4 flex items-center text-zinc-400 text-sm pointer-events-none">
            🔍
          </span>
          <input 
            type="text" 
            placeholder="ค้นหาชื่อเวชภัณฑ์ หรือหมวดหมู่ยา..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-11 pr-5 rounded-full border border-zinc-200 bg-white text-sm text-[#1d1d1f] placeholder-zinc-400 outline-none transition focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]"
          />
        </div>

        {/* Table Container Card (rounded.lg: 18px) */}
        <div className="bg-white border border-[#e0e0e0] rounded-[18px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-100 bg-[#fafafc] text-zinc-450 font-bold uppercase tracking-wider">
                  <th className="p-4 pl-6 text-zinc-500">ชื่อเวชภัณฑ์</th>
                  <th className="p-4 text-zinc-500">หมวดหมู่</th>
                  <th className="p-4 text-zinc-500">จำนวนคงเหลือ (ยอดขั้นต่ำ)</th>
                  <th className="p-4 text-zinc-500">วันหมดอายุ</th>
                  <th className="p-4 pr-6 text-right text-zinc-500">สถานะสต็อก</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-normal">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50 transition">
                    <td className="p-4 pl-6">
                      <div className="font-bold text-[#1d1d1f]">{item.name}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">{item.type}</div>
                    </td>
                    <td className="p-4 text-zinc-650">{item.category}</td>
                    <td className="p-4 font-mono">
                      <span className="font-bold text-[#1d1d1f]">{item.stock}</span> 
                      <span className="text-[10px] text-zinc-400 font-sans ml-1">({item.minStock} min)</span>
                    </td>
                    <td className="p-4 text-zinc-600 font-mono">{item.expiry}</td>
                    <td className="p-4 pr-6 text-right">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${
                        item.status === "มีเพียงพอ" && "bg-emerald-500/10 text-emerald-600"
                      } ${
                        item.status === "ต้องสั่งเพิ่ม" && "bg-amber-500/10 text-amber-600"
                      } ${
                        item.status === "วิกฤตใกล้หมด" && "bg-rose-500/10 text-rose-600"
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

        {/* Developer Attribution Card */}
        <div className="rounded-[18px] bg-white border border-[#e0e0e0] p-6 text-center">
          <p className="text-[10px] text-zinc-500 leading-relaxed font-normal">
            📦 <span className="font-semibold text-[#0066cc]">ผู้พัฒนาคนที่ 4 (Gun):</span> ระบบจัดการฐานข้อมูลยา คลังยา และระบบควบคุมสต็อกเวชภัณฑ์ (Drug Database & Inventory)
          </p>
        </div>
      </div>
    </div>
  );
}
