import { Navigate } from "react-router-dom";
import { getRedirectPathForRole, getStoredToken, getStoredUser, normalizeRole } from "../../utils/auth";

function ProtectedRoute({children}){
    const token = getStoredToken();
    const role = normalizeRole(getStoredUser()?.role);

    if (!token) {
        return <Navigate to="/signin" replace />;
    }

    if (role === "SUPER_ADMIN" || role === "HOTEL_ADMIN") {
        return <Navigate to={getRedirectPathForRole(role)} replace />;
    }

    return children;
}

export default ProtectedRoute;
