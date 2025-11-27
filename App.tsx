
import React, { useState } from 'react';
import { User, UserRole } from './types';
import { Layout } from './components/Layout';
import { OwnerDashboard } from './components/OwnerDashboard';
import { PayerDashboard } from './components/PayerDashboard';
import { Login } from './components/Login';

function App() {
  const [user, setUser] = useState<User | null>(null);

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleAuthSuccess} />;
  }

  return (
    <Layout 
      title={user.role === UserRole.OWNER ? "Owner Console" : "Tenant Portal"} 
      role={user.role} 
      onLogout={handleLogout}
    >
      {user.role === UserRole.OWNER ? (
        <OwnerDashboard user={user} />
      ) : (
        <PayerDashboard user={user} />
      )}
    </Layout>
  );
}

export default App;
