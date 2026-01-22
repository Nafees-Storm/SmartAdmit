"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Step = 1 | 2 | 3;

type Result =
    | null
    | {
    success: boolean;
    message?: string;
    percentage?: number;
    eligible?: boolean;
    name?: string;
    qualification?: string;
};

type VerifyResult =
    | null
    | {
    success: boolean;
    stage?: string;
    message?: string;
    docsValid?: boolean;
    findings?: string[] | string;
    missingDocs?: string[];
    applicant?: {
        name?: string;
        claimedFscPercentage?: number;
        claimedIeltsBand?: number;
    };
    offer?: {
        universityName?: string;
        name?: string;
        programName?: string;
        totalFee?: number;
        depositFee?: number;
        studentId?: string;
        issueDate?: string;
        offerLetterHtml?: string;
        idCardDataUrl?: string;
    };
};

const MAX_MB = 8;

export default function DocumentCheckPage() {
    // Step control
    const [step, setStep] = useState<Step>(1);

    // Step 1 fields
    const [name, setName] = useState("");
    const [obtainedMarks, setObtainedMarks] = useState<number | "">("");
    const [totalMarks, setTotalMarks] = useState<number>(1100);

    const [loading1, setLoading1] = useState(false);
    const [result1, setResult1] = useState<Result>(null);

    // Live percentage (client-side)
    const percentage = useMemo(() => {
        if (obtainedMarks === "" || !totalMarks) return null;
        const pct = (Number(obtainedMarks) / Number(totalMarks)) * 100;
        return Math.round(pct * 100) / 100;
    }, [obtainedMarks, totalMarks]);

    const eligible = percentage !== null && percentage >= 50;

    // Program inputs (step 2)
    const [programName, setProgramName] = useState("");
    const [totalFee, setTotalFee] = useState<number | "">(14000);

    const [depositFee, setDepositFee] = useState<number | "">("");

    // Step 2 fields (docs)
    const [claimedIeltsBand, setClaimedIeltsBand] = useState<number | "">("");
    const [fscFile, setFscFile] = useState<File | null>(null);
    const [cnicFile, setCnicFile] = useState<File | null>(null);
    const [passportFile, setPassportFile] = useState<File | null>(null);
    const [ieltsFile, setIeltsFile] = useState<File | null>(null);

    const [loading2, setLoading2] = useState(false);
    const [result2, setResult2] = useState<VerifyResult>(null);

    // Refs for PDF capture
    const offerRef = useRef<HTMLDivElement | null>(null);
    const idCardRef = useRef<HTMLDivElement | null>(null);

    // --- Step 1 submit (workflow-1) ---
    const onSubmitStep1 = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading1(true);
        setResult1(null);

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
            const contentType = res.headers.get("content-type") || "";
            if (!contentType.includes("application/json")) throw new Error(text);

            const data = JSON.parse(text);
            setResult1(data);

            const pctFromApi =
                typeof data?.percentage === "number" ? data.percentage : percentage;

            if (pctFromApi !== null && pctFromApi >= 50) {
                setStep(2);
            }
        } catch (err) {
            console.error(err);
            setResult1({ success: false, message: "Something went wrong." });
        } finally {
            setLoading1(false);
        }
    };

    // --- Step 2 submit (workflow-2) ---
    const verifyDocuments = async () => {
        if (!eligible) {
            setResult2({
                success: false,
                stage: "blocked",
                message: "You must be eligible (50%+) before uploading documents.",
            });
            return;
        }

        setLoading2(true);
        setResult2(null);

        // File-size validation
        const files = [fscFile, cnicFile, passportFile, ieltsFile];
        if (files.some((f) => f && f.size > MAX_MB * 1024 * 1024)) {
            setResult2({
                success: false,
                message: "One of your files is too large. Please upload files under 8MB.",
            });
            setLoading2(false);
            return;
        }

        // Optional local warning, but STILL call API
        const missingDocs = [
            !fscFile ? "FSC Marksheet" : null,
            !cnicFile ? "CNIC" : null,
            !passportFile ? "Passport" : null,
            !ieltsFile ? "IELTS" : null,
        ].filter(Boolean) as string[];

        if (missingDocs.length) {
            setResult2({
                success: false,
                stage: "missing-docs",
                message: `Missing documents: ${missingDocs.join(", ")}`,
                missingDocs,
            });
        }

        try {
            const fd = new FormData();
            fd.append("name", name);
            fd.append("programName", programName);
            fd.append("totalFee", String(totalFee === "" ? 0 : totalFee));
            fd.append("depositFee", String(depositFee === "" ? 0 : depositFee));
            fd.append("claimedFscPercentage", String(percentage ?? 0));
            fd.append(
                "claimedIeltsBand",
                String(claimedIeltsBand === "" ? 0 : claimedIeltsBand)
            );

            // Append only existing files
            if (fscFile) fd.append("fsc", fscFile);
            if (cnicFile) fd.append("cnic", cnicFile);
            if (passportFile) fd.append("passport", passportFile);
            if (ieltsFile) fd.append("ielts", ieltsFile);

            const res = await fetch("/api/document-check/verify", {
                method: "POST",
                body: fd,
            });

            const text = await res.text();
            const contentType = res.headers.get("content-type") || "";
            if (!contentType.includes("application/json")) throw new Error(text);

            const parsed = JSON.parse(text);

            // unwrap array
            let data: any = Array.isArray(parsed) ? parsed[0] : parsed;

            // handle double-encoded JSON
            if (typeof data === "string") {
                try {
                    data = JSON.parse(data);
                } catch {
                    // keep string
                }
            }

            // handle { body: {...} }
            if (data?.body && typeof data.body === "object") {
                data = data.body;
            }

            setResult2(data);

            // ✅ move to step 3 when offer generated
            if (
                data?.success === true &&
                (data?.offer?.offerLetterHtml || data?.stage === "offer-generated")
            ) {
                setStep(3);
            }
        } catch (err) {
            console.error(err);
            setResult2({
                success: false,
                message: "Something went wrong while verifying documents.",
            });
        } finally {
            setLoading2(false);
        }
    };

    // --- PDF downloads ---
    const downloadOfferLetterPDF = async () => {
        try {
            if (!offerRef.current) return;

            const html2canvas = (await import("html2canvas")).default;
            const jspdfModule: any = await import("jspdf");
            const jsPDF = jspdfModule.jsPDF || jspdfModule.default;

            const canvas = await html2canvas(offerRef.current, {
                scale: 2,
                backgroundColor: "#ffffff",
                useCORS: true,

                // ✅ Fix: remove unsupported lab() colors
                onclone: (doc) => {
                    const all = doc.querySelectorAll<HTMLElement>("*");
                    all.forEach((el) => {
                        const style = doc.defaultView?.getComputedStyle(el);
                        if (!style) return;

                        // any style values containing "lab(" will crash html2canvas
                        const propsToCheck = [
                            "color",
                            "backgroundColor",
                            "borderTopColor",
                            "borderRightColor",
                            "borderBottomColor",
                            "borderLeftColor",
                            "boxShadow",
                            "textShadow",
                            "filter",
                        ];

                        propsToCheck.forEach((p) => {
                            const v = (style as any)[p];
                            if (typeof v === "string" && v.includes("lab(")) {
                                // replace with safe fallback
                                if (p === "color") el.style.color = "#000";
                                if (p === "backgroundColor") el.style.backgroundColor = "#fff";
                                if (p.startsWith("border")) el.style.borderColor = "#ddd";
                                if (p === "boxShadow") el.style.boxShadow = "none";
                                if (p === "textShadow") el.style.textShadow = "none";
                                if (p === "filter") el.style.filter = "none";
                            }
                        });
                    });
                },
            });

            const imgData = canvas.toDataURL("image/png");

            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Offer-Letter-${result2?.offer?.name || name || "student"}.pdf`);
        } catch (e) {
            console.error("Offer PDF error:", e);
            alert("Failed to download Offer Letter PDF. Check console.");
        }
    };


    const downloadIdCardPDF = async () => {
        try {
            if (!idCardRef.current) return;

            const html2canvas = (await import("html2canvas")).default;
            const jspdfModule: any = await import("jspdf");
            const jsPDF = jspdfModule.jsPDF || jspdfModule.default;

            const canvas = await html2canvas(idCardRef.current, {
                scale: 2,
                backgroundColor: "#ffffff",
                useCORS: true,

                // ✅ Fix: remove unsupported lab() colors
                onclone: (doc) => {
                    const all = doc.querySelectorAll<HTMLElement>("*");
                    all.forEach((el) => {
                        const style = doc.defaultView?.getComputedStyle(el);
                        if (!style) return;

                        const propsToCheck = [
                            "color",
                            "backgroundColor",
                            "borderTopColor",
                            "borderRightColor",
                            "borderBottomColor",
                            "borderLeftColor",
                            "boxShadow",
                            "textShadow",
                            "filter",
                        ];

                        propsToCheck.forEach((p) => {
                            const v = (style as any)[p];
                            if (typeof v === "string" && v.includes("lab(")) {
                                if (p === "color") el.style.color = "#000";
                                if (p === "backgroundColor") el.style.backgroundColor = "#fff";
                                if (p.startsWith("border")) el.style.borderColor = "#ddd";
                                if (p === "boxShadow") el.style.boxShadow = "none";
                                if (p === "textShadow") el.style.textShadow = "none";
                                if (p === "filter") el.style.filter = "none";
                            }
                        });
                    });
                },
            });

            const imgData = canvas.toDataURL("image/png");

            const pdf = new jsPDF("p", "mm", "a4");

            // card sizing
            const pdfWidth = 100; // mm
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            const pageWidth = pdf.internal.pageSize.getWidth();
            const x = (pageWidth - pdfWidth) / 2;
            const y = 40;

            pdf.addImage(imgData, "PNG", x, y, pdfWidth, pdfHeight);
            pdf.save(`Student-ID-${result2?.offer?.studentId || "000000"}.pdf`);
        } catch (e) {
            console.error("ID PDF error:", e);
            alert("Failed to download Student ID PDF. Check console.");
        }
    };


    // --- UI helper ---
    const StepPill = ({ n, label }: { n: Step; label: string }) => {
        const active = step === n;
        const done = step > n;
        return (
            <div
                className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm border ${
                    active
                        ? "border-primary-100/40 bg-primary-100/10"
                        : done
                            ? "border-green-500/30 bg-green-500/10"
                            : "border-white/10 bg-white/5"
                }`}
            >
        <span
            className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold ${
                active
                    ? "bg-primary-100 text-black"
                    : done
                        ? "bg-green-500 text-black"
                        : "bg-white/10 text-white"
            }`}
        >
          {n}
        </span>
                <span className="text-slate-200">{label}</span>
            </div>
        );
    };

    const hasOffer = !!result2?.offer?.offerLetterHtml;

    return (
        <div className="max-w-2xl mx-auto mt-10 flex flex-col gap-6">
            <h1 className="text-2xl font-semibold">Document Check</h1>

            {/* Stepper */}
            <div className="flex flex-wrap gap-3">
                <StepPill n={1} label="Step 1: Eligibility" />
                <StepPill n={2} label="Step 2: Upload Docs" />
                <StepPill n={3} label="Step 3: Final Status" />
            </div>

            {/* ---------------- Step 1 ---------------- */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <p className="text-slate-300 mb-3">
                    Step 1: Check eligibility (FSC must be 50%+)
                </p>

                <form onSubmit={onSubmitStep1} className="flex flex-col gap-4">
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
                                onChange={(e) =>
                                    setObtainedMarks(e.target.value === "" ? "" : Number(e.target.value))
                                }
                                min={0}
                                required
                            />
                        </div>
                    </div>

                    {percentage !== null && (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-300">
                                Current Percentage: <span className="font-semibold">{percentage}%</span>
                            </p>

                            <span
                                className={`text-xs px-3 py-1 rounded-full border ${
                                    eligible
                                        ? "border-green-500/30 bg-green-500/10 text-green-200"
                                        : "border-red-500/30 bg-red-500/10 text-red-200"
                                }`}
                            >
                {eligible ? "Eligible" : "Not eligible"}
              </span>
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={loading1}
                        className="bg-primary-100 text-black hover:bg-primary-100/80"
                    >
                        {loading1 ? "Checking..." : "Submit"}
                    </Button>
                </form>

                {result1?.message && (
                    <div
                        className={`mt-4 rounded-xl p-4 border ${
                            result1.success
                                ? "border-green-500/30 bg-green-500/10"
                                : "border-red-500/30 bg-red-500/10"
                        }`}
                    >
                        <p className="text-sm text-slate-200">{result1.message}</p>
                        {typeof result1.percentage === "number" && (
                            <p className="text-sm text-slate-300 mt-2">
                                Percentage: <span className="font-medium">{result1.percentage}%</span>
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* ---------------- Step 2 ---------------- */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <p className="text-slate-300 mb-3">Step 2: Program info</p>

                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-slate-300">Program Name</label>
                        <input
                            className="bg-dark-300 rounded-lg px-3 py-2 outline-none"
                            value={programName}
                            onChange={(e) => setProgramName(e.target.value)}
                            placeholder="e.g., BSc Computer Science"
                            disabled={!eligible}
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-slate-300">Total Program Fee (£)</label>
                        <input
                            type="number"
                            value={totalFee}
                            readOnly
                            className="bg-dark-300 rounded-lg px-3 py-2 outline-none opacity-80"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-slate-300">Deposit Fee to Pay Now (£)</label>
                        <input
                            type="number"
                            className="bg-dark-300 rounded-lg px-3 py-2 outline-none"
                            value={depositFee}
                            onChange={(e) =>
                                setDepositFee(e.target.value === "" ? "" : Number(e.target.value))
                            }
                            placeholder="e.g., 2000"
                            disabled={!eligible}
                            required
                            min={0}
                        />
                    </div>
                </div>
            </div>

            {/* Docs upload block */}
            <div
                className={`rounded-xl border p-5 ${
                    eligible ? "border-white/10 bg-white/5" : "border-white/5 bg-white/3 opacity-60"
                }`}
            >
                <div className="flex items-center justify-between mb-3">
                    <p className="text-slate-300">Step 2: Upload required documents</p>
                    {!eligible && (
                        <span className="text-xs px-3 py-1 rounded-full border border-red-500/30 bg-red-500/10 text-red-200">
              Locked until eligible
            </span>
                    )}
                </div>

                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-slate-300">Claimed FSC % (auto)</label>
                            <input
                                className="bg-dark-300 rounded-lg px-3 py-2 outline-none"
                                value={percentage ?? ""}
                                readOnly
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-slate-300">Claimed IELTS Band</label>
                            <input
                                type="number"
                                className="bg-dark-300 rounded-lg px-3 py-2 outline-none"
                                value={claimedIeltsBand}
                                onChange={(e) =>
                                    setClaimedIeltsBand(e.target.value === "" ? "" : Number(e.target.value))
                                }
                                min={0}
                                step={0.5}
                                disabled={!eligible}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-slate-300">FSC Marksheet</label>
                            <input
                                type="file"
                                accept="image/*"
                                disabled={!eligible}
                                onChange={(e) => setFscFile(e.target.files?.[0] ?? null)}
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-slate-300">CNIC</label>
                            <input
                                type="file"
                                accept="image/*"
                                disabled={!eligible}
                                onChange={(e) => setCnicFile(e.target.files?.[0] ?? null)}
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-slate-300">Passport</label>
                            <input
                                type="file"
                                accept="image/*"
                                disabled={!eligible}
                                onChange={(e) => setPassportFile(e.target.files?.[0] ?? null)}
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-slate-300">IELTS Result</label>
                            <input
                                type="file"
                                accept="image/*"
                                disabled={!eligible}
                                onChange={(e) => setIeltsFile(e.target.files?.[0] ?? null)}
                            />
                        </div>
                    </div>

                    <Button
                        type="button"
                        onClick={verifyDocuments}
                        disabled={!eligible || loading2}
                        className="bg-primary-100 text-black hover:bg-primary-100/80"
                    >
                        {loading2 ? "Verifying..." : "Verify Documents"}
                    </Button>
                </div>

                {result2?.message && (
                    <div
                        className={`mt-4 rounded-xl p-4 border ${
                            result2.success
                                ? "border-green-500/30 bg-green-500/10"
                                : "border-red-500/30 bg-red-500/10"
                        }`}
                    >
                        <p className="text-sm text-slate-200">{result2.message}</p>

                        {Array.isArray(result2.missingDocs) && result2.missingDocs.length > 0 && (
                            <div className="mt-3">
                                <p className="text-sm text-slate-300 mb-2">Missing documents:</p>
                                <ul className="list-disc ml-5 text-sm text-red-200 space-y-1">
                                    {result2.missingDocs.map((d, i) => (
                                        <li key={i}>{d}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {result2.findings && (
                            <div className="text-sm text-slate-300 mt-2">
                                {Array.isArray(result2.findings) ? (
                                    <ul className="list-disc ml-5">
                                        {result2.findings.map((f, i) => (
                                            <li key={i}>{f}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p>{result2.findings}</p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ---------------- Step 3 ---------------- */}
            {hasOffer && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-slate-200 font-semibold">🎉 Unconditional Offer Letter</p>

                        <div className="flex gap-2">
                            <Button
                                type="button"
                                onClick={downloadOfferLetterPDF}
                                className="bg-green-500 text-black hover:bg-green-500/80"
                            >
                                Download Offer Letter (PDF)
                            </Button>

                            <Button
                                type="button"
                                onClick={downloadIdCardPDF}
                                className="bg-blue-500 text-black hover:bg-blue-500/80"
                            >
                                Download ID Card (PDF)
                            </Button>
                        </div>
                    </div>

                    {/* Offer Letter (PDF uses this ref) */}
                    <div className="bg-blue-950 text-white rounded-xl p-5 mt-4" ref={offerRef}>
                        <div
                            dangerouslySetInnerHTML={{
                                __html: result2?.offer?.offerLetterHtml || "",
                            }}
                        />
                    </div>

                    {/* ID Card (PDF uses THIS ref) */}

                    <p className="text-slate-200 font-semibold mt-6 mb-3">🪪 Digital Student ID Card</p>

                    <div ref={idCardRef} className="w-full max-w-md rounded-xl border border-white/10 overflow-hidden">
                        <div className="bg-slate-900 text-white p-6">
                            <p className="text-lg font-semibold">{result2?.offer?.universityName || "University of Bedfordshire"}</p>
                            <p className="text-xs opacity-80 mt-1">Student ID Card</p>

                            <div className="mt-5 space-y-2 text-sm">
                                <p>
                                    <span className="opacity-70">Name:</span>{" "}
                                    <span className="font-semibold">{result2?.offer?.name || name || "Student"}</span>
                                </p>
                                <p>
                                    <span className="opacity-70">Program:</span>{" "}
                                    <span className="font-semibold">{result2?.offer?.programName || programName || "—"}</span>

                                </p>
                                <p>
                                    <span className="opacity-70">ID:</span>{" "}
                                    <span className="font-semibold">{result2?.offer?.studentId || "000000"}</span>
                                </p>
                                <p className="text-xs opacity-70 mt-4">
                                    Issued: {result2?.offer?.issueDate || "—"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Optional: if you still want to display idCardDataUrl image from n8n */}
                    {result2?.offer?.idCardDataUrl && (
                        <div className="mt-4">
                            <p className="text-slate-300 text-sm mb-2">Generated image from n8n (optional):</p>
                            <img
                                src={result2.offer.idCardDataUrl}
                                alt="Student ID Card (image)"
                                className="w-full max-w-md rounded-xl border border-white/10"
                            />
                        </div>
                    )}

                    <p className="text-slate-400 text-sm mt-3">
                        Student ID:{" "}
                        <span className="text-slate-200 font-medium">{result2?.offer?.studentId || "—"}</span>
                    </p>
                </div>
            )}

            {/* Final status box */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <p className="text-slate-300 mb-2">Step 3: Final Status</p>

                {step < 3 ? (
                    <p className="text-slate-400 text-sm">
                        Complete Step 1 and Step 2 to see final status.
                    </p>
                ) : (
                    <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                        <p className="text-slate-200 text-sm font-medium">
                            ✅ Eligibility + Document verification completed.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
