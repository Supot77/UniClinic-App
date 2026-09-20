import { redirect } from 'next/navigation';

interface PharmacyDynamicRedirectProps {
  params: Promise<{
    medicationId: string;
  }>;
}

export default async function PharmacyDynamicRedirectPage({
  params,
}: PharmacyDynamicRedirectProps) {
  const { medicationId } = await params;
  redirect(`/pharmacy/medications/${medicationId}`);
}

