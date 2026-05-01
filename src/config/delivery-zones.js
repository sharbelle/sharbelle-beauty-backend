export const DELIVERY_PRICING_ORIGIN = "Yaba, Lagos";
export const DEFAULT_DELIVERY_FEE = 3000;

const DELIVERY_FEES_BY_AREA = Object.freeze({
  Yaba: 1500,
  "Lagos Mainland": 1700,
  Surulere: 1800,
  Somolu: 1800,
  Mushin: 1900,
  "Lagos Island": 2200,
  "Eti-Osa": 2300,
  Lekki: 2500,
  Ajah: 2800,
  Ikoyi: 2300,
  Ikeja: 2400,
  "Maryland-Ikeja": 2300,
  Ogudu: 2300,
  Ketu: 2300,
  "Gbagada": 2100,
  "Magodo-Shangisha": 2500,
  "Oshodi-Isolo": 2500,
  "Amuwo-Odofin": 2800,
  "Alimosho": 3000,
  "Agege": 2700,
  Ifako: 2800,
  Ikorodu: 3500,
});

export const normalizeAreaLga = (value = "") => value.trim().toLowerCase().replace(/\s+/g, " ");

const toSortedAreas = (areas = []) =>
  [...areas].sort((a, b) => a.areaLga.localeCompare(b.areaLga));

const FALLBACK_AREAS = toSortedAreas(
  Object.entries(DELIVERY_FEES_BY_AREA).map(([areaLga, fee]) => ({
    areaLga,
    fee,
  })),
);

export const getDeliveryPricingConfig = () => ({
  origin: DELIVERY_PRICING_ORIGIN,
  defaultFee: DEFAULT_DELIVERY_FEE,
  areas: FALLBACK_AREAS.map((entry) => ({
    areaLga: entry.areaLga,
    fee: entry.fee,
  })),
});

export const normalizeDeliveryPricingConfig = (value) => {
  const fallback = getDeliveryPricingConfig();
  const source = value && typeof value === "object" ? value : {};

  const origin =
    typeof source.origin === "string" && source.origin.trim()
      ? source.origin.trim()
      : fallback.origin;

  const defaultFeeCandidate = Number(source.defaultFee);
  const defaultFee =
    Number.isFinite(defaultFeeCandidate) && defaultFeeCandidate >= 0
      ? Math.round(defaultFeeCandidate)
      : fallback.defaultFee;

  const seen = new Set();
  const normalizedAreas = [];
  const sourceAreas = Array.isArray(source.areas) ? source.areas : fallback.areas;

  for (const area of sourceAreas) {
    if (!area || typeof area !== "object") {
      continue;
    }

    const areaLga = typeof area.areaLga === "string" ? area.areaLga.trim() : "";
    const normalizedKey = normalizeAreaLga(areaLga);

    if (!areaLga || !normalizedKey || seen.has(normalizedKey)) {
      continue;
    }

    const feeCandidate = Number(area.fee);
    const fee =
      Number.isFinite(feeCandidate) && feeCandidate >= 0
        ? Math.round(feeCandidate)
        : defaultFee;

    seen.add(normalizedKey);
    normalizedAreas.push({
      areaLga,
      fee,
    });
  }

  return {
    origin,
    defaultFee,
    areas: normalizedAreas.length > 0 ? toSortedAreas(normalizedAreas) : fallback.areas,
  };
};

export const resolveDeliveryFeeByLga = (areaLga, deliveryPricing) => {
  const normalizedArea = normalizeAreaLga(areaLga);
  const config = normalizeDeliveryPricingConfig(deliveryPricing);

  if (!normalizedArea) {
    return config.defaultFee;
  }

  const match = config.areas.find((entry) => normalizeAreaLga(entry.areaLga) === normalizedArea);
  return match?.fee ?? config.defaultFee;
};
