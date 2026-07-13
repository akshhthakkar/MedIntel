import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: '#F4F7FA' }}>
      {/* Sidebar — full height, fixed left */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Right column: navbar + scrollable content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Main content: scrollable */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 pb-20">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
