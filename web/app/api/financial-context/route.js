import { NextResponse } from "next/server";
import { getFinancialContext } from "@/actions/aiInsights";

export async function GET() {
    try {
        const data = await getFinancialContext();
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 500 });
    }
}
