// app/(root)/interview/page.tsx (example path)
import React from "react";
import Agent from "@/components/Agent";
import { getCurrentUser } from "@/lib/actions/auth.action";

const Page = async () => {
    const user = await getCurrentUser();

    if (!user?.id) {
        return <p>You must be signed in to start an interview.</p>;
    }

    return (
        <>
            <h3>Interview Generation</h3>
            <Agent userName={user.name} userId={user.id} type="generate" />
        </>
    );
};

export default Page;
