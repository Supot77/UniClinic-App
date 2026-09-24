export const ALL_SERVICES_LABEL = 'ทุกบริการ';
export const ALL_SERVICES_FILTER_VALUE = 'all';

export function isAllServicesLabel(value: string | null | undefined): boolean {
  return value?.trim() === ALL_SERVICES_LABEL;
}
