"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Sparkles, RotateCcw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const STATUS_CONFIG = {
    healthy: {
        badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500 shadow-emerald-500/50",
        icon: TrendingUp,
        iconClass: "text-emerald-500",
        label: "Healthy",
    },
    warning: {
        badge: "bg-amber-100 text-amber-700 border-amber-200",
        dot: "bg-amber-500 shadow-amber-500/50",
        icon: Minus,
        iconClass: "text-amber-500",
        label: "Monitor",
    },
    critical: {
        badge: "bg-red-100 text-red-700 border-red-200",
        dot: "bg-red-500 shadow-red-500/50",
        icon: TrendingDown,
        iconClass: "text-red-500",
        label: "Critical",
    },
};

/**
 * Parses the AI response into { headline, detail }.
 * Expected format: "HEADLINE: some short text | DETAIL: supporting sentence"
 * Falls back gracefully if the model doesn't follow the format.
 */
function parseInsight(raw) {
    const headlineMatch = raw.match(/HEADLINE:\s*(.+?)(?:\||\n|$)/i);
    const detailMatch = raw.match(/DETAIL:\s*(.+)/is);
    if (headlineMatch && detailMatch) {
        return {
            headline: headlineMatch[1].replace(/DETAIL:.*/is, "").trim(),
            detail: detailMatch[1].replace(/^DETAIL:\s*/i, "").trim(),
        };
    }
    // Fallback: strip labels and split at sentence boundary
    const stripped = raw.replace(/HEADLINE:\s*/ig, "").replace(/DETAIL:\s*/ig, "\n");
    const sentences = stripped.split(/(?<=[.?!])\s+/);
    return {
        headline: sentences[0]?.trim() || raw,
        detail: sentences.slice(1).join(" ").trim(),
    };
}

export default function AiInsightWidget({ title = "AI Insight", insightType, data: propData = null, className = "" }) {
    const [resolvedData, setResolvedData] = useState(propData);
    const [rawText, setRawText] = useState("");
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState(null);
    const abortRef = useRef(null);

    useEffect(() => {
        if (propData !== null) setResolvedData(propData);
    }, [propData]);

    const generate = useCallback(async () => {
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setRawText("");
        setStatus(null);
        setDone(false);
        setError(null);
        setLoading(true);

        try {
            // Always fetch fresh context so budget edits are reflected instantly
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

                // Extract status emoji on the fly
                if (buffer.includes("🟢")) { setStatus("healthy"); buffer = buffer.replace(/🟢/g, ""); }
                else if (buffer.includes("🟡")) { setStatus("warning"); buffer = buffer.replace(/🟡/g, ""); }
                else if (buffer.includes("🔴")) { setStatus("critical"); buffer = buffer.replace(/🔴/g, ""); }

                setRawText(buffer);
            }

            setDone(true);
        } catch (err) {
            if (err.name !== "AbortError") setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [insightType, resolvedData]);

    const cfg = status ? STATUS_CONFIG[status] : null;
    const parsed = rawText ? parseInsight(rawText) : null;
    const StatusIcon = cfg?.icon;

    return (
        <Card className={`overflow-hidden ${className}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4">
                <CardTitle className="text-sm font-medium flex text-center gap-1.5">

                    {title}
                </CardTitle>
                <div className="flex items-center gap-2">
                    {cfg && (
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 font-medium ${cfg.badge}`}>
                            {cfg.label}
                        </Badge>
                    )}
                    {done && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={generate}
                            className="h-6 w-6"
                            title="Regenerate"
                        >
                            <RotateCcw className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            </CardHeader>

            <CardContent className="px-4 pb-4">
                {/* Empty state */}
                {!rawText && !loading && !error && (
                    <button
                        onClick={generate}
                        className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground border border-dashed rounded-lg py-4 hover:border-primary/50 hover:text-foreground transition-all"
                    >
                        <Sparkles className="h-3.5 w-3.5" />
                        Generate insight
                    </button>
                )}

                {/* Loading skeleton */}
                {loading && !rawText && (
                    <div className="space-y-2 animate-pulse pt-1">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-full mt-2" />
                        <div className="h-3 bg-muted rounded w-4/5" />
                    </div>
                )}

                {/* Parsed result */}
                {rawText && parsed && (
                    <div className="space-y-2 pt-1">
                        {/* Headline row */}
                        <div className="flex items-start gap-2">
                            {cfg && StatusIcon && (
                                <StatusIcon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.iconClass}`} />
                            )}
                            <p className="text-sm font-semibold leading-snug text-foreground">
                                {parsed.headline}
                                {loading && (
                                    <span className="inline-block w-1 h-3 bg-muted-foreground/60 ml-0.5 animate-pulse rounded-sm" />
                                )}
                            </p>
                        </div>

                        {/* Detail row */}
                        {parsed.detail && !loading && (
                            <>
                                <Separator className="my-1" />
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {parsed.detail}
                                </p>
                            </>
                        )}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="text-xs text-destructive space-y-1 pt-1">
                        <p>Failed to generate: {error}</p>
                        <button
                            onClick={generate}
                            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <RotateCcw className="h-3 w-3" />
                            Retry
                        </button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
