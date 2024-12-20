// App.js

import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home/Home";
import Navigation from "./components/shared/Navigation/Navigation";
import Authenticate from "./pages/Authenticate/Authenticate";
import Activate from "./pages/Activate/Activate";
import Rooms from "./pages/Rooms/Rooms";
import { useSelector } from "react-redux";
import { useLoadingWithRefresh } from "./hooks/useLoadingWithRefresh";
import Loader from "./components/shared/Loader/Loader";

function App() {
  
  const { loading } = useLoadingWithRefresh();

  const { isAuth, user } = useSelector((state) => state.auth);

  return loading ? (
    <Loader message="Loading please wait..." />
  ) : (
    <BrowserRouter>
      <Navigation />
      <Routes>
        {GuestRoute("/", <Home />, isAuth)}
        {GuestRoute("/authenticate", <Authenticate />, isAuth)}
        {SemiProtectedRoute("/activate", <Activate />, isAuth, user)}
        {ProtectedRoute("/rooms", <Rooms />, isAuth, user)}
        {/* Optional: Handle undefined routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// Function to create Guest Routes
const GuestRoute = (path, element, isAuth) => {
  return (
    <Route
      path={path}
      element={isAuth ? <Navigate to="/rooms" replace /> : element}
    />
  );
};

// Function to create Semi-Protected Routes
const SemiProtectedRoute = (path, element, isAuth, user) => {
  return (
    <Route
      path={path}
      element={
        !isAuth ? (
          <Navigate to="/" replace />
        ) : isAuth && !user.activated ? (
          element
        ) : (
          <Navigate to="/rooms" replace />
        )
      }
    />
  );
};

// Function to create Protected Routes
const ProtectedRoute = (path, element, isAuth, user) => {
  return (
    <Route
      path={path}
      element={
        !isAuth ? (
          <Navigate to="/" replace />
        ) : isAuth && !user.activated ? (
          <Navigate to="/activate" replace />
        ) : (
          element
        )
      }
    />
  );
};

export default App;
