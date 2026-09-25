/**
 * ตรวจสอบว่า string ที่ส่งเข้ามาเป็นรูปแบบ UUID หรือไม่
 */
export const isUuid = (val?: string | null): boolean =>
  typeof val === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

// คลาสสไตล์พื้นฐานสำหรับ Input และ Text Button แอ็กชัน
export const inputClass =
  'h-11 w-full min-w-0 rounded-lg border border-brand-border-strong bg-white px-3.5 text-sm text-brand-ink placeholder:text-brand-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong';

export const textActionClass =
  'inline-flex min-h-11 items-center gap-1.5 text-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:opacity-50 cursor-pointer';

/**
 * ฟังก์ชันจัดรูปแบบวันที่และเวลาแบบภาษาไทย (เช่น 22 ก.ย. 2569 15:14)
 */
export function formatDisplayDateTime(dateStr: string | null | undefined, locale: 'en' | 'th' = 'th'): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * ฟังก์ชันวิเคราะห์และระบุการใช้ยากับอาหารเริ่มต้นอัตโนมัติจากชื่อและคำอธิบายยา
 * (เช่น ยาลดกรด Omeprazole มักทานก่อนอาหาร, ยาแก้แพ้ Cetirizine มักทานก่อนนอน)
 */
export function getMealTimingForMed(
  name?: string | null,
  category?: string | null,
  description?: string | null
): string {
  const str = `${name || ''} ${category || ''} ${description || ''}`.toLowerCase();
  if (str.includes('omeprazole') || str.includes('ลดกรด') || str.includes('ก่อนอาหาร')) {
    return 'ก่อนอาหาร';
  }
  if (str.includes('cetirizine') || str.includes('loratadine') || str.includes('ก่อนนอน')) {
    return 'ก่อนนอน';
  }
  if (str.includes('พร้อมอาหาร')) {
    return 'พร้อมอาหาร';
  }
  return 'หลังอาหาร';
}
