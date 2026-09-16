import express, { Router } from "express";

const router: Router = express.Router();

router.get("/", function (req, res) {
  res.send("Everything's okie dokie");
});

// Shows the IP rate limiting sees for the caller. After deploying, call it from two
// different networks: if both show the same (proxy) address, adjust TRUST_PROXY.
router.get("/ip", function (req, res) {
  res.json({ ip: req.clientIp ?? req.ip });
});

export default router;
