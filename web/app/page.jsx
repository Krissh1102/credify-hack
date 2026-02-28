import React from "react";
import {
  PieChart,
  ScanLine,
  Target,
  Landmark,
  Globe,
  BrainCircuit,
  TrendingUp,
  GraduationCap,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  Quote,
} from "lucide-react";
import Image from "next/image";
import RotatingText from "@/components/RotatingText";

const coreFeatures = [
  {
    icon: <BrainCircuit className="w-8 h-8 text-teal-600" />,
    title: "Advanced Analytics",
    description:
      "Get detailed insights into your spending patterns with our powerful AI-driven analytics.",
  },
  {
    icon: <ScanLine className="w-8 h-8 text-teal-600" />,
    title: "Smart Receipt Scanner",
    description:
      "Automatically extract and categorize data from receipts using advanced OCR technology.",
  },
  {
    icon: <Target className="w-8 h-8 text-teal-600" />,
    title: "Intelligent Budget Planning",
    description:
      "Create and manage budgets with smart recommendations tailored to your financial goals.",
  },
  {
    icon: <Landmark className="w-8 h-8 text-teal-600" />,
    title: "Multi-Account Support",
    description:
      "Consolidate multiple bank accounts and credit cards into one seamless, unified dashboard.",
  },
  {
    icon: <Globe className="w-8 h-8 text-teal-600" />,
    title: "Multi-Currency Ready",
    description:
      "Manage finances in multiple currencies with real-time conversion rates at your fingertips.",
  },
  {
    icon: <PieChart className="w-8 h-8 text-teal-600" />,
    title: "Automated Insights",
    description:
      "Receive proactive financial insights, alerts, and personalized recommendations.",
  },
];

const loanFeatures = [
  { text: "Holistic Debt Overview" },
  { text: "Track All Your Loans" },
  { text: "Custom Repayment Plans" },
  { text: "EMI Calculator" },
];

const investmentFeatures = [
  { text: "Portfolio Tracking" },
  { text: "Market Insights & News" },
  { text: "Goal-Based Investment Planning" },
  { text: "Stock, Crypto & ETF Support" },
];

const testimonials = [
  {
    name: "Alexandra Chen",
    role: "Startup Founder",
    quote:
      '"Credify is the first app that truly consolidates my personal and business finances. The AI insights for budgeting are incredibly accurate and helpful."',
    avatar: "https://placehold.co/100x100/E2E8F0/4A5568?text=AC",
  },
  {
    name: "David Miller",
    role: "Freelance Consultant",
    quote:
      '"Managing loans and investments used to be a nightmare. Now, I have a clear picture of my net worth and debt, all in one place. The EMI calculator is a lifesaver."',
    avatar: "https://placehold.co/100x100/E2E8F0/4A5568?text=DM",
  },
  {
    name: "Priya Sharma",
    role: "Software Engineer",
    quote:
      '"The multi-currency support is essential for me as I work with international clients. Credify handles conversions seamlessly. Highly recommended!"',
    avatar: "https://placehold.co/100x100/E2E8F0/4A5568?text=PS",
  },
];

export default function App() {
  return (
    <div className="min-h-screen font-sans ">
      <main>
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-6 text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tighter">
              Take Control of Your{""}
              <RotatingText
                texts={[
                  "  Entire Financial World!",
                  "  Loans!",
                  "  Expenses!",
                  "  Savings!",
                ]}
                mainClassName=" inline-block text-teal-600 "
                staggerFrom={"last"}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "-120%" }}
                staggerDuration={0.025}
                splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
                rotationInterval={3000}
              />
            </h1>

            <p className="mt-6 max-w-2xl mx-auto text-lg ">
              From smart budgeting and AI-powered analytics to loan management
              and investment tracking, Credify is the only platform you need
              to achieve financial clarity.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <button className="bg-teal-600 font-bold px-8 py-3 rounded-lg  transition-transform hover:scale-105">
                Get Started Free
              </button>
              <button className="  font-bold px-8 py-3 rounded-lg border border-gray-300 transition">
                Learn More
              </button>
            </div>

            <div className="mt-16 w-full max-w-4xl mx-auto p-4 rounded-xl shadow-2xl ring-1 ring-gray-200">
              <div className="aspect-video relative rounded-lg overflow-hidden">
                <Image
                  src="/hero.png"
                  alt="banner"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-24 ">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tight  sm:text-4xl">
                Your All-In-One Finance Hub
              </h2>
              <p className="mt-4 text-lg ">
                Unlock a suite of powerful tools designed to simplify every
                aspect of your financial life.
              </p>
            </div>
            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {coreFeatures.map((feature, index) => (
                <div key={index} className=" p-6 rounded-lg">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg">
                    {feature.icon}
                  </div>
                  <h3 className="mt-5 text-xl font-semibold ">
                    {feature.title}
                  </h3>
                  <p className="mt-2 ">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="loans" className="py-24">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="pr-8">
                <h2 className="text-3xl font-bold tracking-tight  sm:text-4xl">
                  Master Your Debt with Confidence
                </h2>
                <p className="mt-4 text-lg ">
                  Navigate your loans and liabilities with ease. Our dedicated
                  loan center provides the clarity you need to manage your debt
                  effectively and plan for a debt-free future.
                </p>
                <ul className="mt-8 space-y-4">
                  {loanFeatures.map((item, i) => (
                    <li key={i} className="flex items-center ">
                      <CheckCircle2 className="h-6 w-6 text-teal-500 mr-3 flex-shrink-0" />
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex items-center gap-4 p-4  rounded-lg">
                  <GraduationCap className="h-10 w-10 text-teal-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold ">Financial Learning Hub</h4>
                    <p className="">
                      Access resources to improve your financial literacy.
                    </p>
                  </div>
                </div>
              </div>

              <div className=" p-6 rounded-xl shadow-xl ring-1 ring-gray-200">
                <div className="aspect-square rounded-lg  flex items-center justify-center relative">
                  <Image
                    src="/hero2.png"
                    alt="Sample Image"
                    fill
                    className="object-contain rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="investments" className="py-24 ">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="p-6 rounded-xl shadow-xl ring-1 ring-gray-200">
                <div className="aspect-square rounded-lg  flex items-center justify-center relative">
                  <Image
                    src="/hero1.png"
                    alt="Sample Image"
                    fill
                    className="object-contain rounded-lg"
                  />
                </div>
              </div>
              <div className="pl-8 order-first md:order-last">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Grow Your Wealth, Intelligently
                </h2>
                <p className="mt-4 text-lg ">
                  Monitor your investments, discover new opportunities, and stay
                  ahead of the market. Our investment tools are built to help
                  you make smarter decisions.
                </p>
                <ul className="mt-8 space-y-4">
                  {investmentFeatures.map((item, i) => (
                    <li key={i} className="flex items-center ">
                      <CheckCircle2 className="h-6 w-6 text-teal-500 mr-3 flex-shrink-0" />
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tight  sm:text-4xl">
                Trusted by Thousands of Smart Users
              </h2>
              <p className="mt-4 text-lg ">
                See how Credify is helping people everywhere achieve their
                financial goals.
              </p>
            </div>
            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {testimonials.map((t, i) => (
                <div
                  key={i}
                  className=" p-8 rounded-lg shadow-sm border border-gray-200"
                >
                  <Quote className="w-8 h-8 text-teal-100 mb-4" />
                  <p className="text-gray-600 mb-6 flex-grow">{t.quote}</p>
                  <div className="flex items-center">
                    <img
                      src={t.avatar}
                      alt={t.name}
                      className="w-12 h-12 rounded-full"
                    />
                    <div className="ml-4">
                      <div className="font-semibold ">{t.name}</div>
                      <div className="text-sm">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <footer className="">
          <div className="container mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold text-white mb-4">Credify</h3>
              <p className="text-sm">&copy; 2026. All rights reserved.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#features" className="hover:text-white">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Security
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-white">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-white">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
