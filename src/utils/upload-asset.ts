import config from "@/config/config.js";
import ApiError from "@/utils/api-error.js";
import r2 from "@/config/r2-client.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import Busboy from "busboy";
import type { Request } from "express";
import type { ZodType } from "zod";
import httpStatus from "http-status";
import { validateService } from "@/middlewares/validate.js";

type UploadedFile = {
  buffer: Buffer;
  mimeType?: string;
  filename?: string;
  size: number;
};

type FileResult = {
  url: string;
  key: string;
};

export type AssetUploadResult = {
  file: FileResult | null;
  files: FileResult[];
  fields: any;
};

type UploadValidation = {
  fields?: ZodType;
  file?: ZodType;
  requireFile?: boolean;

  /** NEW */
  maxFiles?: number;
  maxFileSize?: number; // bytes

  callback?: (fields: any) => Promise<void>;
};

async function uploadToR2({
  key,
  buffer,
  contentType,
}: {
  key: string;
  buffer: Buffer;
  contentType?: string;
}): Promise<FileResult> {
  await r2.send(
    new PutObjectCommand({
      Bucket: config.r2.bucket!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ContentLength: buffer.length,
    }),
  );

  return {
    key,
    url: `${config.r2.publicUrl}/${key}`,
  };
}

export function handleAssetUpload(
  req: Request,
  key: string,
  validation?: UploadValidation,
  extension?: string,
): Promise<AssetUploadResult> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });

    const fields: Record<string, any> = {};
    const files: UploadedFile[] = [];

    /** ---------------- FIELD PARSING ---------------- */
    busboy.on("field", (name, value) => {
      if (name === "data") {
        try {
          Object.assign(fields, JSON.parse(value));
        } catch (err: any) {
          reject(
            new ApiError(httpStatus.BAD_REQUEST, "Invalid JSON in data field"),
          );
        }
      } else {
        fields[name] = value;
      }
    });

    /** ---------------- FILE PARSING ---------------- */
    busboy.on("file", (name, file, info) => {
      if (name !== "files") {
        file.resume();
        return;
      }

      const maxFiles = validation?.maxFiles ?? 1;
      const maxFileSize = validation?.maxFileSize ?? 10485760; // 10MB

      if (files.length >= maxFiles) {
        file.resume();
        reject(
          new ApiError(
            httpStatus.BAD_REQUEST,
            `Max ${maxFiles} file(s) allowed`,
          ),
        );
        return;
      }

      const chunks: Buffer[] = [];
      let size = 0;

      file.on("data", (chunk: Buffer) => {
        size += chunk.length;

        /** ---------------- SIZE VALIDATION ---------------- */
        if (size > maxFileSize) {
          file.resume();
          reject(
            new ApiError(
              httpStatus.BAD_REQUEST,
              `File exceeds max size of ${maxFileSize} bytes`,
            ),
          );
          return;
        }

        chunks.push(chunk);
      });

      file.on("end", () => {
        files.push({
          buffer: Buffer.concat(chunks),
          size,
          mimeType: info.mimeType,
          filename: info.filename,
        });
      });
    });

    busboy.on("error", reject);

    busboy.on("finish", async () => {
      try {
        /** FIELD VALIDATION */
        if (validation?.fields) {
          validateService(validation.fields, fields);
          await validation?.callback?.(fields);
        }

        /** REQUIRE FILE */
        if (validation?.requireFile && files.length === 0) {
          throw new ApiError(httpStatus.BAD_REQUEST, "File is required");
        }

        /** EMPTY CASE */
        if (files.length === 0) {
          return resolve({
            file: null,
            files: [],
            fields,
          });
        }

        /** FILE SCHEMA VALIDATION */
        if (validation?.file) {
          files.forEach((f) => {
            validateService(validation.file!, {
              mimeType: f.mimeType,
              size: f.size,
              filename: f.filename,
            });
          });
        }

        /** UPLOAD */
        const uploadedFiles = await Promise.all(
          files.map((f, idx) =>
            uploadToR2({
              key: `${key}-${idx}${extension ?? ""}`,
              buffer: f.buffer!,
              contentType: f.mimeType!,
            }),
          ),
        );

        resolve({
          file: uploadedFiles[0] ?? null,
          files: uploadedFiles,
          fields,
        });
      } catch (err) {
        reject(err);
      }
    });

    req.pipe(busboy);
  });
}
