import type { Dispatch, SetStateAction } from 'react';
import { Loader2, X } from 'lucide-react';

type ServiceDraft = { code: string; name: string; description: string };

type Props = {
  editingServiceId: string | null;
  serviceDraft: ServiceDraft;
  setServiceDraft: Dispatch<SetStateAction<ServiceDraft>>;
  serviceFormError: string;
  serviceIsSaving: boolean;
  inputClass: string;
  closeServiceForm: () => void;
  saveService: () => void;
};

export function ServiceDialog(props: Props) {
  const {
    editingServiceId, serviceDraft, setServiceDraft, serviceFormError,
    serviceIsSaving, inputClass, closeServiceForm, saveService,
  } = props;

  return (
    <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-form-title"
            onClick={(event) => { if (event.target === event.currentTarget) closeServiceForm(); }}
          >
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200/80">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-600">รายการบริการ</p>
               <h2 id="service-form-title" className="mt-1 text-xl font-bold text-slate-950">{editingServiceId ? 'แก้ไขบริการ' : 'เพิ่มบริการ'}</h2>
               <p className="mt-1 text-xs text-slate-500">บริการนี้จะใช้เปิดรับจองในวันที่และรอบตรวจที่กำหนด</p>
              </div>
              <button type="button" disabled={serviceIsSaving} onClick={closeServiceForm} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50" aria-label="ปิดแบบฟอร์มบริการ"><X className="h-5 w-5" aria-hidden="true" /></button>
            </div>
            <div className="space-y-4">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">รหัสบริการ<input className={inputClass} value={serviceDraft.code} onChange={(event) => setServiceDraft((current) => ({ ...current, code: event.target.value }))} placeholder="เช่น GEN-CONSULT" /></label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">ชื่อบริการ<input className={inputClass} value={serviceDraft.name} onChange={(event) => setServiceDraft((current) => ({ ...current, name: event.target.value }))} placeholder="เช่น ตรวจโรคทั่วไป" /></label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">คำอธิบาย<textarea rows={3} className={`${inputClass} h-auto py-3`} value={serviceDraft.description} onChange={(event) => setServiceDraft((current) => ({ ...current, description: event.target.value }))} /></label>
              {serviceFormError && <p className="text-sm font-medium text-rose-700" role="alert">{serviceFormError}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" disabled={serviceIsSaving} onClick={closeServiceForm} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50">ยกเลิก</button>
              <button type="button" disabled={serviceIsSaving} aria-busy={serviceIsSaving} onClick={saveService} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-ink px-5 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50">
                {serviceIsSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {serviceIsSaving ? 'กำลังบันทึก…' : 'บันทึกบริการ'}
              </button>
            </div>
          </div>
          </div>
  );
}
