import { ObjectId } from "mongodb";
import { Router, getExpressRouter } from "./framework/router";

import { Authing, ChatGPT, Imaging, Sessioning } from "./app"; // Import ChatGPT
import { SessionDoc } from "./concepts/sessioning";

import { z } from "zod";

/**
 * Web server routes for the app. Implements synchronizations between concepts.
 */
class Routes {
  // User session and authentication routes

  @Router.get("/session")
  async getSessionUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await Authing.getUsers();
  }

  @Router.get("/users/:username")
  @Router.validate(z.object({ username: z.string().min(1) }))
  async getUser(username: string) {
    return await Authing.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: SessionDoc, username: string, password: string) {
    Sessioning.isLoggedOut(session);
    return await Authing.create(username, password);
  }

  @Router.patch("/users/username")
  async updateUsername(session: SessionDoc, username: string) {
    const user = Sessioning.getUser(session);
    return await Authing.updateUsername(user, username);
  }

  @Router.patch("/users/password")
  async updatePassword(session: SessionDoc, currentPassword: string, newPassword: string) {
    const user = Sessioning.getUser(session);
    return Authing.updatePassword(user, currentPassword, newPassword);
  }

  @Router.delete("/users")
  async deleteUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    Sessioning.end(session);
    return await Authing.delete(user);
  }

  @Router.post("/login")
  async logIn(session: SessionDoc, username: string, password: string) {
    const user = await Authing.authenticate(username, password);
    Sessioning.start(session, user._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: SessionDoc) {
    Sessioning.end(session);
    return { msg: "Logged out!" };
  }

  // Image API routes

  @Router.post("/images")
  async createImage(
    session: SessionDoc,
    parent: ObjectId,
    coordinate: string,
    type: string,
    step: string,
    prompt?: string,
    originalImage?: string,
    steppedImage?: string,
    promptedImage?: string
  ) {
    console.log("Received data in createImage:", { parent, coordinate, type, step, originalImage });
    const author = Sessioning.getUser(session);
    const created = await Imaging.create(
      author,
      parent,
      coordinate,
      type,
      step,
      prompt,
      originalImage,
      steppedImage,
      promptedImage
    );
    return { msg: created.msg, image: created.image };
  }

  @Router.get("/images/author/:author")
  @Router.validate(z.object({ author: z.string() }))
  async getImagesByAuthor(author: string) {
    const id = new ObjectId(author);
    const images = await Imaging.getImagesByAuthor(id);
    console.log("Fetched images:", images);
    return images; // Ensure this includes all necessary fields
  }

  @Router.delete("/images/author/:authorId")
  @Router.validate(z.object({ authorId: z.string() }))
  async deleteImagesByAuthor(authorId: string) {
    const author = new ObjectId(authorId);
    return await Imaging.deleteAllByAuthor(author);
  }

  @Router.post("/images/similar-words")
  async generateSimilarWords(prompt: string) {
    return await Imaging.generateSimilarWords(prompt);
  }

  @Router.get("/images/:id")
  @Router.validate(z.object({ id: z.string() }))
  async getImageById(id: string) {
    return await Imaging.getImageById(new ObjectId(id));
  }

  @Router.patch("/images/:id")
  @Router.validate(
    z.object({
      id: z.string(),
      coordinate: z.string().optional(),
      type: z.string().optional(),
      step: z.string().optional(),
      prompt: z.string().optional(),
      originalImage: z.string().optional(),
      steppedImage: z.string().optional(),
      promptedImage: z.string().optional(),
    })
  )
  async updateImage(
    id: string,
    coordinate?: string,
    type?: string,
    step?: string,
    prompt?: string,
    originalImage?: string,
    steppedImage?: string,
    promptedImage?: string
  ) {
    return await Imaging.updateImage(
      new ObjectId(id),
      coordinate,
      type,
      step,
      prompt,
      originalImage,
      steppedImage,
      promptedImage
    );
  }

  /**
   * Route to generate a word list using ChatGPT API.
   */
  @Router.post("/chatgpt")
    async generateWordList(inputText: string) {
      try {
        if (!inputText) {
          throw new Error("Input text is required.");
        }
        const result = await ChatGPT.generateWordList(inputText);
        return { words: result };
      } catch (error) {
        console.error("Full error details:", error);
        if (error instanceof Error) {
          throw new Error(`Word list generation failed: ${error.message}`);
        } else {
          throw new Error("Word list generation failed: unknown error");
        }
      }
    }

}

/** The web app. */
export const app = new Routes();

/** The Express router. */
export const appRouter = getExpressRouter(app);
