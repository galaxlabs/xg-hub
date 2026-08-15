import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import Chatbot from '../components/Chatbot';

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
        document.documentElement.style.setProperty('--sidebar-width', '0px');
      } else {
        setSidebarOpen(true);
        document.documentElement.style.setProperty('--sidebar-width', '260px');
      }
    };
    
    // Initial check
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    if (!isMobile) {
      document.documentElement.style.setProperty(
        '--sidebar-width', 
        newState ? '260px' : '80px'
      );
    }
  };

  return (
    <div className="app-layout">
      {isMobile && sidebarOpen && (
        <div 
          className="mobile-overlay" 
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
      
      <Sidebar isOpen={sidebarOpen} isMobile={isMobile} closeSidebar={() => setSidebarOpen(false)} />
      
      <main className="main-content">
        <TopHeader toggleSidebar={toggleSidebar} />
        
        <div className="page-content animate-fade-in">
          <Outlet />
        </div>
      </main>
      
      <Chatbot />
    </div>
  );
};

export default MainLayout;
