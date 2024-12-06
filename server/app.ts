import AuthenticatingConcept from "./concepts/authenticating";
import ChatGPTConcept from "./concepts/chatgpt"; // Import the ChatGPTConcept
import FriendingConcept from "./concepts/friending";
import ImageConcept from "./concepts/image";
import PostingConcept from "./concepts/posting";
import SessioningConcept from "./concepts/sessioning";

// Instantiate all concepts
export const Sessioning = new SessioningConcept();
export const Authing = new AuthenticatingConcept("users");
export const Posting = new PostingConcept("posts");
export const Friending = new FriendingConcept("friends");
export const Imaging = new ImageConcept("images");
export const ChatGPT = new ChatGPTConcept(); // Instantiate ChatGPTConcept
