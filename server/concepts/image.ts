import * as dotenv from "dotenv";
import { ObjectId } from "mongodb";
import OpenAI from "openai";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotFoundError } from "./errors";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ImageDoc extends BaseDoc {
  author: ObjectId;
  parent: ObjectId;
  coordinate: string;
  prompt: string;
  type: string;
  step: string;
  originalImage: string;
  steppedImage: string;
  promptedImage: string;
  caption: string;       // New Field
  wordList: string[];    // New Field
}

export default class ImageConcept {
  public readonly images: DocCollection<ImageDoc>;

  constructor(collectionName: string) {
    this.images = new DocCollection<ImageDoc>(collectionName);
  }

  async create(
    author: ObjectId,
    parent: ObjectId,
    coordinate: string,
    type: string,
    step: string,
    prompt?: string,
    originalImage?: string,
    steppedImage?: string,
    promptedImage?: string,
    caption?: string,      
    wordList?: string[]  
  ) {
    const _id = await this.images.createOne({
      author,
      parent,
      coordinate,
      type,
      step,
      prompt: prompt || "",
      originalImage: originalImage || "",
      steppedImage: steppedImage || "",
      promptedImage: promptedImage || "",
      caption: caption || "",
      wordList: wordList || [],
    });

    return { msg: "Image successfully created!", image: await this.images.readOne({ _id }) };
  }

  async generateSimilarWords(prompt: string): Promise<Record<string, string>> {
    try {
      const response = await openai.completions.create({
        model: "gpt-4",
        prompt: `Generate 36 similar words or phrases for "${prompt}" in JSON format.`,
        max_tokens: 150,
      });

      return JSON.parse(response.choices[0].text.trim());
    } catch (error) {
      console.error("Error generating similar words:", error);
      throw error;
    }
  }

  async getImagesByAuthor(author: ObjectId) {
    return await this.images.readMany({ author });
  }

  async getImageById(_id: ObjectId) {
    const image = await this.images.readOne({ _id });
    if (!image) {
      throw new NotFoundError(`Image with ID ${_id} not found.`);
    }
    return image;
  }

  async updateImage(
    _id: ObjectId,
    coordinate?: string,
    type?: string,
    step?: string,
    prompt?: string,
    originalImage?: string,
    steppedImage?: string,
    promptedImage?: string
  ) {
    await this.images.partialUpdateOne(
      { _id },
      { coordinate, type, step, prompt, originalImage, steppedImage, promptedImage }
    );
    return { msg: "Image updated successfully." };
  }

  async deleteAllByAuthor(author: ObjectId) {
    await this.images.deleteMany({ author });
    return { msg: "All images deleted for this author." };
  }
}
