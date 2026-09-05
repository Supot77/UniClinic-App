'use client';

import React, { useState } from 'react';
import { 
  Bell, Check, Clock, AlertCircle, Pause, Pill, 
  Settings, History, XCircle, Activity, 
  ChevronRight, Mail, ShieldCheck, CalendarIcon, PillBottle 
} from 'lucide-react';

// Mock Data สำหรับทดสอบ
const medicationData = [
  { 
    id: 1, 
    name: 'Paracetamol (พาราเซตามอล)', 
    dose: '1 เม็ด หลังกินอาหาร', 
    time: '08:00', 
    status: 'taken', 
    takenAt: '08:05' 
  },
  { 
    id: 2, 
    name: 'Amoxicillin (ยาปฏิชีวนะ)', 
    dose: '1 แคปซูล ก่อนอาหาร', 
    time: '13:00', 
    status: 'pending' 
  },
  { 
    id: 3, 
    name: 'Vitamin B (วิตามินรวม)', 
    dose: '2 เม็ด', 
    time: '20:00', 
    status: 'pending', 
    isLastDose: true 
  },
];

export default function RemindersPage() {
  const [emailPause, setEmailPause] = useState('none');

  // Data สำหรับหลอดยา (วัฏจักร 7 วัน)
  const cycleTotal = 7;
  const cycleCompleted = 5; 
  const cycleRemaining = cycleTotal - cycleCompleted;
  const percentage = (cycleCompleted / cycleTotal) * 100;

  return (
    <div className="min-h-screen bg-zinc-50 pb-10 font-sans text-zinc-900">
      
      {/* --- ส่วนหัว (Header) --- */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <Activity size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">UniClinic-App</h1>
              <p className="text-xs text-zinc-500 font-medium">ระบบแจ้งเตือนและจัดการยา</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-zinc-700">สวัสดี, คุณสมชาย 👤</span>
          </div>
        </div>
      </header>

      {/* --- เนื้อหาหลัก (Main Grid) --- */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* ========================================== */}
          {/* คอลัมน์ที่ 1: Dashboard & Stats (ซ้าย)      */}
          {/* ========================================== */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Card: Compliance (เปลี่ยนเป็นหลอดแนวนอน) */}
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
              <div className="flex items-center justify-between mb-4 text-zinc-700">
                 <h2 className="font-bold text-sm">ความสม่ำเสมอ (วัฏจักรยา)</h2>
                 <PillBottle size={18} className="text-blue-600" />
              </div>

              {/* --- หลอดแนวนอน (Horizontal Bar) --- */}
              <div className="mb-4">
                {/* Progress Bar */}
                <div className="relative w-full bg-zinc-100 rounded-full h-4 mb-2">
                  <div 
                    className="bg-blue-600 h-4 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                    style={{ width: `${percentage}%` }}
                  ></div>
                  
                  {/* Marker (ถ้าต้องการ) */}
                  <div className="absolute top-1/2 -translate-y-1/2 right-0 w-1 h-6 bg-zinc-300 rounded-full"></div>
                </div>
                
                {/* Percentage Text */}
                <div className="flex justify-between items-end text-xs">
                  <span className="text-zinc-400 font-medium">ความคืบหน้า</span>
                  <span className="font-bold text-zinc-800">{percentage}%</span>
                </div>
              </div>

              <hr className="border-zinc-100 my-4" />

              {/* รายละเอียดวัน */}
              <div className="flex items-center justify-between text-center">
                 <div className="flex flex-col">
                    <span className="text-xs text-zinc-400">กินยาไป</span>
                    <span className="text-lg font-bold text-green-600 leading-none">{cycleCompleted}<span className="text-xs text-zinc-500 ml-1">วัน</span></span>
                 </div>

                 <div className="h-8 w-[1px] bg-zinc-200"></div>

                 <div className="flex flex-col">
                    <span className="text-xs text-zinc-400">เหลืออีก</span>
                    <span className="text-lg font-bold text-orange-500 leading-none">{cycleRemaining}<span className="text-xs text-zinc-500 ml-1">วัน</span></span>
                 </div>
              </div>
              
              <div className="mt-4 bg-blue-50 p-3 rounded-lg flex items-start gap-2">
                <Check size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-blue-800 leading-tight">
                  การกินยาต่อเนื่องช่วยเพิ่มประสิทธิภาพการรักษา คุณทำได้ดีมาก!
                </p>
              </div>
            </div>

            {/* Card: History & Links */}
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-5">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">เมนูอื่นๆ</h3>
              <div className="space-y-2">
                <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 transition text-left group">
                  <div className="flex items-center gap-3">
                    <div className="bg-zinc-100 p-2 rounded-lg group-hover:bg-blue-100 group-hover:text-blue-600 transition">
                      <History size={18} />
                    </div>
                    <span className="font-medium text-zinc-700 text-sm">ประวัติการกินยา</span>
                  </div>
                  <ChevronRight size={16} className="text-zinc-400" />
                </button>
                
                <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 transition text-left group">
                  <div className="flex items-center gap-3">
                    <div className="bg-zinc-100 p-2 rounded-lg group-hover:bg-blue-100 group-hover:text-blue-600 transition">
                      <CalendarIcon size={18} />
                    </div>
                    <span className="font-medium text-zinc-700 text-sm">ตารางนัดแพทย์</span>
                  </div>
                  <ChevronRight size={16} className="text-zinc-400" />
                </button>
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* คอลัมน์ที่ 2: Timeline (ตรงกลาง)           */}
          {/* ========================================== */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center justify-between mb-2">
               <h2 className="text-lg font-bold text-zinc-800 flex items-center gap-2">
                 <CalendarIcon className="text-blue-600"/>
                 ตารางยารับประทานวันนี้
               </h2>
               <span className="text-sm text-zinc-500 bg-white px-3 py-1 rounded-full border border-zinc-200 shadow-sm">
                 05 ก.ย. 2026
               </span>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
               <div className="p-6 min-h-[500px] relative pl-12">
                  {/* Vertical Timeline Line */}
                  <div className="absolute left-[35px] top-0 bottom-0 w-0.5 bg-zinc-200 border-l border-zinc-200 border-dashed"></div>

                  <div className="space-y-8 relative">
                    {medicationData.map((med, index) => (
                      <div key={med.id} className="relative group">
                        {/* Time & Dot */}
                        <div className="absolute left-[-35px] top-1 flex flex-col items-center">
                           <span className="text-sm font-bold text-zinc-800 bg-white z-10 px-2">{med.time}</span>
                           <div className={`w-3 h-3 rounded-full mt-1 ring-4 ring-zinc-50 z-0 ${
                             med.status === 'taken' ? 'bg-green-500' : 
                             med.status === 'missed' ? 'bg-red-500' : 'bg-zinc-300 group-hover:bg-blue-500'
                           }`}></div>
                        </div>

                        {/* Card Content */}
                        <div className={`p-5 rounded-xl border transition-all duration-300 hover:shadow-md
                          ${med.status === 'taken' ? 'bg-green-50/50 border-green-100' : 
                            med.isLastDose ? 'bg-purple-50/50 border-purple-100' : 'bg-white border-zinc-200'}
                        `}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            
                            <div className="flex items-start gap-3">
                              <div className={`p-2.5 rounded-lg 
                                ${med.status === 'taken' ? 'bg-green-100 text-green-600' : 'bg-zinc-100 text-zinc-500'}`}>
                                <Pill size={20} />
                              </div>
                              <div>
                                <h4 className="font-bold text-zinc-900">{med.name}</h4>
                                <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                                  <Clock size={12} /> {med.dose}
                                </p>
                                {med.status === 'taken' && (
                                  <span className="text-xs font-bold text-green-600 mt-1 inline-block">✅ กินยาแล้ว (เวลา {med.takenAt})</span>
                                )}
                              </div>
                            </div>

                            {/* Action Button */}
                            <div className="flex flex-col gap-2 sm:items-end">
                               {med.status === 'pending' ? (
                                 <button className="bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-md shadow-zinc-200">
                                   ยืนยันทานยา
                                 </button>
                               ) : (
                                 <button className="bg-zinc-100 hover:bg-zinc-200 text-zinc-500 px-4 py-2 rounded-lg text-sm font-medium transition">
                                   แก้ไข
                                 </button>
                               )}
                               {med.isLastDose && med.status === 'pending' && (
                                  <span className="text-[10px] text-purple-600 font-medium flex items-center gap-1">
                                    <Bell size={10}/> บ่ายสุดท้ายก่อนปิดระบบ 23:30
                                  </span>
                               )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="mt-10 pt-6 border-t border-zinc-100 flex flex-wrap gap-4 text-xs text-zinc-500">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div> Taken</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div> Missed (+1 ชม.)</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Missed (+3 ชม.)</div>
                  </div>
               </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* คอลัมน์ที่ 3: Settings (ขวา)                */}
          {/* ========================================== */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Email Settings */}
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
              <div className="flex items-center gap-2 mb-4 text-zinc-700">
                <Bell size={18} className="text-blue-600" />
                <h2 className="font-bold text-sm">ตั้งค่าการแจ้งเตือน</h2>
              </div>

              {/* Web Toggle */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-zinc-600">แสดง Pop-up บนเว็บ</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight">แจ้งเตือนเมื่อเปิดแอปพลิเคชัน</p>
              </div>

              <hr className="border-zinc-100 my-4" />

              {/* Email Pause */}
              <div>
                <label className="text-xs font-bold text-zinc-700 flex items-center gap-1 mb-3">
                  <Mail size={12}/> พัก Email ชั่วคราว
                </label>
                <div className="space-y-3">
                   {['none', '1', '8', '24'].map((opt) => (
                     <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                       <div className="relative flex items-center">
                          <input 
                            type="radio" 
                            name="pause" 
                            value={opt} 
                            checked={emailPause === opt} 
                            onChange={() => setEmailPause(opt)}
                            className="peer h-4 w-4 cursor-pointer appearance-none rounded-full border border-zinc-300 text-blue-600 focus:ring-2 focus:ring-blue-100 checked:border-blue-600 checked:bg-blue-600" 
                          />
                          <div className="absolute opacity-0 peer-checked:opacity-100 w-1.5 h-1.5 bg-white rounded-full pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
                       </div>
                       <span className={`text-xs ${emailPause === opt ? 'font-bold text-zinc-900' : 'text-zinc-500 group-hover:text-zinc-700'}`}>
                         {opt === 'none' ? 'ไม่หยุดพัก' : `${opt} ชั่วโมง`}
                       </span>
                     </label>
                   ))}
                </div>
                <p className="text-[10px] text-zinc-400 mt-2 italic">*ผลเฉพาะ Email ไม่กระทบบนเว็บ</p>
              </div>
            </div>

            {/* Disabled Schedule (Optional) */}
            <div className="bg-zinc-100 rounded-2xl border border-zinc-200 border-dashed p-6 opacity-75">
               <h3 className="text-xs font-bold text-zinc-500 mb-2 uppercase">จัดการตารางยา</h3>
               <p className="text-xs text-zinc-400 mb-3">กรุณาเพิ่มยาที่หน้า &ldquo;ประวัติยา&rdquo;</p>
               <button disabled className="w-full py-2 bg-zinc-200 text-zinc-400 rounded-lg text-xs font-medium cursor-not-allowed">
                 เพิ่มยา (ปิดใช้งาน)
               </button>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
