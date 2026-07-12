import {
 signInWithPopup,
 signInWithRedirect
} from "firebase/auth";
import { useState } from "react";

import {
 auth,
 provider
} from "./firebase/firebase";
import { 
  onAuthStateChanged,
  getRedirectResult
} from "firebase/auth";


// useEffect(()=>{

//   getRedirectResult(auth)
//     .then((result)=>{
//       console.log(
//         "REDIRECT RESULT:",
//         result
//       );

//       if(result){
//         console.log(
//           "REDIRECT USER:",
//           result.user
//         );
//       }

//     })
//     .catch((error)=>{
//       console.error(
//         "REDIRECT ERROR:",
//         error
//       );
//     });


//   const unsubscribe = onAuthStateChanged(
//     auth,
//     (currentUser)=>{
      
//       setUser(currentUser);
//     }
//   );


//   return unsubscribe;

// },[]);

export default function Login(){
 const [errorMessage,setErrorMessage]=useState("");

 const login = async()=>{
   setErrorMessage("");

  try {
  await signInWithPopup(auth, provider);
} catch (error) {
  if (
    error.code === "auth/popup-blocked" ||
    error.code === "auth/cancelled-popup-request"
  ) {
    await signInWithRedirect(auth, provider);
  } else {
    throw error;
  }
}
 };
// const login = async () => {
//   try {
//     const result = await signInWithPopup(auth, provider);
//     console.log("SUCCESS", result);
//   } catch (error) {
//     console.log("FULL ERROR:", error);
//     console.log("CODE:", error.code);
//     console.log("MESSAGE:", error.message);
//     console.log("CUSTOM DATA:", error.customData);
//     console.log("EMAIL:", error.customData?.email);
//   }
// };

 return (
  <div>
   <button
    onClick={login}
   >
     Login with Google
   </button>
   {errorMessage && (
    <div
     style={{
      marginTop: 8,
      maxWidth: 320,
      padding: "8px 10px",
      background: "#fff",
      border: "1px solid #f56565",
      borderRadius: 8,
      color: "#c53030",
      fontSize: 12,
      textAlign: "left"
     }}
    >
     {errorMessage}
    </div>
   )}
  </div>
 );

}
