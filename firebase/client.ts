// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDWULaRRmoRfGOzAYStJ_TUPH2k0e4XPTQ",
    authDomain: "prepwise-961e7.firebaseapp.com",
    projectId: "prepwise-961e7",
    storageBucket: "prepwise-961e7.firebasestorage.app",
    messagingSenderId: "46361927210",
    appId: "1:46361927210:web:32ed9138f3657cb8162d53",
    measurementId: "G-25RZH0RWV5"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
// const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);