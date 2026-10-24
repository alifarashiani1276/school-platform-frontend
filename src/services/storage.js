export const STORAGE_PREFIX = "school:";

export const getStorageKey = (key) => `${STORAGE_PREFIX}${key}`;

export const readStorage = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(getStorageKey(key));
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export const writeStorage = (key, value) => {
  localStorage.setItem(getStorageKey(key), JSON.stringify(value));
  const event = new Event("school:storage");
  window.dispatchEvent(event);
};

export const clearStorage = (key) => {
  localStorage.removeItem(getStorageKey(key));
  window.dispatchEvent(new Event("school:storage"));
};

export const subscribeToStorage = (callback) => {
  const onStorage = () => callback();
  const onBroadcast = () => callback();

  window.addEventListener("storage", onStorage);
  window.addEventListener("school:storage", onBroadcast);

  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("school:live");
    channel.onmessage = onBroadcast;
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("school:storage", onBroadcast);
      channel.close();
    };
  }

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("school:storage", onBroadcast);
  };
};
