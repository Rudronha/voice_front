import React, { useState } from 'react';
import io from 'socket.io-client';
import useWebRTC from './useWebRTC';

const socket = io(process.env.REACT_APP_BACKEND_URL);

const VoiceCall = () => {
    const { localStreamRef, remoteStreamRef, isMuted, toggleMute, createOffer } = useWebRTC(socket);
    const [isCallActive, setIsCallActive] = useState(false);

    const handleCall = () => {
        setIsCallActive(!isCallActive);
        createOffer();
    };

    return (
        <div>
            <h1>Voice Call</h1>
            <button onClick={handleCall} disabled={isCallActive}>Call</button>
            <button onClick={toggleMute}>
                {isMuted ? 'Unmute' : 'Mute'}
            </button>
            <div>
                <h2>Local Stream</h2>
                <audio ref={localStreamRef} autoPlay muted />
            </div>
            <div>
                <h2>Remote Stream</h2>
                <audio ref={remoteStreamRef} autoPlay />
            </div>
        </div>
    );
};

export default VoiceCall;
