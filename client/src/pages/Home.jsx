import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import SimplePeer from 'simple-peer';
import VoiceEmotionBadge from "../components/VoiceEmotionBadge";
import '../App.css';

const socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:4000');

const Home = () => {
  const myVideoRef = useRef();
  const peerVideoRef = useRef();
  const connectionRef = useRef();

  const [peerStream, setPeerStream] = useState(null);
  const [stream, setStream] = useState(null);
  const [userId, setUserId] = useState('');
  const [isCallAccepted, setIsCallAccepted] = useState(false);
  const [incominCallInfo, setIncominCallInfo] = useState({});
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [callSent, setCallSent] = useState(false);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ 
      video: true,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false
      }
    })
    .then((mediaStream) => {
      setStream(mediaStream);
      if (myVideoRef.current) myVideoRef.current.srcObject = mediaStream;
    })
    .catch((error) => console.error('Error accessing media devices:', error));

    socket.on('incomingCall', handleIncomingCall);
    socket.on('callEnded', destroyConnection);

    const handleBeforeUnload = () => socket.emit('userReloading');
    window.addEventListener('beforeunload', handleBeforeUnload);

    socket.on('peerReloaded', ({ id }) => {
      console.warn(`Peer ${id} reloaded — ending call.`);
      destroyConnection();
    });

    socket.on('peerDisconnected', ({ id }) => {
      console.warn(`Peer ${id} disconnected — ending call.`);
      destroyConnection();
    });

    return () => {
      socket.off('incomingCall', handleIncomingCall);
      socket.off('callEnded', destroyConnection);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      socket.off('peerReloaded');
      socket.off('peerDisconnected');
    };
  }, []);

  const handleIncomingCall = ({ from, signalData }) => {
    setIncominCallInfo({ isSomeoneCalling: true, from, signalData });
  };

  const initiateCall = () => {
    if (!userId) return alert('Enter user id to initiate a call');

    const peer = new SimplePeer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on('signal', (signalData) => {
      socket.emit('initiateCall', { userId, signalData, myId: socket?.id });
    });

    peer.on('stream', (remoteStream) => {
      if (peerVideoRef.current){
        peerVideoRef.current.srcObject = remoteStream;
        setPeerStream(remoteStream);
      }
    });

    socket.on('callAccepted', (signal) => {
      setIsCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;

    showCallReqSent();

  };

  const showCallReqSent = () =>{
    setCallSent(true);

      setTimeout(() => {
        setCallSent(false);
      }, 5000);
  };

  const answerCall = () => {
    setIsCallAccepted(true);

    const peer = new SimplePeer({ initiator: false, trickle: false, stream });
    peer.on('signal', (data) => {
      socket.emit('answerCall', { signal: data, to: incominCallInfo.from });
    });

    peer.on('stream', (currentStream) => {
      if (peerVideoRef.current){
        peerVideoRef.current.srcObject = currentStream;
        setPeerStream(currentStream);
      }
    });

    peer.signal(incominCallInfo.signalData);
    connectionRef.current = peer;
  };

  const endCall = () => {
    socket.emit('endCall', { to: incominCallInfo.from });
    destroyConnection();
  };

  const destroyConnection = () => {
    if (connectionRef.current) connectionRef.current.destroy();
    setIsCallAccepted(false);
    setIncominCallInfo({});
    setUserId('');
    if (peerVideoRef.current){
      peerVideoRef.current.srcObject = null;
      setPeerStream(null);
    }
    window.location.reload();
  };

  // Toggle mic
  const toggleAudio = () => {
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setAudioEnabled(audioTrack.enabled);
    }
  };

  // Toggle camera
  const toggleVideo = () => {
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setVideoEnabled(videoTrack.enabled);
    }
  };

  return (
    <div className="flex flex-col items-center p-4">
      <h2 className='text-center text-2xl mb-4'>Video Calling MERN App</h2>

      <div className='flex flex-col w-300 gap-4 mb-4'>
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="Enter User ID"
          className='input'
        />
        <button onClick={initiateCall} className="input text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-900">Call user</button>

        {callSent && 
          <div className='flex justify-center'>
            Call Request Sent!
          </div>
        }
      </div>

      <section className='m-4'>My ID: <u><i>{socket?.id}</i></u></section>

      <div className='flex flex-row gap-4 m-4 mb-2'>
        <div className="flex flex-col items-center">
          <h3 className='text-center'>My Video</h3>
          <video
            ref={myVideoRef}
            autoPlay
            playsInline
            muted
            className='video_player'
          />
          <div className="flex gap-2 mt-2">
            <button onClick={toggleAudio} className="px-3 py-1 bg-blue-500 text-white rounded">
              {audioEnabled ? "Mute Mic" : "Unmute Mic"}
            </button>
            <button onClick={toggleVideo} className="px-3 py-1 bg-green-500 text-white rounded">
              {videoEnabled ? "Turn Off Camera" : "Turn On Camera"}
            </button>
          </div>
        </div>

        {isCallAccepted &&
          <div className="flex flex-col items-center">
            <h3 className='text-center'>Peer Video</h3>
            <video
              ref={peerVideoRef}
              autoPlay
              playsInline
              className='peer_player'
            />
          </div>
        }
      </div>

      {isCallAccepted ? (
        <button className="input text-white bg-red-600 hover:bg-red-700 active:bg-red-900" onClick={endCall}>End Call</button>
      ) : (
        incominCallInfo?.isSomeoneCalling && (
          <div className='flex flex-col mb-8'>
            <section className='m-4'><u>{incominCallInfo?.from}</u> is calling</section>
            <button onClick={answerCall} className="input text-white bg-green-600 hover:bg-green-700 active:bg-green-900">Answer call</button>
          </div>
        )
      )}

      {isCallAccepted && peerStream && (
        <VoiceEmotionBadge audioStream={peerVideoRef.current.srcObject} />
      )}

    </div>
  );
}

export default Home;
