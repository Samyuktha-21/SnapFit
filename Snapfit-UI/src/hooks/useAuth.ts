import { useState } from 'react';
import { useMeasurementStore } from '../store/useMeasurementStore';
import { firebaseAuth } from '../services/firebase';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    user, 
    isAuthenticated, 
    loginUser, 
    logoutUser,
    setHeight
  } = useMeasurementStore();

  const handleSignUp = async (email: string, gender: 'Men' | 'Women', height: number) => {
    setLoading(true);
    setError(null);
    try {
      const newUser = await firebaseAuth.signUp(email, gender, height);
      // Sync into Zustand Store
      loginUser(newUser.email, newUser.gender);
      setHeight(newUser.height_cm);
      return newUser;
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      const loggedUser = await firebaseAuth.signIn(email);
      loginUser(loggedUser.email, loggedUser.gender);
      setHeight(loggedUser.height_cm);
      return loggedUser;
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const loggedUser = await firebaseAuth.signInWithGoogle();
      loginUser(loggedUser.email, loggedUser.gender);
      setHeight(loggedUser.height_cm);
      return loggedUser;
    } catch (err: any) {
      setError(err.message || 'Google Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await firebaseAuth.signOut();
      logoutUser();
    } catch (err: any) {
      console.error('Sign out error:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    isAuthenticated,
    loading,
    error,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signInWithGoogle: handleGoogleSignIn,
    signOut: handleSignOut
  };
}
