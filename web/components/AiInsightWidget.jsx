"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Sparkles, RefreshCw, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * AiInsightWidget — a drop-in shadcn Card that streams an AI insight from Ollama.
 *
 * Props:
 *   title       — card title, e.g. "AI Insight"
 *   insightType — one of the 9 types: spending_analysis | budget_prediction | ...
 *   data        — the financialContext object from getFinancialContext()
 *   className   — optional extra classes on the Card
 */
export default function AiInsightWidget({ title = "AI Insight", insightType, data: propData = null, className = "" }) {
    const [resolvedData, setResolvedData] = useState(propData);
    const [text, setText] = useState("");
    const [status, setStatus] = useState(null); // 'healthy', 'warning', 'critical'
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState(null);
    const abortRef = useRef(null);

    // We don't rely securely on propData anymore for generation,
    // we want to ensure any live changes (e.g. Budget editing) are caught.
    useEffect(() => {
        if (propData !== null) setResolvedData(propData);
    }, [propData]);

    const generate = useCallback(async () => {
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setText("");
        setStatus(null);
        setDone(false);
        setError(null);
        setLoading(true);

        try {
            // ALWAYS fetch fresh data so live budget edits are reflected instantly
            let latestData = resolvedData;
            try {
                const ctxRes = await fetch("/api/financial-context");
                if (ctxRes.ok) {
                    const freshData = await ctxRes.json();
                    if (freshData && !freshData.error) {
                        latestData = freshData;
                        setResolvedData(freshData);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch fresh context", err);
            }

            const res = await fetch("/api/ai-insights", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ insightType, data: latestData || {} }),
                signal: controller.signal,
            });

            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.error || `HTTP ${res.status}`);
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done: streamDone, value } = await reader.read();
                if (streamDone) break;
                buffer += decoder.decode(value, { stream: true });

                // Extract status dot on the fly
                if (buffer.includes("🟢")) {
                    setStatus("healthy");
                    buffer = buffer.replace("🟢", "");
                } else if (buffer.includes("🟡")) {
                    setStatus("warning");
                    buffer = buffer.replace("🟡", "");
                } else if (buffer.includes("🔴")) {
                    setStatus("critical");
                    buffer = buffer.replace("🔴", "");
                }

                setText(buffer);
            }

            setDone(true);
        } catch (err) {
            if (err.name !== "AbortError") setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [insightType, resolvedData]);

    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                    {title}
                    {status && (
                        <span className={`w-2 h-2 rounded-full shadow-sm ml-1 animate-in fade-in zoom-in duration-300 ${status === "healthy" ? "bg-emerald-500 shadow-emerald-500/50" :
                            status === "warning" ? "bg-amber-500 shadow-amber-500/50" :
                                "bg-red-500 shadow-red-500/50"
                            }`} />
                    )}
                </CardTitle>

                {done ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={generate}
                        className="h-6 w-6"
                        title="Regenerate"
                    >
                        <RotateCcw className="h-3 w-3" />
                    </Button>
                ) : null}
            </CardHeader>

            <CardContent>
                {/* Empty state */}
                {!text && !loading && !error && (
                    <Button
                    onClick={generate}
                    className="w-full text-left text-xs text-white hover:text-foreground transition-colors py-1 bg-black"
                    variant="outline"
                    >
                    Click here to generate insight!
                    </Button>
                )}

                {/* Loading skeleton */}
                {loading && !text && (
                    <div className="space-y-2 animate-pulse">
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-4/5" />
                    <div className="h-3 bg-muted rounded w-3/5" />
                    </div>
                )}

                {/* Streamed text */}
                {text && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                    {text}
                    {loading && (
                        <span className="inline-block w-1 h-3 bg-muted-foreground/60 ml-0.5 animate-pulse rounded-sm" />
                    )}
                    </p>
                )}

                {/* Error */}
                {error && (
                    <div className="text-xs text-destructive space-y-1">
                    <p>Failed to generate: {error}</p>
                    <button
                        onClick={generate}
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <RefreshCw className="h-3 w-3" />
                        Retry
                    </button>
                    </div>
                )}
                </CardContent>
        </Card>
    );
}
