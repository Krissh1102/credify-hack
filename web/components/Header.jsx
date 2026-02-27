"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  PenBox,
  LayoutDashboard,
  Banknote,
  TrendingUp,
  BookOpen,
  Sun,
  Moon,
} from "lucide-react";
import { IconMenu2 } from "@tabler/icons-react";

const Header = ({ setOpen }) => {
  const { setTheme } = useTheme();

  // Google Translate script
  useEffect(() => {
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: "en,hi,mr,gu,ta", // your languages
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
        },
        "google_translate_element",
      );
    };

    const script = document.createElement("script");
    script.src =
      "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b h-17 dark:bg-black">
      <nav className="w-full h-full flex items-center justify-between px-4">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <button
            className="md:hidden"
            onClick={() => setOpen((prev) => !prev)}
          >
            <IconMenu2 size={24} />
          </button>
          <Link href="/">
            <Image
              src="/logo.png"
              alt="Logo"
              width={200}
              height={60}
              className="h-10 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4 ml-auto">
          <SignedIn>
            <Link href="/dashboard">
              <Button variant="outline" className="flex items-center gap-2">
                <LayoutDashboard size={18} />
                <span className="hidden md:inline">Dashboard</span>
              </Button>
            </Link>

            <Link href="/loan-overview">
              <Button variant="outline" className="flex items-center gap-2">
                <Banknote size={18} />
                <span className="hidden md:inline">Debt Section</span>
              </Button>
            </Link>

            <Link href="/investment-overview">
              <Button variant="outline" className="flex items-center gap-2">
                <TrendingUp size={18} />
                <span className="hidden md:inline">Saving & Investments</span>
              </Button>
            </Link>

            <Link href="/education">
              <Button variant="outline" className="flex items-center gap-2">
                <BookOpen size={18} />
                <span className="hidden md:inline">Learn Finance</span>
              </Button>
            </Link>

            <Link href="/transaction/create">
              <Button className="flex items-center gap-2">
                <PenBox size={18} />
                <span className="hidden md:inline">Add Transaction</span>
              </Button>
            </Link>
          </SignedIn>

          <SignedOut>
            <SignInButton forceRedirectUrl="/dashboard">
              <Button variant="outline">Login</Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10",
                },
              }}
            />
          </SignedIn>
        </div>
      </nav>
    </header>
  );
};

export default Header;
