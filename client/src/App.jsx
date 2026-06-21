import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';

// 🛡️ The Gatekeeper Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  
  // If no token exists, bounce them straight to the login screen
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  // If they have a token, let them view the page seamlessly
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 🔒 Protected Routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />

        {/* 🔓 Public Route */}
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}