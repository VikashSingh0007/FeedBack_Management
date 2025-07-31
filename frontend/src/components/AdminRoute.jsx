// src/components/AdminRoute.jsx
import { Navigate } from "react-router-dom";

const AdminRoute = ({ children }) => {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" />;
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.role === "admin") {
      return children;
    } else {
      return <div className="text-red-500 text-center mt-8">Access Denied: Admins Only</div>;
    }
  } catch (err) {
    return <Navigate to="/login" />;
  }
};

export default AdminRoute;
