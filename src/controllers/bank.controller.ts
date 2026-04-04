import bankService from "@/services/bank.service.js";
import catchAsync from "@/utils/catch-async.js";
import type { Request, Response } from "express";

const getBankList = catchAsync(async (req: Request, res: Response) => {
  const banks = await bankService.getBanks();
  res.status(200).json({ banks });
});

const validateBankAccount = catchAsync(async (req: Request, res: Response) => {
  const { accountNumber, bankCode } = req.query;
  const bankAccount = await bankService.validateBankAccount(
    accountNumber as string,
    bankCode as string,
  );
  res.status(200).json({ bankAccount });
});

export default {
  getBankList,
  validateBankAccount,
};
