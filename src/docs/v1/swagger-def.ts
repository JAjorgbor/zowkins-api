import config from "@/config/config.js";
import swaggerJsdoc from "swagger-jsdoc";
import pkg from "../../../package.json" with { type: "json" };

// Then use glob manually to filter
import { globSync } from "glob";
import path from "path";

const { version } = pkg;

const apis = [
  path.resolve("src/routes/**/*.ts"),
  path.resolve("src/docs/v1/*.doc.yml"),
];

const excludedFiles = [
  path.resolve("src/docs/v1/admin.referral-partner.doc.yml"),
  path.resolve("src/docs/v1/portal.referral-partner.doc.yml"),
  path.resolve("src/docs/v1/admin.bank.doc.yml"),
  path.resolve("src/docs/v1/portal.bank.doc.yml"),
];

const filteredApis = globSync("src/docs/v1/*.doc.yml")
  .filter((f) => !excludedFiles.includes(path.resolve(f)))
  .map((f) => path.resolve(f));

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Zowkins API Documentation",
      version: version,
      // description: 'Zowkins API Documentation',
      contact: {
        name: "Joshua Ajorgbor",
        url: "https://jajorgbor.vercel.app",
        email: "joshuaajorgbor@gmail.com",
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}/v1`,
        description: "Local server",
      },
      {
        url: `${config.baseUrl}/v1`,
        description: "Sandbox server",
      },
    ],
  },
  apis: [...filteredApis],
};

// Routes to exclude from Swagger docs
const excludePaths = ["/admin/referral-partners"];

export const createSwaggerSpec = () => {
  const spec: any = swaggerJsdoc(options);

  return spec;
};
