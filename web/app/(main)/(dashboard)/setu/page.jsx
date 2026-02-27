"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ShieldCheck, Smartphone, UserPlus, Fingerprint } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSetuConsentRequest } from "@/actions/setu";

export default function SetuConnectionPage() {
    const router = useRouter();

    // Flow states: 'SELECTION' | 'NEW_USER' | 'EXISTING_USER'
    const [step, setStep] = useState("SELECTION");
    const [isLoading, setIsLoading] = useState(false);

    // Form states
    const [phoneNumber, setPhoneNumber] = useState("");

    // New User form states
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        panNumber: "",
        bankName: "",
        accountNumber: ""
    });

    const handleConnect = async (phone) => {
        setIsLoading(true);

        try {
            const response = await createSetuConsentRequest(phone);

            if (response?.success) {
                // The server action returns the redirect URL (which is the real Setu hosted UI)
                window.location.href = response.redirectUrl;
            } else {
                console.error("Setu Connection Failed");
                alert("Failed to connect to Setu. Check console for details.");
                setIsLoading(false);
            }
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    };

    const handleNewUserSubmit = async (e) => {
        e.preventDefault();
        if (!phoneNumber || phoneNumber.length < 10) return;

        setIsLoading(true);
        try {
            // For new users, we pass the custom form data so we can mock a personalized account
            const response = await createSetuConsentRequest(phoneNumber, formData);

            if (response?.success) {
                window.location.href = response.redirectUrl;
            } else {
                console.error("Setu Connection Failed");
                alert("Failed to connect to Setu. Check console for details.");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExistingUserSubmit = async (e) => {
        e.preventDefault();
        if (!phoneNumber || phoneNumber.length < 10) return;
        await handleConnect(phoneNumber);
    };

    const handleBack = () => {
        if (step === "NEW_USER" || step === "EXISTING_USER") setStep("SELECTION");
        else router.push("/dashboard");
    };

    return (
        <div className="container max-w-2xl px-4 py-8 mx-auto flex flex-col items-center justify-center min-h-[80vh]">
            <div className="w-full flex justify-start mb-6">
                <button
                    onClick={handleBack}
                    className="text-muted-foreground hover:text-primary flex items-center text-sm font-medium transition-colors cursor-pointer"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {step === "SELECTION" ? "Back to Dashboard" : "Back Step"}
                </button>
            </div>

            <Card className="w-full border-2 shadow-lg">
                <CardHeader className="text-center space-y-4 pb-6">
                    <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-2">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight">
                        {step === "SELECTION" && "Connect via Setu AA"}
                        {step === "NEW_USER" && "Create Bank Details"}
                        {step === "EXISTING_USER" && "Connect Existing Accounts"}
                    </CardTitle>
                    <CardDescription className="text-base px-4">
                        {step === "SELECTION" && "Securely link your bank accounts using Setu Account Aggregator. Are you linking an existing account or creating a new profile?"}
                        {step === "NEW_USER" && "Enter your details to register. Then, you will be redirected to Setu to verify."}
                        {step === "EXISTING_USER" && "Enter the mobile number registered with your bank to verify your identity via Setu."}
                    </CardDescription>
                </CardHeader>
                <CardContent>

                    {/* STEP 1: SELECTION */}
                    {step === "SELECTION" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card
                                className="cursor-pointer hover:border-primary transition-all p-6 flex flex-col items-center justify-center text-center space-y-3"
                                onClick={() => setStep("NEW_USER")}
                            >
                                <div className="bg-blue-100 p-3 rounded-full dark:bg-blue-900/30">
                                    <UserPlus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h3 className="font-semibold text-lg">New User</h3>
                                <p className="text-sm text-muted-foreground">Register details before linking bank accounts securely</p>
                            </Card>

                            <Card
                                className="cursor-pointer hover:border-primary transition-all p-6 flex flex-col items-center justify-center text-center space-y-3"
                                onClick={() => setStep("EXISTING_USER")}
                            >
                                <div className="bg-emerald-100 p-3 rounded-full dark:bg-emerald-900/30">
                                    <Fingerprint className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <h3 className="font-semibold text-lg">Existing User</h3>
                                <p className="text-sm text-muted-foreground">Go straight to Setu with your registered mobile</p>
                            </Card>
                        </div>
                    )}

                    {/* STEP 2a: NEW USER FORM */}
                    {step === "NEW_USER" && (
                        <form onSubmit={handleNewUserSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="fullName">Full Name</Label>
                                    <Input
                                        id="fullName"
                                        placeholder="John Doe"
                                        required
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="john@example.com"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phoneNew">Mobile Number (used for AA connection)</Label>
                                <Input
                                    id="phoneNew"
                                    placeholder="Enter 10-digit number"
                                    maxLength={10}
                                    required
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pan">PAN Number</Label>
                                <Input
                                    id="pan"
                                    placeholder="ABCDE1234F"
                                    className="uppercase"
                                    maxLength={10}
                                    required
                                    value={formData.panNumber}
                                    onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="pt-2 pb-2">
                                <div className="h-px bg-border w-full"></div>
                                <p className="text-xs text-center text-muted-foreground mt-2 font-medium">BANK DETAILS</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bank">Select Bank</Label>
                                    <select
                                        id="bank"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                                        required
                                        value={formData.bankName}
                                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                        disabled={isLoading}
                                    >
                                        <option value="">Select your bank</option>
                                        <option value="sbi">State Bank of India</option>
                                        <option value="hdfc">HDFC Bank</option>
                                        <option value="icici">ICICI Bank</option>
                                        <option value="axis">Axis Bank</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="accNumber">Account Number</Label>
                                    <Input
                                        id="accNumber"
                                        placeholder="Enter Account No."
                                        required
                                        value={formData.accountNumber}
                                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value.replace(/\D/g, '') })}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full h-11 mt-4 text-base" disabled={isLoading}>
                                {isLoading ? "Redirecting to Setu..." : "Save Details & Proceed to Setu"}
                            </Button>
                        </form>
                    )}

                    {/* STEP 2b: EXISTING USER (PHONE) */}
                    {step === "EXISTING_USER" && (
                        <form onSubmit={handleExistingUserSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Registered Mobile Number</Label>
                                <div className="relative">
                                    <Smartphone className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder="Enter 10-digit mobile number"
                                        className="pl-10 h-12 text-lg"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        required
                                        maxLength={10}
                                        autoFocus
                                        disabled={isLoading}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground pt-2">
                                    By proceeding, you will be directed to Setu's secure portal to verify your identity.
                                </p>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 text-lg font-medium"
                                disabled={isLoading || phoneNumber.length < 10}
                            >
                                {isLoading ? "Redirecting to Setu..." : "Proceed to Setu"}
                            </Button>
                        </form>
                    )}

                    {/* Footer Info */}
                    <div className="mt-8 grid grid-cols-2 gap-4 text-sm text-muted-foreground border-t pt-6">
                        <div className="flex flex-col items-center text-center p-3 bg-muted/30 rounded-lg">
                            <ShieldCheck className="h-5 w-5 mb-2 text-primary/70" />
                            <span>Bank-grade Security</span>
                        </div>
                        <div className="flex flex-col items-center text-center p-3 bg-muted/30 rounded-lg">
                            <Smartphone className="h-5 w-5 mb-2 text-primary/70" />
                            <span>RBI Regulated AA</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}