import { useEffect, useState } from "react";
import { demoSeed } from "../data/demoSeed";
import { ensureDemoSeed } from "../services/authService";
import { readStorage, subscribeToStorage } from "../services/storage";

// Reads the school data the login system uses (localStorage "appData"), so the
// admin and parent panels show the same records the rest of the app writes.
const read = () => ({ ...demoSeed, ...(readStorage("appData", null) || {}) });

export default function useSchoolData() {
  const [data, setData] = useState(read);

  useEffect(() => {
    ensureDemoSeed().then(() => setData(read()));
    return subscribeToStorage(() => setData(read()));
  }, []);

  return data;
}
