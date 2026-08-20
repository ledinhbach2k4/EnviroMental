import * as SecureStore from 'expo-secure-store';
import { useState, useEffect } from 'react';

export const useIsNewUser = () => {
  const [isNewUser, setIsNewUser] = useState<boolean | null>(null);

  useEffect(() => {
    const checkFirstLaunch = async () => {
      const isFirstLaunch = await SecureStore.getItemAsync('isFirstLaunch');
      if (isFirstLaunch === null) {
        await SecureStore.setItemAsync('isFirstLaunch', 'false');
        setIsNewUser(true);
      } else {
        setIsNewUser(false);
      }
    };
    checkFirstLaunch();
  }, []);

  return isNewUser;
};