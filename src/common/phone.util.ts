
export function normalizeBrazilPhoneDigits(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits.startsWith('55') || digits.length < 12) {
    return digits;
  }
  if (digits.length === 12 && /^55\d{10}$/.test(digits)) {
    const afterDdd = digits.slice(4);
    if (afterDdd.length === 8 && !afterDdd.startsWith('9')) {
      return `${digits.slice(0, 4)}9${afterDdd}`;
    }
  }
  return digits;
}

export function legacyBrazilMobileWithoutNine(canonical: string): string | null {
  if (canonical.length !== 13 || !canonical.startsWith('55')) {
    return null;
  }
  const afterDdd = canonical.slice(4);
  if (afterDdd.length === 9 && afterDdd.startsWith('9')) {
    return `${canonical.slice(0, 4)}${afterDdd.slice(1)}`;
  }
  return null;
}
