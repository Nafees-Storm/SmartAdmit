"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Result =
    | null
    | {
    success: boolean;
    eligible?: boolean;
    message?: string;
    percentage?: number;
    name?: string;
    qualification?: string;
};


export default function DocumentCheckPage() {
    const [name, setName] = useState("");
    const [obtainedMarks, setObtainedMarks] = useState<number | "">("");
    const [totalMarks, setTotalMarks] = useState<number>(1100); // FSC typical
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<Result>(null);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setResult(null);

        try {
            const res = await fetch("/api/document-check/percentage", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    qualification: "FSC",
                    totalMarks: Number(totalMarks),
                    obtainedMarks: Number(obtainedMarks),
                }),
            });

            const text = await res.text();

            let data: any;
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error(text); // shows HTML if it’s not JSON
            }

            setResult(data);
        } catch (err) {
            console.error(err);
            setResult({ success: false, message: "Something went wrong." });
        } finally {
            setLoading(false);
        }

    };

    return (
        <div className="max-w-xl mx-auto mt-10 flex flex-col gap-6">
            <h1 className="text-2xl font-semibold">Document Check</h1>
            <p className="text-slate-400">
                Step 1: Check eligibility (FSC must be 50%+)
            </p>

            <form onSubmit={onSubmit} className="bg-dark-200 rounded-xl p-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <label className="text-sm text-slate-300">Full Name</label>
                    <input
                        className="bg-dark-300 rounded-lg px-3 py-2 outline-none"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your full name"
                        required
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-sm text-slate-300">Qualification</label>
                    <input
                        className="bg-dark-300 rounded-lg px-3 py-2 outline-none"
                        value="FSC"
                        disabled
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-slate-300">Total Marks</label>
                        <input
                            type="number"
                            className="bg-dark-300 rounded-lg px-3 py-2 outline-none"
                            value={totalMarks}
                            onChange={(e) => setTotalMarks(Number(e.target.value))}
                            min={1}
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-slate-300">Obtained Marks</label>
                        <input
                            type="number"
                            className="bg-dark-300 rounded-lg px-3 py-2 outline-none"
                            value={obtainedMarks}
                            onChange={(e) => setObtainedMarks(e.target.value === "" ? "" : Number(e.target.value))}
                            min={0}
                            required
                        />
                    </div>
                </div>

                <Button
                    type="submit"
                    disabled={loading}
                    className="bg-primary-100 text-black hover:bg-primary-100/80"
                >
                    {loading ? "Checking..." : "Submit"}
                </Button>
            </form>

            {result && (
                <div
                    className={`rounded-xl p-4 border ${
                        result.eligible
                            ? "border-green-500/30 bg-green-500/10"
                            : "border-red-500/30 bg-red-500/10"
                    }`}
                >
                    <p className="font-semibold text-lg">
                        {result.eligible ? "Eligible ✅" : "Not Eligible ❌"}
                    </p>

                    <p className="text-sm text-slate-200 mt-1">
                        {result.message ?? "No message returned."}
                    </p>

                    {typeof result.percentage === "number" && (
                        <p className="text-sm text-slate-300 mt-2">
                            Percentage:{" "}
                            <span className="font-medium">
                    {result.percentage}%
                </span>
                        </p>
                    )}
                </div>
            )}

        </div>
    );
}
