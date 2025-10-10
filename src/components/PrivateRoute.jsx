import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const decodeJwt = (token) => {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded || {};
  } catch (e) {
    return {};
  }
};

const PrivateRoute = ({ role, children }) => {
  const location = useLocation();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const userRaw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const user = (() => { try { return userRaw ? JSON.parse(userRaw) : null; } catch { return null; } })();

  if (!token || !user) {
    const redirectTo = role === 'teacher' ? '/teacher/login' : '/student/login';
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (role && user.role !== role) {
    const redirectTo = user.role === 'teacher' ? '/teacher' : '/student';
    return <Navigate to={redirectTo} replace />;
  }

  const payload = decodeJwt(token);
  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < nowSec) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    const redirectTo = role === 'teacher' ? '/teacher/login' : '/student/login';
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default PrivateRoute;



