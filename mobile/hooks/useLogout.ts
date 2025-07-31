import { useAuth } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { Alert } from 'react-native';

export const useLogout = () => {
  const { signOut } = useAuth();

  const logout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/(auth)/sign-in' as any); 
            } catch (error) {
              console.log('Error logging out:', error);
              Alert.alert('Error', 'Failed to log out.');
            }
          },
        },
      ]
    );
  };

  return { logout };
};