import { Schema, model } from "mongoose";
import type { InferSchemaType } from "mongoose";

const listSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    items: {
      type: [
        {
          product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
          addedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

export type List = InferSchemaType<typeof listSchema>;
export const ListModel = model("List", listSchema);
