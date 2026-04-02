export const isValidEntityId = (id: string | number | null | undefined): boolean => {
  if (id === null || id === undefined) return false;
  const idString = String(id).trim();
  if (idString === "" || idString === "undefined" || idString === "null") return false;
  return !Number.isNaN(Number(idString));
};

export const isValidPropertyId = (propertyId: string | number | null | undefined): boolean => {
  return isValidEntityId(propertyId);
};

export const isValidUnitId = (unitId: string | number | null | undefined): boolean => {
  return isValidEntityId(unitId);
};
