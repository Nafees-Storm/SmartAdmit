import { redirect } from "next/navigation";
import Image from "next/image";

import { getInterviewById } from "@/lib/actions/general.action";
import { getLatestFeedbackByInterviewId } from "@/lib/actions/general.action";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getRandomInterviewCover } from "@/lib/utils";
import DisplayTechIcons from "@/components/DisplayTechicons";
import FeedbackRadarChart from "@/components/FeedbackRadarChart";
import Link from "next/link";

const Page = async ({ params }: RouteParams) => {
    const { id: interviewId } = await params;

    const user = await getCurrentUser();
    if (!user) redirect("/sign-in");

    const interview = await getInterviewById(interviewId);
    if (!interview) redirect("/");

    const feedback = await getLatestFeedbackByInterviewId(interviewId, user.id);
    if (!feedback) {
        // No feedback yet – maybe show a message or redirect
        redirect(`/interview/${interviewId}`);
    }

    const { totalScore, categoryScores, strengths, areasForImprovement, finalAssessment } =
        feedback;

    return (
        <div className="flex flex-col gap-8 mt-6">
            {/* Header: interview + score */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-row justify-between gap-4 max-sm:flex-col">
                    <div className="flex flex-row gap-4 items-center max-sm:flex-col">
                        <div className="flex flex-row gap-4 items-center">
                            <Image
                                src={getRandomInterviewCover()}
                                alt="cover-image"
                                width={40}
                                height={40}
                                className="rounded-full object-cover size-[40px]"
                            />
                            <div>
                                <h2 className="capitalize text-xl font-semibold">
                                    {interview.role} Interview Feedback
                                </h2>
                                <p className="text-sm text-slate-400">
                                    Level: {interview.level} • Type: {interview.type}
                                </p>
                            </div>
                        </div>

                        <DisplayTechIcons techStack={interview.techstack} />
                    </div>

                    <div className="bg-dark-200 px-6 py-3 rounded-xl text-center">
                        <p className="text-sm text-slate-400">Overall Score</p>
                        <p className="text-3xl font-bold text-primary-100">
                            {Math.round(totalScore)}
                            <span className="text-base text-slate-400"> / 100</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Middle: Radar chart + category breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FeedbackRadarChart
                    data={categoryScores.map((c) => ({
                        category: c.category,
                        score: c.score,
                    }))}
                />

                <div className="bg-dark-200 rounded-xl p-4 flex flex-col gap-3">
                    <h3 className="font-semibold mb-1">Category Details</h3>
                    <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-2">
                        {categoryScores.map((cat) => (
                            <div
                                key={cat.category}
                                className="border border-dark-300 rounded-lg p-3 flex flex-col gap-1"
                            >
                                <div className="flex justify-between items-center">
                                    <p className="font-medium">{cat.category}</p>
                                    <span className="text-sm bg-dark-300 px-2 py-1 rounded-md">
                    {Math.round(cat.score)} / 100
                  </span>
                                </div>
                                <p className="text-sm text-slate-300">{cat.comment}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom: Strengths & Areas for Improvement */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-dark-200 rounded-xl p-4">
                    <h3 className="font-semibold mb-2">Strengths</h3>
                    {strengths.length ? (
                        <ul className="list-disc list-inside space-y-1 text-sm text-green-300">
                            {strengths.map((point, idx) => (
                                <li key={idx}>{point}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-slate-400">
                            No strengths detected for this interview.
                        </p>
                    )}
                </div>

                <div className="bg-dark-200 rounded-xl p-4">
                    <h3 className="font-semibold mb-2">Areas for Improvement</h3>
                    {areasForImprovement.length ? (
                        <ul className="list-disc list-inside space-y-1 text-sm text-red-300">
                            {areasForImprovement.map((point, idx) => (
                                <li key={idx}>{point}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-slate-400">
                            No improvement suggestions available.
                        </p>
                    )}
                </div>
            </div>

            {/* Final assessment / summary */}
            <div className="bg-dark-200 rounded-xl p-4">
                <h3 className="font-semibold mb-2">Overall Feedback</h3>
                <p className="text-sm text-slate-200 leading-relaxed">
                    {finalAssessment}
                </p>
            </div>
            <div className="flex justify-center mt-12 mb-16">
                <Link href="/interview">
                    <button
                        className="
                px-8 py-3 rounded-xl font-semibold text-white
                bg-gradient-to-r from-indigo-500 to-purple-600
                shadow-lg shadow-indigo-800/30
                transition-all duration-300
                hover:scale-105 hover:from-purple-600 hover:to-indigo-500
                hover:shadow-purple-700/40
            "
                    >
                        Back to Interview Dashboard
                    </button>
                </Link>
            </div>
        </div>
    );
};

export default Page;
