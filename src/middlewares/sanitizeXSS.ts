import createDOMPurify from "dompurify";
import type { NextFunction, Request, Response } from "express";
import { JSDOM } from "jsdom";

const window = new JSDOM("").window;
const purify = createDOMPurify(window);

export default function () {
  return function (req: Request, res: Response, next: NextFunction) {
    if (req.body)
      req.body = JSON.parse(purify.sanitize(JSON.stringify(req.body)));
    if (req.query)
      req.query = JSON.parse(purify.sanitize(JSON.stringify(req.query)));
    if (req.params)
      req.params = JSON.parse(purify.sanitize(JSON.stringify(req.params)));
    next();
  };
}
