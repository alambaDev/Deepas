import React, { useState } from 'react';
import './Navbar.css';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo.png';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, permissions, logout, keycloak } = useAuth();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleLogout = (e) => {
    e.preventDefault();
    logout();
  };

  const getUserDisplayName = () => {
    if (user) {
      if (user.given_name && user.family_name) {
        return `${user.given_name} ${user.family_name}`;
      }
      if (user.preferred_username) {
        return user.preferred_username;
      }
      if (user.name) {
        return user.name;
      }
      if (user.email) {
        return user.email;
      }
    }
    return 'User';
  };

  const accountUrl = keycloak?.createAccountUrl ? keycloak.createAccountUrl() : '#';

  const handleNavigation = (e, path) => {
    e.preventDefault();
    console.log(`Navigate to: ${path}`);
    // Add your navigation logic here
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo and Home on the left */}
        <div className="navbar-left">
          <div className="navbar-logo">
            <img src={logo} alt="South Africa Map Explorer Logo" className="logo-image" />
          </div>
          
          <div className="nav-links-left">
            <button onClick={() => window.open('https://www.sansa.org.za/', '_blank')}
              className="nav-link active">
              <i className="bi bi-house-door-fill"></i>
              <span>Home</span>
            </button>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <div className="nav-links desktop-nav">         
          <button onClick={(e) => handleNavigation(e, '/about')} className="nav-link">
            <i className="bi bi-bar-chart-line"></i>
            <span>Analytics</span>
          </button>
          
          <button onClick={(e) => handleNavigation(e, '/about')} className="nav-link">
            <i className="bi bi-question-circle-fill"></i>
            <span>Help</span>
          </button>
          
          {permissions.canDownload && (
            <button className="nav-btn nav-btn-white">
              <i className="bi bi-envelope-fill"></i>
              <span>Contact</span>
            </button>
          )}
          
          <div className="user-menu">
            <button onClick={(e) => handleNavigation(e, accountUrl)} className="user-name" title="Account Settings">
              <i className="bi bi-person-circle"></i>
              <span>{getUserDisplayName()}</span>
            </button>
            <button onClick={handleLogout} className="nav-btn nav-logout">
              <i className="bi bi-box-arrow-right"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className="mobile-menu-icon" onClick={toggleMobileMenu}>
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-nav">
          <button onClick={(e) => { handleNavigation(e, '/'); toggleMobileMenu(); }} className="nav-link">
            <i className="bi bi-house-door-fill"></i>
            <span>Home</span>
          </button>
          <button onClick={(e) => { handleNavigation(e, '/about'); toggleMobileMenu(); }} className="nav-link">
            <i className="bi bi-info-circle-fill"></i>
            <span>About</span>
          </button>
          
          {permissions.canDownload && (
            <button className="nav-btn nav-btn-white" onClick={toggleMobileMenu}>
              <i className="bi bi-envelope-fill"></i>
              <span>Contact</span>
            </button>
          )}
          
          <div className="user-info-mobile">
            <div className="user-name-mobile">
              <i className="bi bi-person-circle"></i>
              <span>{getUserDisplayName()}</span>
            </div>
            <button onClick={() => { handleLogout(); toggleMobileMenu(); }} className="nav-btn nav-logout">
              <i className="bi bi-box-arrow-right"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
