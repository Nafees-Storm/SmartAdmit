"use server";

import { db, auth } from "@/firebase/admin";
import { cookies } from "next/headers";

const ONE_WEEK = 60 * 60 * 24 * 7;

// Adjust these to match your actual types
type SignUpParams = {
    uid: string;
    name: string;
    email: string;

};

type SignInParams = {
    email: string;
    idToken: string;

};

export async function signUp(params: SignUpParams) {
    const { uid, name, email } = params;

    if (!uid) {
        return {
            success: false,
            message: "User ID (uid) is missing when creating the user.",
        };
    }

    try {
        console.log("Creating user in Firestore with UID:", uid);
        console.log("Using project:", process.env.FIREBASE_PROJECT_ID);

        const userDocRef = db.collection("users").doc(uid);

        // ❌ REMOVE THIS:
        // const userDoc = await userDocRef.get();
        // if (userDoc.exists) {
        //   return {
        //     success: false,
        //     message: "User already exists",
        //   };
        // }

        // ✅ Just write the profile – Firestore will create the doc if it doesn't exist
        await userDocRef.set(
            {
                name,
                email,
                createdAt: new Date(),
            },
            { merge: true } // safe even if doc already exists
        );

        return {
            success: true,
            message: "Account created successfully. Please sign in.",
        };
    } catch (e: any) {
        console.error("Error creating a user:", e, "code:", e.code);

        return {
            success: false,
            message: "Failed to create an account.",
        };
    }
}


export async function signIn(params: SignInParams) {
    const { email, idToken } = params;

    try {
        const userRecord = await auth.getUserByEmail(email);

        if (!userRecord) {
            return {
                success: false,
                message: "User does not exist.",
            };
        }

        await setSessionCookie(idToken);

        return {
            success: true,
            message: "Logged in successfully.",
        };
    } catch (e: any) {
        console.error("Error signing in:", e);

        if (e.code === "auth/user-not-found") {
            return {
                success: false,
                message: "No user found with this email.",
            };
        }

        return {
            success: false,
            message: "Failed to login.",
        };
    }
}

export async function setSessionCookie(idToken: string) {
    const cookieStore = await cookies();

    const sessionCookie = await auth.createSessionCookie(idToken, {
        expiresIn: ONE_WEEK * 1000,
    });

    cookieStore.set("session", sessionCookie, {
        maxAge: ONE_WEEK,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: "lax",
    });
}


export async function getCurrentUser(): Promise<User |null>{

    const cookieStore = await cookies();

    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) return null;

    try {

        const decodedClaims = await auth.verifySessionCookie(sessionCookie,true);

        const userRecord = await db.collection("users").doc(decodedClaims.uid).get();

        if(!userRecord.exists) return null;

        return {
            ... userRecord.data(),
            id: userRecord.id,
        } as User;


    } catch (e){
        console.log(e)

        return null;
    }
}


// Check if user is authenticated
export async function isAuthenticated() {
    const user = await getCurrentUser();
    return !!user;
}

