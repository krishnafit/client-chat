import React, { useState, useRef, useEffect } from 'react';
import SimplePeer from 'simple-peer';

const AudioCall = () => {
  const [stream, setStream] = useState(null);
  const [peer, setPeer] = useState(null);
  const [connected, setConnected] = useState(false);

  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Set up WebSocket connection
    socketRef.current = new WebSocket('ws://52.66.202.16:8080');

    socketRef.current.onmessage = async (message) => {
      try {
        const data = typeof message.data === 'string' 
          ? JSON.parse(message.data) 
          : JSON.parse(await message.data.text());
    
        if (data.type === 'offer' && !peer) {
          const newPeer = new SimplePeer({ initiator: false, trickle: false, stream });
          setPeer(newPeer);
    
          newPeer.on('signal', (signal) => {
            socketRef.current.send(JSON.stringify({ type: 'answer', signal }));
          });
    
          newPeer.signal(data.signal);
    
          newPeer.on('stream', (remoteStream) => {
            remoteAudioRef.current.srcObject = remoteStream;
          });
    
          setConnected(true);
        } else if (data.type === 'answer' && peer) {
          peer.signal(data.signal);
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    };
    

    // Clean up on unmount
    return () => {
      socketRef.current.close();
    };
  }, [peer, stream]);

  const startCall = async () => {
    // Get local audio stream
    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setStream(audioStream);

    // Set local audio stream
    if (localAudioRef.current) {
      localAudioRef.current.srcObject = audioStream;
    }

    // Create a peer connection
    const newPeer = new SimplePeer({ initiator: true, trickle: false, stream: audioStream });
    setPeer(newPeer);

    newPeer.on('signal', (signal) => {
      socketRef.current.send(JSON.stringify({ type: 'offer', signal }));
    });

    newPeer.on('stream', (remoteStream) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    });

    setConnected(true);
  };

  return (
    <div>
      <h2>Audio Call</h2>
      <audio ref={localAudioRef} autoPlay muted />
      <audio ref={remoteAudioRef} autoPlay />
      {!connected && <button onClick={startCall}>Start Call</button>}
    </div>
  );
};

export default AudioCall;
