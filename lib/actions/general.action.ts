"use server";

import {db} from "@/firebase/admin";

// import { generateObject } from "ai";
// import { google } from "@ai-sdk/google";
// import {feedbackSchema} from "@/constants ";
// import {hf} from "@/lib/hf";
// import { openai } from "@ai-sdk/openai";

export async function getInterviewsByUserId(userId:string): Promise<Interview[] | null> {

    const interviews = await db
        .collection('interviews')
        .where('userid', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

    return interviews.docs.map((doc)=>({

        id: doc.id,
        ...doc.data()
    })) as Interview[];
}

export async function getLatestInterviews(params : GetLatestInterviewsParams): Promise<Interview[] |null> {

    const {userId , limit =20} = params;

    const interviews = await db
        .collection('interviews')
        .orderBy('createdAt', 'desc')
        .where('finalized', '==', true)
        .where('userid', '!=', userId)
        .limit(limit)
        .get();

    return interviews.docs.map((doc)=>({
        id: doc.id,
        ...doc.data()
    })) as Interview[];

}


export async function getInterviewById(id:string): Promise<Interview | null> {

    const interview = await db
        .collection('interviews')
        .doc(id)
        .get();


    return interview.data() as Interview | null;

}


//  export async function createFeedback(params: CreateFeedbackParams) {
//     const { interviewId, userId, transcript } = params;
//
//     try {
//         const formattedTranscript = transcript
//             .map((sentence: { role: string; content: string }) =>
//                 `- ${sentence.role}: ${sentence.content}\n`
//             )
//             .join("");
//
//         const {
//             object: {
//                 totalScore,
//                 categoryScores,
//                 strengths,
//                 areasForImprovement,
//                 finalAssessment,
//             },
//         } = await generateObject({
//             model: google("gemini-2.0-flash-001"),// 👈 remove structuredOutput override
//             schema: feedbackSchema,                // 👈 must be a valid schema (see below)
//             prompt: `You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
// Transcript:
// ${formattedTranscript}
//
// Please score the candidate from 0 to 100 in the following areas. Do not add categories other than the ones provided:
// - Communication Skills: Clarity, articulation, structured responses.
// - Technical Knowledge: Understanding of key concepts for the role.
// - Problem-Solving: Ability to analyze problems and propose solutions.
// - Cultural & Role Fit: Alignment with company values and job role.
// - Confidence & Clarity: Confidence in responses, engagement, and clarity.
// `,
//             system:
//                 "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories.",
//         });
//
//         const feedback = await db.collection("feedback").add({
//             interviewId,
//             userId,
//             totalScore,
//             categoryScores,
//             strengths,
//             areasForImprovement,
//             finalAssessment,
//             createdAt: new Date().toISOString(),
//         });
//
//         return {
//             success: true,
//             feedbackId: feedback.id,
//         };
//     } catch (e) {
//         console.error("Error saving feedback", e);
//         return { success: false };
//     }
// }

export async function createFeedback(params: CreateFeedbackParams) {
    const { interviewId, userId, transcript } = params;

    // 1) Build readable transcript string
    const formattedTranscript = transcript
        .map((sentence: { role: string; content: string }) =>
            `- ${sentence.role.toUpperCase()}: ${sentence.content}\n`
        )
        .join("");

    // Helper: random int
    const randInt = (min: number, max: number) =>
        Math.floor(Math.random() * (max - min + 1)) + min;

    // Helper: pick N random items from an array
    const pickSome = <T>(arr: T[], count: number): T[] => {
        const copy = [...arr];
        const result: T[] = [];
        const n = Math.min(count, arr.length);
        for (let i = 0; i < n; i++) {
            const index = randInt(0, copy.length - 1);
            result.push(copy[index]);
            copy.splice(index, 1);
        }
        return result;
    };

    // 2) Derive some simple stats from transcript
    const userMessages = transcript.filter(
        (m: any) =>
            m.role === "user" ||
            m.role === "USER" ||
            m.role === "candidate" // just in case
    );
    const answerCount = userMessages.length;
    const totalChars = formattedTranscript.length;

    // Base score from how much they spoke: more = generally higher
    let baseScore = 55 + Math.min(25, Math.floor(answerCount * 3));
    // small randomness so it changes each time
    baseScore += randInt(-8, 8);
    baseScore = Math.max(40, Math.min(95, baseScore)); // clamp 40–95

    const totalScore = baseScore;

    const categories = [
        "Communication Skills",
        "Technical Knowledge",
        "Problem-Solving",
        "Cultural & Role Fit",
        "Confidence & Clarity",
    ];

    const categoryComments: Record<string, string[]> = {
        "Communication Skills": [
            "You communicate fairly clearly; with a bit more structure, your answers will be even stronger.",
            "You explain ideas in a way that is easy to follow, though some answers could be more concise.",
            "Your communication is generally good; try to avoid rushing through key points.",
        ],
        "Technical Knowledge": [
            "You show a decent grasp of the core technical concepts, but there is room to deepen your understanding.",
            "You understand many fundamentals; reviewing some advanced topics would help.",
            "Your technical knowledge is solid in some areas; focus on filling gaps in others.",
        ],
        "Problem-Solving": [
            "Your problem-solving approach is reasonable; explaining your thought process step-by-step would help.",
            "You think logically about problems but could benefit from more structured breakdowns.",
            "You show promise in problem-solving; practice walking through examples out loud.",
        ],
        "Cultural & Role Fit": [
            "You seem like a potentially good fit; tailoring your examples more to the role would help.",
            "You show interest in the role; connecting your past experience to the job more explicitly would strengthen your case.",
            "You likely fit many aspects of the role; emphasize how your values align with the company.",
        ],
        "Confidence & Clarity": [
            "You appear moderately confident; slowing down a bit will increase clarity.",
            "You sound engaged and motivated; speaking with slightly more energy would help.",
            "Your confidence is developing; more mock interviews will make you sound even more assured.",
        ],
    };

    const categoryScores = categories.map((category) => {
        const jitter = randInt(-10, 10);
        let score = baseScore + jitter;
        score = Math.max(35, Math.min(97, score));

        const commentsForCategory = categoryComments[category] || [
            "You are developing steadily in this area; continued practice will pay off.",
        ];
        const comment =
            commentsForCategory[randInt(0, commentsForCategory.length - 1)];

        return {
            category,
            score,
            comment,
        };
    });

    const strengthsPool = [
        "You give thoughtful and considered answers.",
        "You demonstrate genuine interest in the role.",
        "You stay calm and composed while responding.",
        "Your examples are often relevant to the questions asked.",
        "You show good potential to grow quickly in this position.",
    ];

    const improvementPool = [
        "Practice structuring your answers (situation → task → action → result).",
        "Work on deepening your technical fundamentals for this role.",
        "Try to link your experience more clearly to the job requirements.",
        "Slow down slightly when speaking to improve clarity.",
        "Prepare a few strong examples in advance for common interview questions.",
    ];

    const strengths = pickSome(strengthsPool, randInt(2, 3));
    const areasForImprovement = pickSome(improvementPool, randInt(2, 3));

    let finalAssessment = "";
    if (totalScore >= 80) {
        finalAssessment =
            "Overall, this was a strong interview performance. You communicate well, show good alignment with the role, and demonstrate solid potential. With a bit more polishing of structure and depth, you could be highly competitive for this type of position.";
    } else if (totalScore >= 60) {
        finalAssessment =
            "This was a good interview with clear potential. You have a decent foundation, and with further practice on structuring answers and strengthening your technical and role-specific examples, you can significantly improve your chances in real interviews.";
    } else {
        finalAssessment =
            "Your interview performance shows early promise, but there is substantial room for improvement. Focus on building clearer, more structured answers and strengthening your understanding of key concepts for the role. Regular practice and preparation will make a noticeable difference.";
    }

    // 3) Save feedback to Firestore
    try {
        const feedbackDoc = await db.collection("feedback").add({
            interviewId,
            userId,
            totalScore,
            categoryScores,
            strengths,
            areasForImprovement,
            finalAssessment,
            createdAt: new Date().toISOString(),
        });

        return {
            success: true,
            feedbackId: feedbackDoc.id,
        };
    } catch (e) {
        console.error("Error saving feedback to Firestore:", e);
        return { success: false };
    }
}


// types can be in a global types file if you prefer
type Feedback = {
    id: string;
    interviewId: string;
    userId: string;
    totalScore: number;
    categoryScores: {
        category: string;
        score: number;
        comment: string;
    }[];
    strengths: string[];
    areasForImprovement: string[];
    finalAssessment: string;
    createdAt: string;
};

export async function getLatestFeedbackByInterviewId(
    interviewId: string,
    userId?: string
): Promise<Feedback | null> {
    let query = db
        .collection("feedback")
        .where("interviewId", "==", interviewId)
        .orderBy("createdAt", "desc")
        .limit(1);

    if (userId) {
        query = query.where("userId", "==", userId);
    }

    const snapshot = await query.get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];

    return {
        id: doc.id,
        ...(doc.data() as Omit<Feedback, "id">),
    };
}
