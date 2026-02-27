"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";

function TranslateWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedLang, setSelectedLang] = useState("en");
    const { changeLanguage: syncLanguage } = useLanguage();

    useEffect(() => {
        // Prevent duplicate script loading
        if (!document.querySelector('script[src*="translate.google.com"]')) {
            const addScript = document.createElement("script");
            addScript.src =
                "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
            document.body.appendChild(addScript);
        }

        window.googleTranslateElementInit = () => {
            new window.google.translate.TranslateElement(
                {
                    pageLanguage: "en",
                    includedLanguages: "hi,mr,ta,bn,gu,ml,te,kn,pa",
                    layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
                    autoDisplay: false,
                },
                "google_translate_element"
            );
        };

        // ✅ Check cookies AND hash on load to set initial language
        const getCookie = (name) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
            return null;
        };

        const googtransCookie = getCookie('googtrans');
        const hash = window.location.hash;

        if (googtransCookie && googtransCookie !== '/en/en') {
            // Cookie format: /en/hi (from/to)
            const langMatch = googtransCookie.match(/\/en\/(\w+)/);
            if (langMatch) {
                setSelectedLang(langMatch[1]);
            }
        } else if (hash.includes("googtrans")) {
            const match = hash.match(/googtrans\(en\|(\w+)\)/);
            if (match) {
                setSelectedLang(match[1]);
            }
        } else {
            setSelectedLang("en");
        }
    }, []);

    const languages = {
        en: { name: "English", native: "English" },
        hi: { name: "Hindi", native: "हिन्दी" },
        mr: { name: "Marathi", native: "मराठी" },
        ta: { name: "Tamil", native: "தமிழ்" },
        te: { name: "Telugu", native: "తెలుగు" },
        kn: { name: "Kannada", native: "ಕನ್ನಡ" },
        bn: { name: "Bengali", native: "বাংলা" },
        gu: { name: "Gujarati", native: "ગુજરાતી" },
        pa: { name: "Punjabi", native: "ਪੰਜਾਬੀ" },
    };

    const changeLanguage = (langCode) => {
        setSelectedLang(langCode);
        setIsOpen(false);
        syncLanguage(langCode);

        const domain = window.location.hostname;
        const now = new Date();
        const expires = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year

        if (langCode === "en") {
            // ✅ Clear ALL translation cookies and hash
            document.cookie = `googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
            document.cookie = `googtrans=; path=/; domain=${domain}; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
            document.cookie = `googtrans=; path=/; domain=.${domain}; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;

            document.cookie = `googtrans=/en/en; path=/; expires=${expires.toUTCString()};`;
            document.cookie = `googtrans=/en/en; path=/; domain=${domain}; expires=${expires.toUTCString()};`;
            document.cookie = `googtrans=/en/en; path=/; domain=.${domain}; expires=${expires.toUTCString()};`;

            if (window.location.hash) {
                window.history.pushState("", document.title, window.location.pathname + window.location.search);
            }

            window.location.reload();
        } else {
            document.cookie = `googtrans=/en/${langCode}; path=/; expires=${expires.toUTCString()};`;
            document.cookie = `googtrans=/en/${langCode}; path=/; domain=${domain}; expires=${expires.toUTCString()};`;
            document.cookie = `googtrans=/en/${langCode}; path=/; domain=.${domain}; expires=${expires.toUTCString()};`;

            window.location.hash = `#googtrans(en|${langCode})`;

            window.location.reload();
        }
    };

    return (
        <div className="relative" translate="no">
            {/* ✅ Hidden Google Translate widget */}
            <div className="hidden">
                <div id="google_translate_element"></div>
            </div>

            {/* ✅ Custom dropdown button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-xl hover:border-emerald-400 hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-50"
            >
                <svg
                    className="w-4 h-4 text-emerald-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                    />
                </svg>
                <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">
                    {languages[selectedLang]?.native || "English"}
                </span>
                <svg
                    className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
                        }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                    />
                </svg>
            </button>

            {/* ✅ Dropdown menu */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    ></div>

                    {/* Dropdown content */}
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-[1.5rem] shadow-2xl border border-gray-100 z-50 max-h-80 overflow-y-auto custom-scrollbar p-2">
                        {Object.entries(languages).map(([code, { name, native }]) => (
                            <button
                                key={code}
                                onClick={() => changeLanguage(code)}
                                className={`w-full text-left px-4 py-3 hover:bg-emerald-50 rounded-xl transition-colors duration-150 flex items-center justify-between group ${selectedLang === code ? "bg-emerald-50 text-emerald-600" : ""
                                    }`}
                            >
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-gray-900 group-hover:text-emerald-600">
                                        {native}
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{name}</span>
                                </div>
                                {selectedLang === code && (
                                    <svg
                                        className="w-4 h-4 text-emerald-500"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default TranslateWidget;
