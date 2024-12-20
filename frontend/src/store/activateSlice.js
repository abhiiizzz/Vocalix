// activateSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  name: "",
  avatar: "",
};

export const activateSlice = createSlice({
  name: "activate",
  initialState,
  reducers: {
    setName: (state, action) => {
      state.name = action.payload;
    },
    setAvatar: (state, action) => {
      state.avatar = action.payload;
    },
    resetActivate: () => initialState, // Resets to initial state
  },
});

export const { setName, setAvatar, resetActivate } = activateSlice.actions;
export default activateSlice.reducer;
