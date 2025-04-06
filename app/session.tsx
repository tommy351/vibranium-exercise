import { createContext, ReactNode, useContext } from "react";

export interface ClientSessionData {
  userId?: string;
}

const SessionContext = createContext<ClientSessionData>({});

export function SessionProvider({
  children,
  session,
}: {
  children: ReactNode;
  session: ClientSessionData;
}) {
  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
