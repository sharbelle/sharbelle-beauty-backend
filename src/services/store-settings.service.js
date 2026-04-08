import { StoreSettingsModel } from "../models/store-settings.model.js";

const SETTINGS_SINGLETON_KEY = "store_settings";
const DEFAULT_PLAYLIST_URL = "https://open.spotify.com";

const toSettingsPayload = (settings) => ({
  playlistUrl: settings.playlistUrl || DEFAULT_PLAYLIST_URL,
  updatedAt: settings.updatedAt,
});

const ensureStoreSettings = async () => {
  const settings = await StoreSettingsModel.findOneAndUpdate(
    { singletonKey: SETTINGS_SINGLETON_KEY },
    {
      $setOnInsert: {
        singletonKey: SETTINGS_SINGLETON_KEY,
        playlistUrl: DEFAULT_PLAYLIST_URL,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  return settings;
};

export const getStoreSettings = async () => {
  const settings = await ensureStoreSettings();
  return toSettingsPayload(settings);
};

export const updateStoreSettings = async (payload) => {
  const playlistUrl = payload.playlistUrl.trim();

  const settings = await StoreSettingsModel.findOneAndUpdate(
    { singletonKey: SETTINGS_SINGLETON_KEY },
    {
      $set: {
        playlistUrl,
      },
      $setOnInsert: {
        singletonKey: SETTINGS_SINGLETON_KEY,
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
