import React, { useEffect, useState } from "react";
import { useWebRTC } from "../../hooks/useWebRTC";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import styles from "./Room.module.css";
import { getRoom } from "../../http";

const Room = () => {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const user = useSelector((state) => state.auth.user);
  // removeClient is now provided from useWebRTC.
  const {
    clients,
    provideRef,
    muteClient,
    unmuteClient,
    leaveRoom,
    removeClient,
  } = useWebRTC(roomId, user);

  useEffect(() => {
    const fetchRoom = async () => {
      const { data } = await getRoom(roomId);
      setRoom(data);
    };
    fetchRoom();
  }, [roomId]);

  // Local state for toggle buttons.
  const [localMicMuted, setLocalMicMuted] = useState(false);
  const [remoteSpeakerMuted, setRemoteSpeakerMuted] = useState({});

  const handleLocalMicToggle = () => {
    const localClient = clients.find((c) => c.isLocal);
    if (!localClient) return;
    if (localMicMuted) {
      unmuteClient(localClient.peerId);
      setLocalMicMuted(false);
    } else {
      muteClient(localClient.peerId);
      setLocalMicMuted(true);
    }
  };

  const handleRemoteSpeakerToggle = (peerId) => {
    const currentMuted = remoteSpeakerMuted[peerId] || false;
    if (currentMuted) {
      unmuteClient(peerId);
      setRemoteSpeakerMuted((prev) => ({ ...prev, [peerId]: false }));
    } else {
      muteClient(peerId);
      setRemoteSpeakerMuted((prev) => ({ ...prev, [peerId]: true }));
    }
  };

  // Handler for removing a user.
  const handleRemoveUser = (peerId) => {
    // Optionally, add a confirmation dialog here.
    removeClient(peerId);
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    navigate("/");
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className="flex flex-col gap-4">
          <h1 className="text-nowrap bg-red-500">Room: {roomId}</h1>
          <h2 className="text-nowrap bg-blue-500">Room Topic: {room?.topic}</h2>
        </div>
        <button className={styles.leaveButton} onClick={handleLeaveRoom}>
          Leave Room
        </button>
      </div>
      <div className={styles.clientsContainer}>
        {clients.map((client) => (
          <div key={client.peerId} className={styles.clientCard}>
            <div className={styles.clientInfo}>
              <img
                src={client.avatar || "/images/default-avatar.png"}
                alt={client.name}
                className={styles.avatar}
              />
              <span className={styles.clientName}>{client.name}</span>
            </div>
            <audio
              ref={(instance) => provideRef(instance, client.peerId)}
              controls
              autoPlay
              className={styles.audioControl}
            />
            <div className={styles.controls}>
              {client.isLocal ? (
                <button
                  className={`${styles.controlButton} ${
                    localMicMuted ? styles.activeButton : styles.inactiveButton
                  }`}
                  onClick={handleLocalMicToggle}
                >
                  {localMicMuted ? "Mic On" : "Mic Off"}
                </button>
              ) : (
                <>
                  <button
                    className={`${styles.controlButton} ${
                      remoteSpeakerMuted[client.peerId]
                        ? styles.activeButton
                        : styles.inactiveButton
                    }`}
                    onClick={() => handleRemoteSpeakerToggle(client.peerId)}
                  >
                    {remoteSpeakerMuted[client.peerId]
                      ? "Speaker On"
                      : "Speaker Off"}
                  </button>
                  {/* Only room owner sees "Remove User" for non-local clients */}
                  {room?.ownerId === user._id && !client.isLocal && (
                    <button
                      className={styles.controlButton}
                      onClick={() => handleRemoveUser(client.peerId)}
                    >
                      Remove User
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Room;
