import React, { createContext, useState, useContext } from 'react';

// Create Context
const ActiveNavContext = createContext();

// Create a custom hook to use the context
export const useActiveNav = () => {
  return useContext(ActiveNavContext);
};

// Create a Provider component
export const ActiveNavProvider = ({ children }) => {
  const [activeNav, setActiveNav] = useState('/'); // Default to the home route

  const setActive = (path) => {
    setActiveNav(path);
  };

  return (
    <ActiveNavContext.Provider value={{ activeNav, setActive }}>
      {children}
    </ActiveNavContext.Provider>
  );
};