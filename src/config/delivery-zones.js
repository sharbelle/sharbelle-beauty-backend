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

const normalizeAreaLga = (value = "") => value.trim().toLowerCase().replace(/\s+/g, " ");

const normalizedFeeMap = new Map(
  Object.entries(DELIVERY_FEES_BY_AREA).map(([areaLga, fee]) => [
    normalizeAreaLga(areaLga),
    fee,
  ]),
);

export const resolveDeliveryFeeByLga = (areaLga) => {
  const normalized = normalizeAreaLga(areaLga);
  if (!normalized) {
    return DEFAULT_DELIVERY_FEE;
  }

  return normalizedFeeMap.get(normalized) ?? DEFAULT_DELIVERY_FEE;
};

export const getDeliveryPricingConfig = () => ({
  origin: DELIVERY_PRICING_ORIGIN,
  defaultFee: DEFAULT_DELIVERY_FEE,
  areas: Object.entries(DELIVERY_FEES_BY_AREA)
    .map(([areaLga, fee]) => ({
      areaLga,
      fee,
    }))
    .sort((a, b) => a.areaLga.localeCompare(b.areaLga)),
});

