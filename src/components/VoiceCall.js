import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:4000');

const VoiceCall = () => {
    const localStreamRef = useRef(null);
    const remoteStreamRef = useRef(null);
    const pcRef = useRef(null);
    const [isCallActive, setIsCallActive] = useState(false);

    useEffect(() => {
        const initPC = () => {
            console.log('Initializing Peer Connection');
            const pc = new RTCPeerConnection();
            pcRef.current = pc;

            pc.onicecandidate = event => {
                if (event.candidate) {
                    console.log('Sending ICE candidate');
                    socket.emit('candidate', event.candidate);
                }
            };

            pc.ontrack = event => {
                console.log('Received remote track');
                remoteStreamRef.current.srcObject = event.streams[0];
            };
        };

        // Initialize PeerConnection only if it hasn't been initialized yet
        if (!pcRef.current) {
            initPC();
        }

        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(stream => {
                console.log('Local stream obtained');
                localStreamRef.current.srcObject = stream;
                stream.getTracks().forEach(track => pcRef.current.addTrack(track, stream));
            })
            .catch(error => {
                console.error('Error obtaining local stream', error);
            });

        socket.on('offer', async (offer) => {
            console.log('Received offer');
            if (pcRef.current.signalingState !== 'stable') {
                console.log('Skipping offer: not stable');
                return;
            }
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            socket.emit('answer', answer);
        });

        socket.on('answer', async (answer) => {
            console.log('Received answer');
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        });

        socket.on('candidate', async (candidate) => {
            console.log('Received ICE candidate');
            try {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
                console.error('Error adding received ICE candidate', error);
            }
        });

        // Cleanup on component unmount
        return () => {
            console.log('Cleaning up');
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }
            socket.off('offer');
            socket.off('answer');
            socket.off('candidate');
        };
    }, []);

    const createOffer = async () => {
        setIsCallActive(true);
        if (!pcRef.current || pcRef.current.signalingState === 'closed') {
            pcRef.current = new RTCPeerConnection();
        }
        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);
        socket.emit('offer', offer);
    };

    return (
        <div>
            <h1>Voice Call</h1>
            <button onClick={createOffer} disabled={isCallActive}>Call</button>
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
