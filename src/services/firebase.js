import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";
import { getDatabase } from "firebase/database";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check"; // Import App Check and reCAPTCHA Enterprise
import defaultProfileImage from "../assets/profile.svg"; // Default profile image

const MAX_ACTIVITIES = 5; // Maximum number of activities stored for users
const UNKNOWN_USER_NAME = "Unknown"; // Placeholder for unknown user name
const DEFAULT_PROFILE_IMAGE = defaultProfileImage; // Default profile image path

// Firebase Configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Initialize Firebase Services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const database = getDatabase();
const googleAuthProvider = new firebase.auth.GoogleAuthProvider();

// Initialize App Check with reCAPTCHA Enterprise
const appCheck = initializeAppCheck(firebase.apps[0], {
  provider: new ReCaptchaEnterpriseProvider(process.env.REACT_APP_RECAPTCHA_SITE_KEY),
  isTokenAutoRefreshEnabled: true, // Automatically refresh token
});

// Firestore Collections
const recipesCollection = db.collection("recipes");
const usersCollection = db.collection("users");
const messagesCollection = db.collection("messages");
const commentsCollection = db.collection("comments");

// Handle Photo Upload
const handleUploadPhoto = async (userAuth, file, setLoading) => {
  if (!userAuth || !file) return null;

  try {
    const storageRef = storage.ref();
    const fileRef = storageRef.child(`photo/${userAuth.uid}/${file.name}`);

    const snapshot = await fileRef.put(file);

    const downloadURL = await snapshot.ref.getDownloadURL();
    await auth.currentUser.updateProfile({ photoURL: downloadURL });

    return downloadURL;
  } catch (error) {
    console.error("Error uploading photo:", error);
    return null;
  } finally {
    setLoading(false);
  }
};

// Create or Update User Profile Document
const createUserProfileDocument = async (userAuth, additionalData = {}) => {
  if (!userAuth) return;

  const { displayName, email, photoURL, uid } = userAuth;
  const userRef = db.collection("users").doc(uid);
  const snapshot = await userRef.get();

  const createdAt = new Date();

  try {
    if (!snapshot.exists) {
      const userData = {
        createdAt,
        displayName: displayName || UNKNOWN_USER_NAME,
        email,
        photoURL: photoURL || DEFAULT_PROFILE_IMAGE,
        authorId: uid,
        activity: [],
        ...additionalData,
      };
      await userRef.set(userData);
    } else {
      await userRef.update({
        displayName: displayName || UNKNOWN_USER_NAME,
        email,
        ...additionalData,
      });
    }
  } catch (error) {
    console.error("Error creating/updating user profile:", error);
  }

  return userRef;
};

// Send Chat Message
export const sendChatMessage = async (messageData) => {
  try {
    console.log("Sending message data:", messageData);
    await db.collection("messages").add(messageData);
    console.log("Message sent successfully");
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

// Read User Profile Document
export const readUserProfileDocument = async (authorId) => {
  try {
    const userRef = db.collection("users").doc(authorId);
    const snapshot = await userRef.get();

    if (snapshot.exists) {
      // Dokumen user dengan authorId ditemukan, kembalikan data user
      const userData = snapshot.data();
      return userData;
    } else {
      // Dokumen user dengan authorId tidak ditemukan
      throw new Error(`User profile not found for authorId: ${authorId}`);
    }
  } catch (error) {
    console.error("Error reading user profile:", error);
    // Handle the error accordingly
    return null;
  }
};

// Check if Recipe is New (within 7 days)
export const isNewRecipe = (createdAt) => {
  const currentDate = new Date();
  const differenceInDays = (currentDate - createdAt) / (1000 * 3600 * 24);

  return differenceInDays <= 7;
};

// Limit Activities to Maximum
const limitActivities = (activities) => {
  if (activities.length > MAX_ACTIVITIES) {
    return activities.slice(0, MAX_ACTIVITIES);
  } else {
    return activities;
  }
};

// Handle Adding Recipe
const handleAddRecipe = async (recipe) => {
  try {
    const authorId = auth.currentUser.uid;

    // Save recipe to the "recipes" collection in Firestore
    const recipeRef = recipesCollection.doc();
    await recipeRef.set(recipe);

    // Save activity log in the user's collection (users collection)
    const userRef = db.collection("users").doc(authorId);
    const userSnapshot = await userRef.get();

    if (userSnapshot.exists) {
      const userActivities = userSnapshot.data().activity || [];
      userActivities.push({
        recipeId: recipeRef.id,
        recipeName: recipe.title,
        date: new Date().toISOString(),
      });

      // Limit the number of activities to 5
      const limitedActivities = limitActivities(userActivities);

      // Update the user's activity array in Firestore
      await userRef.update({ activity: limitedActivities });

      console.log("Recipe added with ID:", recipeRef.id);
    }
  } catch (error) {
    console.error("Error adding recipe:", error);
  }
};

// Handle Deleting Recipe
const handleDeleteRecipe = async (recipeId, recipeName, authorId) => {
  try {
    await db.collection("recipes").doc(recipeId).delete();

    const userRef = db.collection("users").doc(authorId);

    const userSnapshot = await userRef.get();

    if (userSnapshot.exists) {
      const userData = userSnapshot.data();
      const userActivities = userData.activity || [];
      const deletedActivityIndex = userActivities.findIndex(
        (activity) => activity.recipeId === recipeId
      );

      if (deletedActivityIndex !== -1) {
        userActivities.splice(deletedActivityIndex, 1);

        await userRef.update({ activity: userActivities });
      }

      const deletedActivity = {
        type: "Deleted Recipe",
        recipeName: recipeName,
        date: new Date(),
      };

      userActivities.unshift(deletedActivity);

      // Limit the number of activities to 5
      const limitedActivities = limitActivities(userActivities);

      // Update the user's activity array in Firestore
      await userRef.update({ activity: limitedActivities });
    }
  } catch (error) {
    console.error("Error deleting recipe:", error);
  }
};

// Upload Video to Storage
const uploadVideoToStorage = async (videoFile, uniqueVideoName) => {
  try {
    const storageRef = storage.ref().child(`videos/${uniqueVideoName}`);
    const snapshot = await storageRef.put(videoFile);
    const videoUrl = await snapshot.ref.getDownloadURL();
    return videoUrl;
  } catch (error) {
    console.error("Error uploading video:", error);
    throw error;
  }
};

// Export services and functions
export {
  firebase,
  auth,
  db,
  storage,
  database,
  googleAuthProvider,
  recipesCollection,
  usersCollection,
  messagesCollection,
  commentsCollection,
  handleAddRecipe,
  handleDeleteRecipe,
  handleUploadPhoto,
  createUserProfileDocument,
  uploadVideoToStorage,
};

export default firebase;
