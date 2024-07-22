import { useEffect, useRef, useState } from 'react';

const useWebRTC = (socket) => {
    const localStreamRef = useRef(null);
    const remoteStreamRef = useRef(null);
    const pcRef = useRef(null);
    const [isMuted, setIsMuted] = useState(false);

    const initPC = () => {
        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        pc.onicecandidate = event => {
            if (event.candidate) {
                socket.emit('candidate', event.candidate);
            }
        };

        pc.ontrack = event => {
            if (remoteStreamRef.current) {
                remoteStreamRef.current.srcObject = event.streams[0];
            }
        };
    };
   
    useEffect(() => {
        if (!pcRef.current) {
            initPC();
        }

        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(stream => {
                if (localStreamRef.current) {
                    localStreamRef.current.srcObject = stream;
                }
                stream.getTracks().forEach(track => pcRef.current.addTrack(track, stream));
            })
            .catch(error => {
                console.error('Error obtaining local stream', error);
            });

        socket.on('offer', async (offer) => {
            if (pcRef.current.signalingState !== 'stable') {
                return;
            }
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            socket.emit('answer', answer);
        });

        socket.on('answer', async (answer) => {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        });

        socket.on('candidate', async (candidate) => {
            try {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
                console.error('Error adding received ICE candidate', error);
            }
        });

        return () => {
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }
            socket.off('offer');
            socket.off('answer');
            socket.off('candidate');
        };
    }, [socket]);

    const toggleMute = () => {
        if (localStreamRef.current && localStreamRef.current.srcObject) {
            const audioTracks = localStreamRef.current.srcObject.getAudioTracks();
            if (audioTracks.length > 0) {
                audioTracks[0].enabled = !audioTracks[0].enabled;
                setIsMuted(!audioTracks[0].enabled);
            }
        }
    };

    const createOffer = async () => {
        if (!pcRef.current || pcRef.current.signalingState === 'closed') {
            pcRef.current = new RTCPeerConnection();
            initPC(); // Reinitialize if closed
        }
        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);
        socket.emit('offer', offer);
    };

    return {
        localStreamRef,
        remoteStreamRef,
        isMuted,
        toggleMute,
        createOffer,
    };
};

export default useWebRTC;
