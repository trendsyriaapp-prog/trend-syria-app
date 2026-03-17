import { createContext, useContext, useCallback } from 'react';

const ScrollContext = createContext();

export const ScrollProvider = ({ children }) => {
  // دوال فارغة - ScrollToTop يتعامل مع كل شيء الآن
  const saveScrollPosition = useCallback(() => {}, []);
  const restoreScrollPosition = useCallback(() => false, []);
  const clearScrollPosition = useCallback(() => {}, []);
  const getScrollPosition = useCallback(() => 0, []);

  return (
    <ScrollContext.Provider value={{
      saveScrollPosition,
      restoreScrollPosition,
      clearScrollPosition,
      getScrollPosition
    }}>
      {children}
    </ScrollContext.Provider>
  );
};

export const useScroll = () => {
  const context = useContext(ScrollContext);
  if (!context) {
    throw new Error('useScroll must be used within a ScrollProvider');
  }
  return context;
};
