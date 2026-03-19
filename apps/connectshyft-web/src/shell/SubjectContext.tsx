import { createContext, useContext } from "react";

const SubjectContext = createContext<any>(null);

export const SubjectContextProvider = ({ children }: any) => {
  const value = {
    orgUnitId: "demo-org",
  };

  return (
    <SubjectContext.Provider value={value}>{children}</SubjectContext.Provider>
  );
};

export const useSubjectContext = () => useContext(SubjectContext);
