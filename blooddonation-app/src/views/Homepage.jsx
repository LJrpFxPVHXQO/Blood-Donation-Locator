import React, { useState } from 'react';
import { 
  Menu, 
  Bell, 
  User, 
  AlertTriangle, 
  Droplet, 
  HelpCircle, 
  Shield, 
  Heart, 
  X, 
  LogOut, 
  Calendar,
  ChevronRight
} from 'lucide-react';

export default function Homepage({ onNavigate }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReminder, setShowReminder] = useState(false);

  return (
    <div style={{ backgroundColor: '#fce4ec', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      
      {/* 1. TOP NAVBAR */}
      <nav style={{ 
        backgroundColor: '#b71c1c', 
        color: 'white', 
        padding: '12px 24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        {/* Left Side: Menu Trigger & Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => setShowMenu(true)} 
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px', display: 'flex' }}
            title="Open Menu"
          >
            <Menu size={26} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '18px', letterSpacing: '0.5px' }}>
            <Heart fill="white" size={22} /> BLOODSYNC
          </div>
        </div>

        {/* Right Side: Reminders & Profile Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={() => setShowReminder(!showReminder)} 
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', position: 'relative', padding: '4px', display: 'flex' }}
            title="View Reminders"
          >
            <Bell size={22} />
            <span style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              backgroundColor: '#ffeb3b',
              width: '8px',
              height: '8px',
              borderRadius: '50%'
            }} />
          </button>
          
          <button 
            onClick={() => onNavigate('profile')} 
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px', display: 'flex' }}
            title="User Profile"
          >
            <User size={22} />
          </button>
        </div>
      </nav>

      {/* 2. SLIDE-OUT MENU DRAWER & OVERLAY */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div 
            onClick={() => setShowMenu(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 200
            }}
          />
          {/* Drawer Sidebar */}
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '260px',
            height: '100vh',
            backgroundColor: '#8e0000',
            color: 'white',
            padding: '20px',
            boxShadow: '4px 0 15px rgba(0,0,0,0.3)',
            zIndex: 201,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Navigation Menu</h3>
                <button 
                  onClick={() => setShowMenu(false)} 
                  style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                >
                  <X size={24} />
                </button>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Home Dashboard', icon: <Heart size={18} />, view: 'home' },
                  { label: 'Emergency Requests', icon: <AlertTriangle size={18} />, view: 'emergency' },
                  { label: 'Blood Donation Centers', icon: <Droplet size={18} />, view: 'donation' },
                  { label: 'Help & Survey', icon: <HelpCircle size={18} />, view: 'help' },
                  { label: 'Profile & Settings', icon: <User size={18} />, view: 'profile' },
                ].map((item, idx) => (
                  <li key={idx}>
                    <button 
                      onClick={() => { onNavigate(item.view); setShowMenu(false); }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        color: 'white',
                        padding: '12px 15px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {item.icon} {item.label}
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <button 
              onClick={() => { onNavigate('landing'); setShowMenu(false); }}
              style={{
                width: '100%',
                backgroundColor: '#b71c1c',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                padding: '12px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              <LogOut size={18} /> Log Out
            </button>
          </div>
        </>
      )}

      {/* 3. REMINDERS MODAL POPUP */}
      {showReminder && (
        <div style={{
          position: 'absolute',
          top: '60px',
          right: '20px',
          width: '300px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
          zIndex: 150,
          padding: '16px',
          borderLeft: '5px solid #b71c1c'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h4 style={{ color: '#b71c1c', margin: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px' }}>
              <Bell size={18} /> Donor Reminders
            </h4>
            <button onClick={() => setShowReminder(false)} style={{ background: 'none', border: 'none', color: 'gray', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
          <p style={{ fontSize: '13px', color: '#444', margin: '0 0 10px 0', lineHeight: '1.4' }}>
            Your next eligible blood donation cooldown ends in <strong>14 days</strong>.
          </p>
          <div style={{ fontSize: '12px', color: '#666', backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} /> Recommended Date: Nov 2, 2026
          </div>
        </div>
      )}

      {/* 4. MAIN HOMEPAGE DASHBOARD CONTENT */}
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px' }}>
        
        {/* Welcome Banner */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '24px', 
          borderRadius: '12px', 
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          marginBottom: '24px',
          borderLeft: '6px solid #b71c1c'
        }}>
          <h1 style={{ color: '#b71c1c', margin: '0 0 8px 0', fontSize: '24px', fontWeight: 'bold' }}>
            Welcome to BloodSync Dashboard
          </h1>
          <p style={{ color: '#555', margin: 0, fontSize: '14px', lineHeight: '1.6' }}>
            Coordinate emergency blood dispatch, track donor availability, and check urgent hospital requests in real time. Choose an operational module below to continue.
          </p>
        </div>

        {/* Section Heading */}
        <h2 style={{ fontSize: '18px', color: '#333', marginBottom: '16px', fontWeight: 'bold' }}>
          Quick Action Modules
        </h2>

        {/* Action Button Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px' 
        }}>
          
          {/* Emergency Callout Card */}
          <button 
            onClick={() => onNavigate('emergency')}
            style={{ 
              backgroundColor: '#c62828', 
              color: 'white', 
              border: 'none', 
              borderRadius: '10px', 
              padding: '24px 16px', 
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 4px 12px rgba(198, 40, 40, 0.25)',
              transition: 'transform 0.2s'
            }}
          >
            <AlertTriangle size={36} />
            <span style={{ marginTop: '12px', fontWeight: 'bold', fontSize: '16px' }}>EMERGENCY</span>
            <span style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>Post or View Urgent Calls</span>
          </button>

          {/* Blood Donation Card */}
          <button 
            onClick={() => onNavigate('donation')}
            style={{ 
              backgroundColor: '#1565c0', 
              color: 'white', 
              border: 'none', 
              borderRadius: '10px', 
              padding: '24px 16px', 
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 4px 12px rgba(21, 101, 192, 0.25)',
              transition: 'transform 0.2s'
            }}
          >
            <Droplet size={36} />
            <span style={{ marginTop: '12px', fontWeight: 'bold', fontSize: '16px' }}>BLOOD DONATION</span>
            <span style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>Find Nearby Centers</span>
          </button>

          {/* Help Section Card */}
          <button 
            onClick={() => onNavigate('help')}
            style={{ 
              backgroundColor: '#2e7d32', 
              color: 'white', 
              border: 'none', 
              borderRadius: '10px', 
              padding: '24px 16px', 
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 4px 12px rgba(46, 125, 50, 0.25)',
              transition: 'transform 0.2s'
            }}
          >
            <HelpCircle size={36} />
            <span style={{ marginTop: '12px', fontWeight: 'bold', fontSize: '16px' }}>HELP SECTION</span>
            <span style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>FAQs & Survey Forms</span>
          </button>

          {/* Profile & Accessibility Card */}
          <button 
            onClick={() => onNavigate('profile')}
            style={{ 
              backgroundColor: '#424242', 
              color: 'white', 
              border: 'none', 
              borderRadius: '10px', 
              padding: '24px 16px', 
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 4px 12px rgba(66, 66, 66, 0.25)',
              transition: 'transform 0.2s'
            }}
          >
            <Shield size={36} />
            <span style={{ marginTop: '12px', fontWeight: 'bold', fontSize: '16px' }}>PROFILE & PWD</span>
            <span style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>Account & Accessibility Options</span>
          </button>

        </div>
      </main>
    </div>
  );
}