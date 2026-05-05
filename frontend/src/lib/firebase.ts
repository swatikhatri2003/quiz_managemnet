import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAiZfDIylsaUIB5xfQOdlC6qKaxUxlMl3g",
  authDomain: "jain-cricket-league.firebaseapp.com",
  databaseURL: "https://jain-cricket-league.firebaseio.com",
  projectId: "jain-cricket-league",
  storageBucket: "jain-cricket-league.appspot.com",
  messagingSenderId: "886224719584",
  appId: "1:886224719584:web:be3d8efa9acf1b23cd0a85",
};

export const firebaseApp = getApps().length
  ? getApps()[0]!
  : initializeApp(firebaseConfig);

export const db = getDatabase(firebaseApp);

