import express, { Router } from "express";

const router: Router = express.Router();

router.get("/", function (req, res) {
  res.send("Everything's okie dokie");
});

export default router;
