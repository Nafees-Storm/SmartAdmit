"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import {interviewer} from "@/constants ";
import {createFeedback} from "@/lib/actions/general.action";

enum CallStatus {
    INACTIVE = "INACTIVE",
    CONNECTING = "CONNECTING",
    ACTIVE = "ACTIVE",
    FINISHED = "FINISHED",
}

interface SavedMessage {
    role: "user" | "system" | "assistant";
    content: string;
}

interface AgentProps {
    userName: string;
    userId: string;
    type: "generate" | "mock";
    questions?: string[];
    interviewId: string;
}

const Agent: React.FC<AgentProps> = ({ userName, userId, type,interviewId, questions  }) => {
    const router = useRouter();

    const [isSpeaking, setIsSpeaking] = useState(false);
    const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
    const [messages, setMessages] = useState<SavedMessage[]>([]);

    // Stores the user's spoken answers
    const [interviewConfig, setInterviewConfig] = useState({
        role: "",
        interviewType: "", // technical / behavioural / mixed
        level: "",
        techstack: "",
        amount: "",
    });

    // Tracks which answer we're capturing (ref so it doesn't cause re-renders)
    // 0 = none yet
    // 1 = role
    // 2 = interviewType
    // 3 = level
    // 4 = techstack
    // 5 = amount
    const configStepRef = useRef(0);

    // Make sure generateInterview runs only once per call
    const hasGeneratedRef = useRef(false);

    const generateInterview = async () => {
        try {
            const { role, interviewType, level, techstack, amount } = interviewConfig;

            // Guard: if something is missing, don't call the API
            if (!role || !interviewType || !level || !techstack || !amount) {
                console.warn(
                    "Interview config incomplete, skipping generation:",
                    interviewConfig
                );
                return;
            }

            const body = {
                type: interviewType, // your route.ts expects `type`
                role,
                level,
                techstack,
                amount,
                userid: userId, // IMPORTANT: must be `userid` to match route.ts
            };

            const res = await fetch("/api/vapi/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            console.log("Generate interview result:", data);

            if (!res.ok || !data.success) {
                console.error("Failed to generate interview", data);
            }
        } catch (err) {
            console.error("Error calling /api/vapi/generate:", err);
        }
    };

    // Set up Vapi event listeners
    useEffect(() => {
        const onCallStart = () => setCallStatus(CallStatus.ACTIVE);
        const onCallEnd = () => setCallStatus(CallStatus.FINISHED);

        const onMessage = (message: any) => {
            if (message.type === "transcript" && message.transcriptType === "final") {
                const newMessage: SavedMessage = {
                    role: message.role,
                    content: message.transcript,
                };

                setMessages((prev) => [...prev, newMessage]);

                // Capture config only from USER answers, in the fixed order:
                // 1. role
                // 2. interviewType
                // 3. level
                // 4. techstack
                // 5. amount
                if (message.role === "user" && configStepRef.current < 5) {
                    const answer = message.transcript.trim();
                    const step = configStepRef.current;

                    setInterviewConfig((prev) => {
                        const next = { ...prev };

                        if (step === 0) {
                            // 1st user answer: role
                            next.role = answer;
                        } else if (step === 1) {
                            // 2nd: interview type
                            next.interviewType = answer;
                        } else if (step === 2) {
                            // 3rd: level
                            next.level = answer;
                        } else if (step === 3) {
                            // 4th: tech stack
                            next.techstack = answer;
                        } else if (step === 4) {
                            // 5th: amount
                            next.amount = answer;
                        }

                        return next;
                    });

                    configStepRef.current = step + 1;
                }
            }
        };

        const onSpeechStart = () => setIsSpeaking(true);
        const onSpeechEnd = () => setIsSpeaking(false);
        const onError = (error: Error) => console.log("Vapi error:", error);

        vapi.on("call-start", onCallStart);
        vapi.on("call-end", onCallEnd);
        vapi.on("message", onMessage);
        vapi.on("speech-start", onSpeechStart);
        vapi.on("speech-end", onSpeechEnd);
        vapi.on("error", onError);

        return () => {
            vapi.off("call-start", onCallStart);
            vapi.off("call-end", onCallEnd);
            vapi.off("message", onMessage);
            vapi.off("speech-start", onSpeechStart);
            vapi.off("speech-end", onSpeechEnd);
            vapi.off("error", onError);
        };
    }, []);

    const handleGenerateFeedback = async (messages: SavedMessage[]) => {
        console.log("handleGenerateFeedback");

        const {success, feedbackId:id} = await createFeedback({

            interviewId: interviewId!,
            userId: userId!,
            transcript : messages

        })

        if (success && id) {
            router.push(`/interview/${interviewId}/feedback`);
        } else {
            console.log("Error saving feedback");
            router.push("/");
        }
    };

    // When the call finishes, generate the interview once, then redirect
    useEffect(() => {
        // Only run once per call, when it actually finishes
        if (callStatus !== CallStatus.FINISHED || hasGeneratedRef.current) return;

        hasGeneratedRef.current = true;

        if (type === "generate") {
            // 1) Interview generation flow (your current behaviour)
            (async () => {
                await generateInterview();
                router.push("/"); // or "/interviews"
            })();
        } else {
            // 2) Feedback / mock interview flow (matches tutorial idea)
            handleGenerateFeedback(messages);
        }
    }, [callStatus, type, messages, router]);

    const handleCall = async () => {
        try {
            // Reset “already generated” flag for this call
            hasGeneratedRef.current = false;
            setCallStatus(CallStatus.CONNECTING);

            // ---------- GENERATE MODE (create interview) ---------- //
            if (type === "generate") {
                // Use your config-collector assistant (asks role, type, level, etc.)
                await vapi.start(
                    process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID!, // must exist in .env.local
                    {
                        variableValues: {
                            username: userName ?? "",
                            userid: userId ?? "",
                        },
                    }
                );

                // When the call finishes, your useEffect will:
                // - call generateInterview()
                // - redirect with router.push("/")

                // ---------- MOCK / FEEDBACK MODE (use saved questions) ---------- //
            } else {
                let formattedQuestions = "";

                if (questions && questions.length > 0) {
                    formattedQuestions = questions
                        .map((question) => `- ${question}`)
                        .join("\n");
                }

                // Use the `interviewer` assistant you defined in index.ts
                await vapi.start(interviewer, {
                    variableValues: {
                        questions: formattedQuestions,
                    },
                });
            }
        } catch (e) {
            console.error("Error starting Vapi call", e);
            setCallStatus(CallStatus.INACTIVE);
        }
    };

    const handleDisconnect = async () => {
        setCallStatus(CallStatus.FINISHED);
        try {
            await vapi.stop();
        } catch (e) {
            console.error("Error stopping Vapi call", e);
        }
    };

    const latestMessage = messages[messages.length - 1]?.content;
    const isCallInactiveOrFinished =
        callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED;

    return (
        <>
            <div className="call-view">
                <div className="card-interviewer">
                    <div className="avatar">
                        <Image
                            src="/ai-avatar.png"
                            alt="vapi"
                            width={65}
                            height={54}
                            className="object-center"
                        />
                        {isSpeaking && <span className="animate-speak" />}
                    </div>

                    <h3>AI Interviewer</h3>
                </div>

                <div className="card-border">
                    <div className="card-content">
                        <Image
                            src="/ai-avatar.png"
                            alt="user avatar"
                            width={540}
                            height={540}
                            className="rounded-full object-cover size-[120px]"
                        />
                        <h3>{userName}</h3>
                    </div>
                </div>
            </div>

            {messages.length > 0 && (
                <div className="transcript-border">
                    <div className="transcript">
                        <p
                            key={latestMessage}
                            className={cn(
                                "transition-opacity duration-500 opacity-0",
                                "animate-fadeIn opacity-100"
                            )}
                        >
                            {latestMessage}
                        </p>
                    </div>
                </div>
            )}

            <div className="w-full flex justify-center">
                {callStatus !== CallStatus.ACTIVE ? (
                    <button className="relative btn-call" onClick={handleCall}>
            <span
                className={cn(
                    "absolute animate-ping rounded-full opacity-75",
                    callStatus !== CallStatus.CONNECTING && "hidden"
                )}
            />
                        <span>{isCallInactiveOrFinished ? "Call" : "..."}</span>
                    </button>
                ) : (
                    <button className="btn-disconnect" onClick={handleDisconnect}>
                        END
                    </button>
                )}
            </div>
        </>
    );
};

export default Agent;
