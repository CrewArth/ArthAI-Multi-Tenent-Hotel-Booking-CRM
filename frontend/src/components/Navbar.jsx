import React, { useState, useContext, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import "../styles/navbar.css";
import Logo from "./Logo";
import { useNavigate, Link } from "react-router-dom";
import { FaBars } from "react-icons/fa";
import { Menu, X } from "lucide-react";
import { normalizeRole } from "../utils/auth";
import { logout, updateUser } from "../redux/authSlice";
import api from "../utils/api";
// SidebarContext is only available inside AdminDashboard — guard with try/catch
import { SidebarContext } from "../admin/context/SidebarContext";

const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const siteName = useSelector((state) => state.siteSettings.siteName);
  const user = useSelector((state) => state.auth.user);
  const hotelAdminHotel = useSelector((state) => state.hotelAdmin?.hotel);
  const isLoggedIn = !!user;

  // Only available when wrapped in SidebarProvider (admin pages)
  const sidebarCtx = useContext(SidebarContext);

  const normalizedRole = normalizeRole(user?.role);
  const isSuperAdmin = normalizedRole === "SUPER_ADMIN";

  const [assignedHotelName, setAssignedHotelName] = useState(() => {
    if (!isSuperAdmin && typeof user?.assignedGuestHouseId === 'object' && user?.assignedGuestHouseId?.guestHouseName) {
      return user.assignedGuestHouseId.guestHouseName;
    }
    return '';
  });

  useEffect(() => {
    if (!user || isSuperAdmin) {
      setAssignedHotelName('');
      return;
    }

    if (typeof user.assignedGuestHouseId === 'object' && user.assignedGuestHouseId?.guestHouseName) {
      setAssignedHotelName(user.assignedGuestHouseId.guestHouseName);
      return;
    }

    if (typeof user.assignedGuestHouseId === 'string' && user.assignedGuestHouseId.trim()) {
      const ghId = user.assignedGuestHouseId.trim();
      api.get(`/api/guesthouses/${ghId}`)
        .then((res) => {
          const gh = res.data?.guestHouse;
          if (gh?.guestHouseName) {
            setAssignedHotelName(gh.guestHouseName);
            dispatch(updateUser({ assignedGuestHouseId: gh }));
          }
        })
        .catch((err) => {
          console.warn('Failed to load assigned hotel name for navbar:', err);
        });
    }
  }, [user, isSuperAdmin, dispatch]);

  const effectiveHotelName = assignedHotelName || (!isSuperAdmin && hotelAdminHotel?.guestHouseName) || '';
  const navbarTitle = (!isSuperAdmin && effectiveHotelName) ? effectiveHotelName : siteName;

  const handleAuth = () => {
    if (isLoggedIn) {
      dispatch(logout());
      navigate("/signin");
      return;
    }
    navigate("/signin");
  };

  return (
    <nav className="navbar-container">
      <div className="navbar-left">
        {/* Sidebar burger — only on admin pages on mobile */}
        {sidebarCtx && (
          <button
            className="sidebar-burger-nav"
            onClick={sidebarCtx.toggle}
            aria-label={sidebarCtx.mobileOpen ? 'Close sidebar' : 'Open sidebar'}
            aria-expanded={sidebarCtx.mobileOpen}
          >
            {sidebarCtx.mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        )}
        <Logo />
        <p className="navbar-title">{navbarTitle}</p>
      </div>

      <div className="mobile-menu-icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
        <FaBars />
      </div>

      {/* Right-side Desktop Nav */}
      <div className={`navbar-middle ${isMobileMenuOpen ? "active" : ""}`}>
      </div>

      <div className={`navbar-authentication ${isMobileMenuOpen ? "active" : ""}`}>
        {isLoggedIn && <span className="welcome-text">Welcome, <strong>{user?.firstName}</strong>!</span>}

        <button className="authButton" onClick={handleAuth}>
          {isLoggedIn ? "Logout" : "Signin"}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
