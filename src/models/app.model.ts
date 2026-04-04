import mongoose, {
  type HydratedDocument,
  type InferSchemaType,
} from "mongoose";

const appSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    address: {
      type: String,
      required: true,
    },

    phoneNumber: {
      type: String,
      required: true,
    },
    whatsAppNumber: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },

    status: {
      portal: {
        type: String,
        enum: ["online", "offline", "waitlist"],
        default: "online",
      },
    },

    slug: {
      type: String,
      slug: "pharmahubmedica-app",
    },

    description: {
      type: String,
    },

    ratings: {
      type: Number,
    },

    images: [{ type: String }],

    branding: {
      logo: { type: String },
      logoLight: { type: String },
      logomark: { type: String },
      logomarkLight: { type: String },
    },
  },
  {
    timestamps: true,
  },
);

appSchema.pre("save", function () {
  this.slug = this.name.split(" ").join("-").toLowerCase() + "-app";
});

type App = InferSchemaType<typeof appSchema>;
export type AppDoc = HydratedDocument<App>;

const App = mongoose.model("App", appSchema);

export default App;
