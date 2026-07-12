import {
  useEffect,
  useState
} from "react";

import {
  auth
} from "./firebase/firebase";

import {
  onAuthStateChanged
} from "firebase/auth";

import { AuthContext } from "./authContext";


export function AuthProvider({children}) {

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {

        console.log("AUTH STATE:", currentUser);

        setUser(currentUser);
        setLoading(false);

      }
    );

    return unsubscribe;

  }, []);


  return (
    <AuthContext.Provider
      value={{
        user,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}