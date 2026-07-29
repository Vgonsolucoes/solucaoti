import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

import Dashboard from './pages/Dashboard';

import Devices from './pages/Devices';
import Employees from './pages/Employees';
import Users from './pages/Users';

import Assignments from './pages/Assignments';
import AssignmentApproval from './pages/AssignmentApproval';

import Returns from './pages/Returns';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ImportDevices from './pages/ImportDevices';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/approve-assignment" element={<AssignmentApproval />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/devices" element={<Devices />} />
              <Route path="/devices/import" element={<ImportDevices />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/users" element={<Users />} />
              <Route path="/assignments" element={<Assignments />} />
              <Route path="/returns" element={<Returns />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/import-devices" element={<ImportDevices />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
export default App;
