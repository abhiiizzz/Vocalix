import React, { useState } from "react";
import { useWebRTC } from "../../hooks/useWebRTC";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import styles from "./Room.module.css";

const Room = () => {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const { clients, provideRef, muteClient, unmuteClient, leaveRoom } =
    useWebRTC(roomId, user);

  // Local state for toggle buttons.
  const [localMicMuted, setLocalMicMuted] = useState(false);
  const [remoteSpeakerMuted, setRemoteSpeakerMuted] = useState({}); // mapping: peerId => boolean

  const handleLocalMicToggle = () => {
    // Find the local client's peerId.
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

  const handleLeaveRoom = () => {
    leaveRoom();
    navigate("/");
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Room: {roomId}</h1>
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
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Room;
