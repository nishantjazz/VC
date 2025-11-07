import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import SimplePeer from 'simple-peer';
import '../App.css';

// Use environment variable for server URL
const socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:4000');

const Home = () => {
  const myVideoRef = useRef();
  const peerVideoRef = useRef();
  const connectionRef = useRef();

  const [stream, setStream] = useState(null);
  const [userId, setUserId] = useState('');
  const [isCallAccepted, setIsCallAccepted] = useState(false);
  const [incominCallInfo, setIncominCallInfo] = useState({});

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((mediaStream) => {
        setStream(mediaStream);
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = mediaStream;
        }
      }).catch((error) => console.error('Error accessing media devices:', error));

    socket.on('incomingCall', handleIncomingCall);
    socket.on('callEnded', destroyConnection);

    const handleBeforeUnload = () => {
    socket.emit('userReloading');
    };
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

    if (userId) {
      const peer = new SimplePeer({
        initiator: true,
        trickle: false,
        stream,
      });

      peer.on('signal', (signalData) => {
        socket.emit('initiateCall', { userId, signalData, myId: socket?.id });
      });

      peer.on('stream', (remoteStream) => {
        if (peerVideoRef.current) {
          peerVideoRef.current.srcObject = remoteStream;
        }
      });

      socket.on('callAccepted', (signal) => {
        setIsCallAccepted(true);
        peer.signal(signal);
      });

      connectionRef.current = peer;
    } else {
      alert('Enter user id to initiate a call');
    }

  };

  const answerCall = () => {

    setIsCallAccepted(true);

    const peer = new SimplePeer({ initiator: false, trickle: false, stream: stream });

    peer.on('signal', (data) => {
      socket.emit('answerCall', { signal: data, to: incominCallInfo.from });
    });

    peer.on('stream', (currentStream) => {
      if (peerVideoRef.current) {
        peerVideoRef.current.srcObject = currentStream;
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
    if (connectionRef.current) {
      connectionRef.current.destroy();
    }
    // Using window.location.reload() is a hard reset.
    // A softer reset might be better:
    setIsCallAccepted(false);
    setIncominCallInfo({});
    setUserId('');
    if (peerVideoRef.current) {
      peerVideoRef.current.srcObject = null;
    }
    // Re-get media if stream was stopped
    // Or simply:
    window.location.reload();
  };

  return (
    <div className="flex flex-col item-center">
      <h2 className='text-center'>Video Calling MERN App</h2>

      <div className='flex flex-col w-300 gap-4'>
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="Enter User ID"
          className='input'
        />
        <button onClick={initiateCall} className="input text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-900">Call user</button>
      </div>

      <section className='m-4'>My ID: <u><i>{socket?.id}</i></u></section>

      <div className='flex flex-row gap-4 m-4 mb-8'>
        <div>
          <h3 className='text-center'>My Video</h3>
          <video ref={myVideoRef} autoPlay playsInline muted className='video_player' />
        </div>

        {isCallAccepted &&
          <div>
            <h3 className='text-center'>Peer Video</h3>
            <video ref={peerVideoRef} autoPlay playsInline className='video_player' />
          </div>
        }
      </div>

      {isCallAccepted ?
        <button className="input text-white bg-red-600 hover:bg-red-700 active:bg-red-900" onClick={endCall}>End Call</button>
        :
        (incominCallInfo?.isSomeoneCalling) &&
        <div className='flex flex-col mb-8'>
          <section className='m-4'><u>{incominCallInfo?.from}</u> is calling</section>
          <button onClick={answerCall} className="input text-white bg-green-600 hover:bg-green-700 active:bg-green-900">Answer call</button>
        </div>
      }
    </div>
  );
}

export default Home;