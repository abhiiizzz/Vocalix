require("dotenv").config();
const express = require("express");
const app = express();
const DbConnect = require("./database");
const router = require("./routes");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const server = require("http").createServer(app);
const ACTIONS = require("./actions");

const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

app.use(cookieParser());
const corsOption = {
  credentials: true,
  origin: ["http://localhost:3000"],
};
app.use(cors(corsOption));
app.use("/storage", express.static("storage"));

const PORT = process.env.PORT || 5500;
DbConnect();
app.use(express.json({ limit: "8mb" }));
app.use(router);

app.get("/", (req, res) => {
  res.send("Hello from express Js");
});

// Mapping of socket.id to user data.
const socketUserMapping = {};

// NEW: updatePeerList function that deduplicates entries by user.id,
// selecting the connection with the most recent joinTime.
const updatePeerList = (roomId) => {
  const clientsInRoom = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
  const peerList = clientsInRoom.map((clientId) => ({
    ...socketUserMapping[clientId],
    peerId: clientId,
  }));
  io.in(roomId).emit(ACTIONS.PEER_LIST, peerList);
};

io.on("connection", (socket) => {
  console.log("new connection", socket.id);

  socket.on(ACTIONS.JOIN, ({ roomId, user }) => {
    // Add a joinTime property for deduplication in updatePeerList.
    socketUserMapping[socket.id] = { ...user, joinTime: Date.now() };
    // Get all clients already in the room.
    const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    // Notify each existing client about the new peer,
    // and notify the new peer about each existing client.
    clients.forEach((clientId) => {
      io.to(clientId).emit(ACTIONS.ADD_PEER, {
        peerId: socket.id,
        createOffer: false,
        user,
      });
      socket.emit(ACTIONS.ADD_PEER, {
        peerId: clientId,
        createOffer: true,
        user: socketUserMapping[clientId],
      });
    });
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
    // NEW: Broadcast the updated deduplicated peer list.
    updatePeerList(roomId);
  });

  // Relay ICE candidates.
  socket.on(ACTIONS.RELAY_ICE, ({ peerId, icecandidate }) => {
    io.to(peerId).emit(ACTIONS.ICE_CANDIDATE, {
      peerId: socket.id,
      icecandidate,
    });
  });

  // Relay session descriptions (SDP).
  socket.on(ACTIONS.RELAY_SDP, ({ peerId, sessionDescription }) => {
    io.to(peerId).emit(ACTIONS.SESSION_DESCRIPTION, {
      peerId: socket.id,
      sessionDescription,
    });
  });

  socket.on(ACTIONS.LEAVE, ({ roomId }) => {
    socket.leave(roomId);
    updatePeerList(roomId);
    delete socketUserMapping[socket.id];
  });

  //socket.on(ACTIONS.LEAVE, leaveRoom);

  socket.on("disconnect", () => {
    socket.rooms.forEach((room) => {
      if (room !== socket.id) {
        updatePeerList(room);
      }
    });
    delete socketUserMapping[socket.id];
  });
});

server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
