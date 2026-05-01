import { StoreSettingsModel } from "../models/store-settings.model.js";
import {
  getDeliveryPricingConfig,
  normalizeDeliveryPricingConfig,
} from "../config/delivery-zones.js";

const SETTINGS_SINGLETON_KEY = "store_settings";
const DEFAULT_PLAYLIST_URL = "https://open.spotify.com";
const DEFAULT_DELIVERY_PRICING = getDeliveryPricingConfig();

const toSettingsPayload = (settings) => ({
  playlistUrl: settings.playlistUrl || DEFAULT_PLAYLIST_URL,
  deliveryPricing: normalizeDeliveryPricingConfig(settings.deliveryPricing),
  updatedAt: settings.updatedAt,
});

const toPlainDeliveryPricing = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value.toObject === "function") {
    return value.toObject();
  }

  return value;
};

const ensureStoreSettings = async () => {
  const settings = await StoreSettingsModel.findOneAndUpdate(
    { singletonKey: SETTINGS_SINGLETON_KEY },
    {
      $setOnInsert: {
        singletonKey: SETTINGS_SINGLETON_KEY,
        playlistUrl: DEFAULT_PLAYLIST_URL,
        deliveryPricing: DEFAULT_DELIVERY_PRICING,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  const normalizedDeliveryPricing = normalizeDeliveryPricingConfig(
    toPlainDeliveryPricing(settings.deliveryPricing),
  );
  const currentDeliveryPricing = toPlainDeliveryPricing(settings.deliveryPricing) || null;

  if (
    !currentDeliveryPricing ||
    JSON.stringify(currentDeliveryPricing) !== JSON.stringify(normalizedDeliveryPricing)
  ) {
    settings.deliveryPricing = normalizedDeliveryPricing;
    await settings.save();
  }

  return settings;
};

export const getStoreSettings = async () => {
  const settings = await ensureStoreSettings();
  return toSettingsPayload(settings);
};

export const updateStoreSettings = async (payload) => {
  const update = {};

  if (typeof payload.playlistUrl === "string") {
    update.playlistUrl = payload.playlistUrl.trim();
  }

  if (payload.deliveryPricing) {
    update.deliveryPricing = normalizeDeliveryPricingConfig(payload.deliveryPricing);
  }

  const settings = await StoreSettingsModel.findOneAndUpdate(
    { singletonKey: SETTINGS_SINGLETON_KEY },
    {
      $set: update,
      $setOnInsert: {
        singletonKey: SETTINGS_SINGLETON_KEY,
        playlistUrl: DEFAULT_PLAYLIST_URL,
        deliveryPricing: DEFAULT_DELIVERY_PRICING,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  return toSettingsPayload(settings);
};
