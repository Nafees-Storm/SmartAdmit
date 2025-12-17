import React from "react";
import Link from "next/link";
import {Button} from "@/components/ui/button";
import Image from "next/image";
import InterviewCard from "@/components/InterviewCard";
import {getCurrentUser} from "@/lib/actions/auth.action";
import { getInterviewsByUserId, getLatestInterviews} from "@/lib/actions/general.action"


const Page= async () => {

    const user = await getCurrentUser();

    const [userInterviews, lastInterviews] = await Promise.all([

        await getInterviewsByUserId(user?.id!),

        await getLatestInterviews({userId:user?.id!})
    ])


    const  hasPastInterviews = userInterviews?.length > 0;
    const hasUpcomingInterviews = lastInterviews?.length > 0;

    return (

        <>
            <section className ="card-cta" >
                <div className='flex flex-col  gap-6 max-w-lg' >
                  <h2> Get Interview-Ready with AI-Powered Practice and Feedback
                  </h2>

                  <p className='text-lg' >
                      Practice on real interview questions and get instant feedback

                  </p>

                   <Button asChild className="btn-primary max-sm:w-full">
                       <Link href='/interview'>Start an Interview</Link >

                   </Button>
                </div>

                <Image src='/robot.png' alt='robo-dude' width={400} height={400} className='max-sm:hidden' />
            </section>

            <section className="flex flex-col gap-6 mt-8">
                <h2>Your Interviews</h2>

                <div className="interviews-section">

                    {hasPastInterviews ? (
                        userInterviews?.map((interview) => (
                            <InterviewCard {...interview} key ={interview.id}

                            />
                        ))
                    ) : (
                        <p>You haven&apos;t taken any interviews yet</p>
                    )}


                </div>

            </section>

            <section className="flex flex-col gap-6 mt-8" >
                <h2>Take an Interview</h2>

                <div className="interviews-section" >
                    {hasUpcomingInterviews ? (
                        lastInterviews?.map((interview) => (
                            <InterviewCard {...interview} key ={interview.id}

                            />
                        ))
                    ) : (
                        <p>There are no new interviews available</p>
                    )}


                </div>

            </section>

            {/* 🟢 Document Check Button at the bottom of main page */}
            <section className="flex justify-center mt-10 mb-10">
                <Button
                    asChild
                    className="
            px-8 py-3 rounded-xl font-semibold
            bg-gradient-to-r from-indigo-500 to-purple-600
            hover:from-purple-600 hover:to-indigo-500
            text-white shadow-lg shadow-indigo-800/30
            transition-all duration-300 hover:scale-105
          "
                >
                    <Link href="/document-check">Document Check</Link>
                </Button>
            </section>
        </>
    )
}
export default Page;