import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';

export const useIsNewUser = () => {
  const [isNewUser, setIsNewUser] = useState<boolean | null>(null);

  useEffect(() => {
    const checkFirstLaunch = async () => {
      const isFirstLaunch = await AsyncStorage.getItem('isFirstLaunch');
      if (isFirstLaunch === null) {
        await AsyncStorage.setItem('isFirstLaunch', 'false');
        setIsNewUser(true);
      } else {
        setIsNewUser(false);
      }
    };
    checkFirstLaunch();
  }, []);

  return isNewUser;
};