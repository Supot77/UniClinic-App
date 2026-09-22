export interface ProfileNameFields {
  title?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export function formatProfileName(profile: ProfileNameFields | null | undefined): string {
  if (!profile) return '';

  return [profile.title, profile.first_name, profile.last_name]
    .map((part) => part?.trim() ?? '')
    .filter(Boolean)
    .join(' ');
}

export function getProfileInitial(profile: ProfileNameFields | null | undefined): string {
  return formatProfileName(profile).charAt(0) || '?';
}
