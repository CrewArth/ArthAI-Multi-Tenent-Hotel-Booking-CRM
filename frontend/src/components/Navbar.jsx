import React, { useState, useContext } from "react";
import { useSelector, useDispatch } from "react-redux";
import "../styles/navbar.css";
import Logo from "./Logo";
import { useNavigate, Link } from "react-router-dom";
import { FaBars } from "react-icons/fa";
import { Menu, X } from "lucide-react";
import { normalizeRole } from "../utils/auth";
import { logout } from "../redux/authSlice";
// SidebarContext is only available inside AdminDashboard — guard with try/catch
import { SidebarContext } from "../admin/context/SidebarContext";

const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const siteName = useSelector((state) => state.siteSettings.siteName);
  const user = useSelector((state) => state.auth.user);
  const isLoggedIn = !!user;

  // Only available when wrapped in SidebarProvider (admin pages)
  const sidebarCtx = useContext(SidebarContext);

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
        <p className="navbar-title">{siteName}</p>
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
