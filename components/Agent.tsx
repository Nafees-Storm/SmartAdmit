'use client';

import React, {useEffect, useState} from 'react'
import Image from "next/image";
import {cn} from "@/lib/utils";
import {useRouter} from "next/navigation";
import {vapi} from "@/lib/vapi.sdk";


enum CallStatus {
    INACTIVE = 'INACTIVE',
    CONNECTING = 'CONNECTING',
    ACTIVE = 'ACTIVE',
    FINISHED = 'FINISHED',
}

interface SavedMessage {
    role : 'user' | 'system' | 'assistant';
    content : string;
}


const Agent = ({userName,userId,type}: AgentProps) => {

    const router = useRouter();
    const[isSpeaking, setIsSpeaking] = useState(false);
    const[callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
    const [messages, setMessages] = useState<SavedMessage[]>([]);

    useEffect(() => {
            const onCallStart = () => setCallStatus(CallStatus.ACTIVE);
            const onCallEnd = () => setCallStatus(CallStatus.FINISHED);

            const onMessage = (message:Message) => {
                 if (message.type === 'transcript' && message.transcriptType === 'final') {
                     const newMessage = {role:message.role,content: message.transcript}

                     setMessages((prev)=>[...prev,newMessage]);

                 }

            }

                const onSpeechStart =() => setIsSpeaking(true);
                const onSpeechEnd =() => setIsSpeaking(false);

                const onError = (error:Error) => console.log('Error',error);

                vapi.on('call-start',onCallStart);
                vapi.on('call-end',onCallEnd);
                vapi.on('message',onMessage);
                vapi.on('speech-start',onSpeechStart);
                vapi.on('speech-end',onSpeechEnd);
                vapi.on('error',onError);

                return () => {

                    vapi.off('call-start',onCallStart);
                    vapi.off('call-end',onCallEnd);
                    vapi.off('message',onMessage);
                    vapi.off('speech-start',onSpeechStart);
                    vapi.off('speech-end',onSpeechEnd);
                    vapi.off('error',onError);
                }

    },[])

    useEffect(() => {

        if(callStatus === CallStatus.FINISHED) router.push('/');


    },[messages,callStatus,type,userId]);

    const handleCall = async () => {
        try {
            setCallStatus(CallStatus.CONNECTING);

            await vapi.start(
                null, // assistantId (we're using workflow instead)
                {
                    // assistantOverrides / call config
                    variableValues: {
                        username: userName ?? "",
                        userid: userId ?? "",
                    },
                },
                null, // customer (optional)
                process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID // workflowId
            );
        } catch (e) {
            console.error("Error starting Vapi call", e);
            setCallStatus(CallStatus.INACTIVE);
        }
    };

    const handleDisconnect = async () => {

        setCallStatus(CallStatus.FINISHED);
        await vapi.stop();

    }

    const lastestMessage = messages[messages.length - 1]?.content;

    const isCallInactiveORFinished= callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED;


    return (

        <>

        <div className="call-view" >
            <div className="card-interviewer" >
                <div className='avatar' >
                    <Image src='/ai-avatar.png' alt='vapi' width={65} height={54} className='object-center' />

                    {isSpeaking && <span className='animate-speak' />}
                </div>

                <h3>AI Interviewer</h3>
            </div>

                <div className='card-border' >
                    <div className='card-content'>
                        <Image src='/ai-avatar.png' alt='user avatar' width='540' height='540' className='rounded-full object-cover size-[120px]' />

                        <h3>{userName}</h3>



                    </div>

                </div>

            </div>
            {messages.length > 0 && (
                <div className='transcript-border' >
                    <div className='transcript' >

                        <p key ={lastestMessage} className={cn('transition-opacity duration-500 opacity-0', 'animate-fadeIn opacity-100')} >

                            {lastestMessage}
                        </p>

                    </div>

                </div>

            )}

            <div className="w-full flex justify-center" >

                {callStatus !== CallStatus.ACTIVE ? (
                    <button className="relative btn-call" onClick={handleCall}>
                     <span
        className={cn(
            "absolute animate-ping rounded-full opacity-75",
            callStatus !== CallStatus.CONNECTING && "hidden"
        )}
                    />
                        <span>
      {isCallInactiveORFinished ? "Call" : "..."}
                        </span>
                    </button>
                ) : (
                    <button className="btn-disconnect" onClick={handleDisconnect}>
                        END
                    </button>
                )}



            </div>



            </>

    )
}

export default Agent;