import { Navigate } from "react-router-dom";
import { getStoredToken, getStoredUser, normalizeRole } from "../../utils/auth";

export default function ProtectedAdminRoute({children}){
    const token = getStoredToken();
    const user = getStoredUser();
    const role = normalizeRole(user?.role);

    if (!token) {
        return <Navigate to="/signin" replace />;
    }

    if (role === "SUPER_ADMIN" || role === "ADMIN" || role === "HOTEL_ADMIN") {
        return children;
    }

    return <Navigate to="/signin" replace />;

}