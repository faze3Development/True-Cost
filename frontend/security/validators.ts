const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const normalizeId = (id: string | number | null | undefined): string | null => {
  if (id === null || id === undefined) return null;
  const value = String(id).trim();
  if (value === "" || value === "undefined" || value === "null") return null;
  return value;
};

export const isValidEntityId = (id: string | number | null | undefined): boolean => {
  const value = normalizeId(id);
  if (!value) return false;

  if (UUID_REGEX.test(value)) return true;

  // Back-compat for any remaining numeric IDs.
  return !Number.isNaN(Number(value));
};

export const isValidPropertyId = (propertyId: string | number | null | undefined): boolean => {
  const value = normalizeId(propertyId);
  if (!value) return false;
  return UUID_REGEX.test(value);
};

export const isValidUnitId = (unitId: string | number | null | undefined): boolean => {
  const value = normalizeId(unitId);
  if (!value) return false;
  return UUID_REGEX.test(value);
};
