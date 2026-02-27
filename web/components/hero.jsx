"use client";
import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, PlayCircle } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const FinanceHero = () => {
  return (
    <section className="bg-[#F6F9FC] py-20 sm:py-24 mt-15">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-[#0A2540] sm:text-5xl md:text-6xl">
          Financial Clarity in a Single View.
          <br />
          <span className="text-[#00D09C]">Take Control of Your Future.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-[#525F7F] md:text-xl">
          Connect all your accounts, track spending, monitor investments, and
          build wealth with confidence. All in one secure, intuitive platform.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="bg-[#0A2540] text-white shadow-md transition-all hover:scale-105 hover:bg-[#0A2540]/90"
          >
            <Link href="/dashboard">
              Get Started for Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-[#0A2540]/20 bg-white text-[#0A2540] shadow-sm transition-all hover:scale-105 hover:bg-white/60"
          >
            <Link href="/">
              <PlayCircle className="mr-2 h-5 w-5" />
              Take a Tour
            </Link>
          </Button>
        </div>

        <div className="relative mx-auto mt-16 max-w-4xl">
          <div className="absolute -inset-4 rounded-xl bg-gradient-to-r from-blue-200 to-green-200 opacity-20 blur-3xl"></div>
          <div className="relative overflow-hidden ">
            <DotLottieReact
              src="https://lottie.host/9a8df471-f82b-43b2-bef3-f08dff2c2807/eGDTe8Chsz.lottie"
              loop
              autoplay
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinanceHero;
