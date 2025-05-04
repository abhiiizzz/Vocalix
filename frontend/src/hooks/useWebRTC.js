import { useCallback, useEffect, useRef, useState } from "react";
import { socketInit } from "../socket";
import { ACTIONS } from "../actions";
import freeice from "freeice";

export const useWebRTC = (roomId, user) => {
  const [clients, setClients] = useState([]);
  const audioElements = useRef({});
  const remoteStreams = useRef({});
  const connections = useRef({});
  const localMediaStream = useRef(null);
  const socket = useRef(null);

  // Add a client if not already present.
  const addNewClient = useCallback((newClient, callback) => {
    setClients((existingClients) => {
      if (
        existingClients.find((client) => client.peerId === newClient.peerId)
      ) {
        return existingClients;
      }
      return [...existingClients, newClient];
    }, callback);
  }, []);

  // Setup a new peer connection.
  const handleNewPeer = useCallback(
    async ({ peerId, user: remoteUser, createOffer }) => {
      addNewClient({ ...remoteUser, peerId });

      if (connections.current[peerId]) {
        console.warn(`Already connected to peer ${peerId}`);
        return;
      }

      const pc = new RTCPeerConnection({
        iceServers: freeice(),
      });
      connections.current[peerId] = pc;

      pc.onicecandidate = (event) => {
        socket.current.emit(ACTIONS.RELAY_ICE, {
          peerId,
          icecandidate: event.candidate,
        });
      };

      pc.ontrack = ({ streams: [remoteStream] }) => {
        remoteStreams.current[peerId] = remoteStream;
        if (audioElements.current[peerId]) {
          audioElements.current[peerId].srcObject = remoteStream;
        }
      };

      localMediaStream.current.getTracks().forEach((track) => {
        pc.addTrack(track, localMediaStream.current);
      });

      if (createOffer) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.current.emit(ACTIONS.RELAY_SDP, {
          peerId,
          sessionDescription: offer,
        });
      }
    },
    [addNewClient]
  );

  const handleIceCandidate = useCallback(({ peerId, icecandidate }) => {
    if (icecandidate) {
      connections.current[peerId]?.addIceCandidate(icecandidate);
    }
  }, []);

  const handleRemoteSdp = useCallback(
    async ({ peerId, sessionDescription: remoteSessionDescription }) => {
      const connection = connections.current[peerId];
      if (!connection) return;
      await connection.setRemoteDescription(
        new RTCSessionDescription(remoteSessionDescription)
      );
      if (remoteSessionDescription.type === "offer") {
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);
        socket.current.emit(ACTIONS.RELAY_SDP, {
          peerId,
          sessionDescription: answer,
        });
      }
    },
    []
  );

  // Remove a peer connection and update state.
  const handleRemovePeer = useCallback(({ peerId }) => {
    if (connections.current[peerId]) {
      connections.current[peerId].close();
    }
    delete connections.current[peerId];
    delete audioElements.current[peerId];
    delete remoteStreams.current[peerId];
    setClients((list) => list.filter((client) => client.peerId !== peerId));
  }, []);

  // Remove a client (kick user) by emitting to the server.
  const removeClient = (peerId) => {
    socket.current.emit(ACTIONS.REMOVE_PEER, { peerId, roomId });
    handleRemovePeer({ peerId });
  };

  useEffect(() => {
    socket.current = socketInit();

    // Listen for full peer list updates.
    socket.current.on(ACTIONS.PEER_LIST, (peerList) => {
      const newList = peerList.map((client) =>
        client.peerId === socket.current.id
          ? { ...client, isLocal: true }
          : client
      );
      setClients(newList);
      const newPeerIds = new Set(newList.map((client) => client.peerId));

      Object.keys(connections.current).forEach((peerId) => {
        if (!newPeerIds.has(peerId)) {
          connections.current[peerId].close();
          delete connections.current[peerId];
          delete audioElements.current[peerId];
        }
      });

      newList.forEach((client) => {
        if (!client.peerId) return;
        if (client.peerId === socket.current.id) return;
        if (!connections.current[client.peerId]) {
          const pc = new RTCPeerConnection({ iceServers: freeice() });
          connections.current[client.peerId] = pc;

          pc.onicecandidate = (event) => {
            socket.current.emit(ACTIONS.RELAY_ICE, {
              peerId: client.peerId,
              icecandidate: event.candidate,
            });
          };

          pc.ontrack = ({ streams: [remoteStream] }) => {
            if (audioElements.current[client.peerId])
              audioElements.current[client.peerId].srcObject = remoteStream;
          };

          localMediaStream.current.getTracks().forEach((track) => {
            pc.addTrack(track, localMediaStream.current);
          });

          if (socket.current.id < client.peerId) {
            pc.createOffer()
              .then((offer) => pc.setLocalDescription(offer))
              .then(() => {
                socket.current.emit(ACTIONS.RELAY_SDP, {
                  peerId: client.peerId,
                  sessionDescription: pc.localDescription,
                });
              })
              .catch(console.error);
          }
        }
      });
    });

    socket.current.on(ACTIONS.ICE_CANDIDATE, ({ peerId, icecandidate }) => {
      if (icecandidate && connections.current[peerId]) {
        connections.current[peerId].addIceCandidate(icecandidate);
      }
    });

    socket.current.on(
      ACTIONS.SESSION_DESCRIPTION,
      async ({ peerId, sessionDescription }) => {
        const connection = connections.current[peerId];
        if (!connection) return;
        await connection.setRemoteDescription(
          new RTCSessionDescription(sessionDescription)
        );
        if (sessionDescription.type === "offer") {
          const answer = await connection.createAnswer();
          await connection.setLocalDescription(answer);
          socket.current.emit(ACTIONS.RELAY_SDP, {
            peerId,
            sessionDescription: answer,
          });
        }
      }
    );

    // Listen for a REMOVED event from the server.
    socket.current.on(ACTIONS.REMOVED, ({ peerId }) => {
      if (peerId === socket.current.id) {
        leaveRoom();
      } else {
        handleRemovePeer({ peerId });
      }
    });

    const startCapture = async () => {
      try {
        localMediaStream.current = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        if (socket.current) {
          socket.current.emit(ACTIONS.JOIN, { roomId, user });
        }
      } catch (error) {
        console.error("Error accessing media devices:", error);
      }
    };
    startCapture();

    return () => {
      if (localMediaStream.current) {
        localMediaStream.current.getTracks().forEach((track) => track.stop());
      }
      if (socket.current) {
        socket.current.emit(ACTIONS.LEAVE, { roomId });
        socket.current.disconnect();
      }
    };
  }, [roomId, user]);

  // Attach audio element reference.
  const provideRef = (instance, peerId) => {
    audioElements.current[peerId] = instance;
    if (!instance) return;
    if (socket.current && peerId === socket.current.id) {
      instance.srcObject = localMediaStream.current;
      instance.muted = true;
      instance.volume = 0;
    } else if (remoteStreams.current[peerId]) {
      instance.srcObject = remoteStreams.current[peerId];
    }
  };

  const muteClient = (peerId) => {
    if (socket.current && peerId === socket.current.id) {
      localMediaStream.current.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
    }
    const clientAudio = audioElements.current[peerId];
    if (clientAudio) {
      if (socket.current && peerId === socket.current.id) {
        clientAudio.muted = true;
        clientAudio.volume = 0;
      } else {
        clientAudio.muted = true;
      }
    }
  };

  const unmuteClient = (peerId) => {
    if (socket.current && peerId === socket.current.id) {
      localMediaStream.current.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
    }
    const clientAudio = audioElements.current[peerId];
    if (clientAudio) {
      if (socket.current && peerId === socket.current.id) {
        clientAudio.muted = true;
        clientAudio.volume = 0;
      } else {
        clientAudio.muted = false;
      }
    }
  };

  const leaveRoom = () => {
    socket.current.emit(ACTIONS.LEAVE, { roomId });
  };

  return {
    clients,
    provideRef,
    muteClient,
    unmuteClient,
    leaveRoom,
    removeClient,
  };
};
