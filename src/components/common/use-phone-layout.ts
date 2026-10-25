"use client";

import { useEffect, useState } from "react";

// Match the phone-only CSS, including wide phones with Safari's toolbars visible.
export const phoneLayoutQuery = "(max-width: 767px), (max-width: 1024px) and (max-height: 500px)";

export function usePhoneLayout() {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(phoneLayoutQuery);
    const update = () => setPhone(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return phone;
}
