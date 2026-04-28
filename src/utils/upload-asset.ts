import config from "@/config/config.js";
import ApiError from "@/utils/api-error.js";
import r2 from "@/config/r2-client.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import Busboy from "busboy";
import type { Request } from "express";
import type { ZodType } from "zod";
import httpStatus from "http-status";
import { validateService } from "@/middlewares/validate.js";

type AssetUploadResult = {
  file: { url: string; key: string };
  fields: any;
};

type UploadValidation = {
  fields?: ZodType; // validates parsed fields
  file?: ZodType; // validates file metadata
  requireFile?: boolean;
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
}) {
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
): Promise<AssetUploadResult> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });

    const fields: Record<string, any> = {};
    let fileSeen = false;

    let fileBuffer: Buffer[] = [];
    let fileMime: string | undefined;
    let fileSize = 0;
    let fileName: string | undefined;

    busboy.on("field", (name, value) => {
      if (name === "data") {
        try {
          Object.assign(fields, JSON.parse(value));
        } catch (error: any) {
          reject(new ApiError(httpStatus.BAD_REQUEST, error.message));
        }
      } else {
        fields[name] = value;
      }
    });

    busboy.on("file", (name, file, info) => {
      if (name === "data") {
        let dataBuffer = "";
        file.on("data", (chunk: Buffer) => {
          dataBuffer += chunk.toString();
        });
        file.on("end", () => {
          try {
            if (dataBuffer) {
              Object.assign(fields, JSON.parse(dataBuffer));
            }
          } catch (error: any) {
            reject(
              new ApiError(
                httpStatus.BAD_REQUEST,
                "Invalid JSON in data file part: " + error.message,
              ),
            );
          }
        });
        return;
      }

      if (fileSeen) {
        reject(
          new ApiError(httpStatus.BAD_REQUEST, "Only one file upload allowed"),
        );
        file.resume();
        return;
      }

      fileSeen = true;
      fileMime = info.mimeType;
      fileName = info.filename;

      file.on("data", (chunk: Buffer) => {
        fileSize += chunk.length;
        fileBuffer.push(chunk);
      });

      file.on("end", () => {
        // No additional action needed for the primary file
      });
    });

    busboy.on("error", reject);

    busboy.on("finish", async () => {
      try {
        /** ---------- FIELD VALIDATION ---------- */
        if (validation?.fields) {
          validateService(validation.fields, fields);
          await validation?.callback?.(fields);
        }

        /** ---------- FILE PRESENCE ---------- */
        if (validation?.requireFile && !fileSeen) {
          throw new ApiError(httpStatus.BAD_REQUEST, "File is required");
        }

        if (!fileSeen) {
          return resolve({
            file: { url: "", key: "" },
            fields,
          });
        }

        const buffer = Buffer.concat(fileBuffer);

        /** ---------- FILE VALIDATION ---------- */
        if (validation?.file) {
          validateService(validation.file, {
            mimeType: fileMime,
            size: fileSize,
            filename: fileName,
          });
          // validation.file.parse({
          //   mimeType: fileMime,
          //   size: fileSize,
          //   filename: fileName,
          // });
        }

        /** ---------- UPLOAD ---------- */
        const file = await uploadToR2({
          key,
          buffer,
          contentType: fileMime!,
        });

        resolve({ file, fields });
      } catch (err) {
        console.log(err);
        reject(err);
      }
    });

    req.pipe(busboy);
  });
}
