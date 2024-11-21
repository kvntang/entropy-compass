import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface ImageDoc extends BaseDoc {
  author: ObjectId;
  //////add more here//////
  coordinate: string;
  prompt: string;
  type: string; //this might need more specification
  step: Int16Array;
  originalImage: string; // Base64 string
  steppedImage: string; // Base64 string
  promptedImage: string; // Base64 string
}

export default class ImageConcept {
  public readonly images: DocCollection<ImageDoc>;

  /**
   * Make an instance of Posting.
   */
  constructor(collectionName: string) {
    this.images = new DocCollection<ImageDoc>(collectionName);
  }

  async createImage() {}

  async getImage(author: ObjectId) {
    //by author only
  }

  async updatePrompt(_id: ObjectId) {}

  async updateType(_id: ObjectId) {}

  async delete(_id: ObjectId) {
    await this.images.deleteOne({ _id });
    return { msg: "Post deleted successfully!" };
  }

  async assertAuthorIsUser(_id: ObjectId, user: ObjectId) {
    const post = await this.images.readOne({ _id });
    if (!post) {
      throw new NotFoundError(`Post ${_id} does not exist!`);
    }
    if (post.author.toString() !== user.toString()) {
      throw new PostAuthorNotMatchError(user, _id);
    }
  }
}

export class PostAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the author of post {1}!", author, _id);
  }
}
