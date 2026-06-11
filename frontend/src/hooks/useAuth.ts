import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { login as apiLogin } from '@/services/api/tickets.api';
import { disconnectSocket } from '@/lib/socket/socket.client';

export function useAuth() {
  const navigate = useNavigate();
  const { token, user, setAuth, clearAuth } = useAuthStore();

  async function login(email: string, password: string) {
    const response = await apiLogin(email, password);
    const authUser = {
      id: response.user.id,
      accountId: response.user.accountId,
      email: response.user.email,
      role: response.user.role,
      fullName: response.user.fullName,
      operatorId: response.user.operatorId ?? undefined,
      branchId: response.user.branchId ?? undefined,
    };
    setAuth(response.token, authUser);
    return authUser;
  }

  function logout() {
    clearAuth();
    disconnectSocket();
    navigate('/login');
  }

  return {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token,
  };
}
