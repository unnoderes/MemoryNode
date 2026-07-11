"use client";

import { useEffect, useState } from "react";

const EVENT = "memorynode-language-change";

export function useLanguage() {
  const [language, setCurrent] = useState("zh");

  useEffect(() => {
    const saved = localStorage.getItem("memorynode-language");
    if (saved === "en") setCurrent("en");
    document.documentElement.lang = saved === "en" ? "en" : "zh-CN";

    const sync = (event) => setCurrent(event.detail);
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  function setLanguage(next) {
    localStorage.setItem("memorynode-language", next);
    document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  }

  return { language, setLanguage, t: (zh, en) => language === "zh" ? zh : en };
}
